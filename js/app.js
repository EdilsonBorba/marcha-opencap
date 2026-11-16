import { abrirZip, abrirArquivosDePasta, lerItensArrastados, carregarTrial, urlVideo, caminhoModelo } from './io.js';
import { lerModelo, cinematica, valoresDoMot, centroMassa } from './model.js';
import { criarVisor3D } from './viewer3d.js';
import { detectarEventos, analisar, trechoEstavel, ANGULOS, VARS, PREDEF, unidade } from './gait.js';
import { gerarPDF, gerarExcel } from './report.js';
import { tracosCurva, tracosComparacao, setasEixo, PALETA, linhasComparacao } from './charts.js';
import { criarTimeline } from './timeline.js';
import { desenharEsqueleto } from './skeleton.js';
import * as api from './api.js';
import { CREDITOS } from './creditos.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = (v, d = 1) => (v == null || !isFinite(v)) ? '–' : (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

const estado = { sessoes: [], analises: new Map(), atual: null, frame: 0, videoURL: null, tocando: false };
window.__estado = estado;

// ---------------- preferências de visualização ----------------
const VIS_PADRAO = { curvas: PREDEF.marcha.curvas, vars: VARS.map(v => v[0]), pontos: true, setas: true, dp: true };
let vis = carregarVis();
function carregarVis() { try { return { ...VIS_PADRAO, ...JSON.parse(localStorage.getItem('marcha-opencap:vis') || '{}') }; } catch { return { ...VIS_PADRAO }; } }
function salvarVis() { try { localStorage.setItem('marcha-opencap:vis', JSON.stringify(vis)); } catch {} }

function montarPainelVis() {
  $('#vis-curvas').innerHTML = ANGULOS.map(([c, t]) => `<label class="radio"><input type="checkbox" data-vc="${c}" ${vis.curvas.includes(c) ? 'checked' : ''}> ${t}</label>`).join('');
  $('#vis-vars').innerHTML = VARS.map(([k, t]) => `<label class="radio"><input type="checkbox" data-vv="${k}" ${vis.vars.includes(k) ? 'checked' : ''}> ${t}</label>`).join('');
  $$('[data-vc]').forEach(c => c.onchange = () => { vis.curvas = $$('[data-vc]').filter(x => x.checked).map(x => x.dataset.vc); salvarVis(); redesenharResultados(); });
  $$('[data-vv]').forEach(c => c.onchange = () => { vis.vars = $$('[data-vv]').filter(x => x.checked).map(x => x.dataset.vv); salvarVis(); redesenharResultados(); });
  $('#vis-pontos').checked = vis.pontos; $('#vis-setas').checked = vis.setas; $('#vis-dp').checked = vis.dp;
}
$$('[data-pre]').forEach(b => b.onclick = () => { vis.curvas = [...PREDEF[b.dataset.pre].curvas]; salvarVis(); montarPainelVis(); redesenharResultados(); });
for (const k of ['pontos', 'setas', 'dp']) $('#vis-' + k).onchange = (e) => { vis[k] = e.target.checked; salvarVis(); redesenharResultados(); };
montarPainelVis();
{
  const C = CREDITOS, l = [];
  l.push(`Desenvolvido por <b>${C.autor}</b>`);
  if (C.doi) l.push(`DOI <a href="https://doi.org/${C.doi}" target="_blank" rel="noopener">${C.doi}</a>`);
  l.push(`<a href="${C.repositorio}" target="_blank" rel="noopener">repositório</a>`);
  if (C.lattes) l.push(`<a href="${C.lattes}" target="_blank" rel="noopener">Lattes</a>`);
  if (C.orcid) l.push(`<a href="${C.orcid}" target="_blank" rel="noopener">ORCID</a>`);
  if (C.email) l.push(`<a href="mailto:${C.email}">${C.email}</a>`);
  $('#creditos').innerHTML = l.join(' · ');
}

// ---------------- 1. carregar ----------------
const drop = $('#drop');
$('#btn-zip').onclick = () => $('#in-zip').click();
$('#btn-pasta').onclick = () => $('#in-pasta').click();
$('#in-zip').onchange = async (e) => { for (const f of e.target.files) await adicionar(() => abrirZip(f), f.name); e.target.value = ''; };
$('#in-pasta').onchange = async (e) => { const fs = [...e.target.files]; if (fs.length) await adicionar(() => abrirArquivosDePasta(fs)); e.target.value = ''; };
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('sobre'); };
drop.ondragleave = () => drop.classList.remove('sobre');
drop.ondrop = async (e) => {
  e.preventDefault(); drop.classList.remove('sobre');
  status('#carregar-status', 'Lendo…');
  try { const ss = await lerItensArrastados(e.dataTransfer); for (const s of ss) registrar(s); if (!ss.length) status('#carregar-status', 'Arraste um arquivo .zip ou uma pasta do OpenCap.', true); }
  catch (err) { status('#carregar-status', err.message, true); }
};
async function adicionar(fn, nome) {
  status('#carregar-status', `Lendo ${nome || 'pasta'}…`);
  try { registrar(await fn()); } catch (err) { console.error(err); status('#carregar-status', 'Não consegui ler: ' + err.message, true); }
}
export function registrar(s) {
  estado.sessoes.push(s);
  status('#carregar-status', `${estado.sessoes.length} sessão(ões) carregada(s).`);
  const li = document.createElement('li'); const m = s.meta;
  li.innerHTML = `<b>${esc(s.nome)}</b> <span class="dica">${s.trials.length} trials · ${s.cams.length} câmera(s)${m.altura ? ` · ${fmt(m.altura, 2)} m` : ''}${m.massa ? ` · ${fmt(m.massa, 0)} kg` : ''}</span>`;
  $('#lista-sessoes').appendChild(li);
  montarSelTrial();
  $('#s-trial').hidden = false;
  if (!estado.atual) selecionar(chave(s, s.trials.find(t => s.files.has(`MarkerData/${t}.trc`)) || s.trials[0]));
}
window.__registrarSessao = registrar;

const chave = (s, t) => `${s.id}|${t}`;
function montarSelTrial() {
  const sel = $('#sel-trial'); const at = sel.value;
  sel.innerHTML = estado.sessoes.map(s => `<optgroup label="${esc(s.nome)}">${s.trials.map(t => `<option value="${chave(s, t)}">${esc(t)}${estado.analises.get(chave(s, t))?.res ? ' ✓' : ''}</option>`).join('')}</optgroup>`).join('');
  if (at) sel.value = at;
}
$('#sel-trial').onchange = (e) => selecionar(e.target.value);

// ---------------- 1b. conta do OpenCap (API) ----------------
const diag = (o) => { const el = $('#api-diag'); el.textContent += (typeof o === 'string' ? o : JSON.stringify(o, null, 1)) + '\n'; };
let sessoesAPI = [];
$('#form-login').onsubmit = async (e) => {
  e.preventDefault();
  status('#api-status', 'Entrando…');
  try {
    const r = await api.entrar($('#api-user').value.trim(), $('#api-senha').value);
    $('#api-senha').value = '';
    if (!r.ok) { status('#api-status', 'O OpenCap não aceitou o login. Veja o diagnóstico.', true); diag({ login: r.status, resposta: r.resposta }); return; }
    diag({ login: 'ok', campos: Object.keys(r.resposta) });
    await listarAPI();
  } catch (err) { status('#api-status', 'Falha de conexão com o OpenCap: ' + err.message, true); diag('login: ' + err.message); }
};
$('#api-sair').onclick = () => { api.sair(); $('#api-logado').hidden = true; $('#form-login').hidden = false; status('#api-status', 'Você saiu da conta.'); };
async function listarAPI() {
  status('#api-status', 'Buscando suas sessões…');
  try {
    sessoesAPI = await api.listarSessoes();
    diag({ sessoes: sessoesAPI.length, exemploCampos: sessoesAPI[0] ? Object.keys(sessoesAPI[0]) : [] });
    $('#form-login').hidden = true; $('#api-logado').hidden = false;
    $('#api-quem').textContent = `${sessoesAPI.length} sessões na conta`;
    $('#api-sessoes').innerHTML = '<option value="">escolha…</option>' + sessoesAPI.map(s => `<option value="${s.id}">${esc(s.name || 'sem nome')} · ${String(s.created_at || '').slice(0, 10).split('-').reverse().join('/')}</option>`).join('');
    status('#api-status', 'Escolha a sessão.');
  } catch (err) { status('#api-status', 'Não consegui listar as sessões: ' + err.message, true); diag({ sessoes: err.status, corpo: err.corpo }); if (err.status === 401) api.sair(); }
}
$('#api-sessoes').onchange = async (e) => {
  $('#api-trials').innerHTML = ''; if (!e.target.value) return;
  status('#api-status', 'Lendo a sessão…');
  try {
    const s = await api.sessao(e.target.value);
    const ts = api.trialsDeMovimento(s);
    $('#api-trials').innerHTML = ts.map(t => `<label class="radio"><input type="checkbox" data-t="${t.id}" checked> ${esc(t.name)}</label>`).join('') || '<span class="dica">Sem trials processados.</span>';
    $('#api-trials').dataset.sessao = JSON.stringify({ id: s.id, name: s.name, trials: s.trials, meta: s.meta ? { neutral_trial: s.meta.neutral_trial } : null });
    status('#api-status', `${ts.length} trials. Marque os que quer analisar.`);
  } catch (err) { status('#api-status', 'Não consegui ler a sessão: ' + err.message, true); diag({ sessao: err.status, corpo: err.corpo }); }
};
$('#api-carregar').onclick = async () => {
  const s = JSON.parse($('#api-trials').dataset.sessao || 'null'); if (!s) return;
  const ids = new Set($$('#api-trials input:checked').map(c => c.dataset.t));
  const escolhidos = (s.trials || []).filter(t => ids.has(t.id));
  if (!escolhidos.length) { status('#api-status', 'Marque pelo menos um trial.', true); return; }
  try {
    const sessaoObj = await api.montarSessaoAPI(s, escolhidos, (m) => status('#api-status', m));
    diag({ arquivos: sessaoObj.files.size, cameras: sessaoObj.cams, trials: sessaoObj.diag });
    if (!sessaoObj.trials.length) { status('#api-status', 'O OpenCap não devolveu os arquivos de cinemática destes trials. Veja o diagnóstico.', true); return; }
    // teste rápido: o navegador consegue baixar os arquivos?
    try { await sessaoObj.files.get(`MarkerData/${sessaoObj.trials[0]}.trc`).text(); diag('download do .trc: ok'); }
    catch (err) { diag('download do .trc falhou: ' + err.message); status('#api-status', 'O navegador não conseguiu baixar os arquivos do OpenCap (bloqueio do servidor de arquivos). Veja o diagnóstico.', true); return; }
    registrar(sessaoObj);
    status('#api-status', `Carregado: ${sessaoObj.trials.length} trials${sessaoObj.cams.length ? '' : ' (sem vídeo sincronizado pela API; use o esqueleto)'}.`);
  } catch (err) { console.error(err); status('#api-status', 'Erro ao carregar: ' + err.message, true); diag({ carregar: err.message, corpo: err.corpo }); }
};
$$('[data-todos]').forEach(b => b.onclick = () => $$('#' + b.dataset.todos + ' input[type=checkbox]').forEach(c => c.checked = b.dataset.v === '1'));
if (api.token()) { $('#bloco-api').open = true; listarAPI(); }

// ---------------- 2. trial ----------------
async function selecionar(k) {
  $('#sel-trial').value = k; pausar();
  estado.atual = k;
  let A = estado.analises.get(k);
  if (!A) {
    status('#trial-info', 'Carregando trial…');
    try { A = await prepararAnalise(k); }
    catch (err) { console.error(err); status('#trial-info', err.message, true); return; }
  }
  A.auto = false;
  preencherForm(A);
  await mostrarRevisao(A);
  recalcular();
}

// modelo do OpenSim da sessão (um por sessão) e trajetória do centro de massa
function obterModelo(sessao) {
  if (!sessao._modelo) sessao._modelo = (async () => {
    const p = caminhoModelo(sessao); if (!p) return null;
    try { return lerModelo(await sessao.files.get(p).text()); } catch (e) { console.warn('modelo', e); return null; }
  })();
  return sessao._modelo;
}
function trajetoriaCM(mod, mot) {
  const n = mot.time.length, x = new Float64Array(n), y = new Float64Array(n), z = new Float64Array(n);
  for (let i = 0; i < n; i++) { const c = centroMassa(mod, cinematica(mod, valoresDoMot(mod, mot, i))) || [NaN, NaN, NaN]; x[i] = c[0]; y[i] = c[1]; z[i] = c[2]; }
  return { x, y, z };
}

async function prepararAnalise(k) {
  let A = estado.analises.get(k);
  if (A) return A;
  const [sid, nome] = k.split('|');
  const sessao = estado.sessoes.find(s => s.id === sid);
  const trial = await carregarTrial(sessao, nome);
  if (!trial.trc) throw new Error('Este trial não tem MarkerData/' + nome + '.trc.');
  const mod = await obterModelo(sessao);
  if (mod) trial.com = trajetoriaCM(mod, trial.mot);
  const ant = [...estado.analises.values()].pop();  // herda local e inclinação do trial anterior
  A = { k, sessao, trial, rotulo: nome,
    cfg: { ambiente: ant?.cfg.ambiente || 'esteira', velEsteira: null, incl: ant?.cfg.incl ?? null, inclUn: ant?.cfg.inclUn || 'pct', atividade: '', metodo: '', janela: null, excluidos: null } };
  estado.analises.set(k, A);
  detectar(A);
  return A;
}
function calcularRes(A) {
  const ativ = A.cfg.atividade || A.det.atividade;
  A.res = analisar(A.trial, A.eventos, { ...A.cfg, atividade: ativ });
  A.res.atividade = ativ; A.res.metodo = A.det.metodo;
  if (!A.cfg.excluidos) A.cfg.excluidos = new Set(A.res.passadas.filter(p => p.excluida).map(p => p.id));
}

const inclPct = (c) => c.incl == null ? null : c.inclUn === 'grau' ? Math.tan(c.incl * Math.PI / 180) * 100 : c.incl;
function detectar(A) {
  const d = detectarEventos(A.trial.trc, A.trial.mot, A.cfg.ambiente, A.cfg.atividade || undefined, A.cfg.metodo || undefined, A.cfg.ambiente === 'esteira' ? inclPct(A.cfg) : null);
  A.det = d; A.eventos = structuredClone(d.eventos); A.cfg.excluidos = null;
  A.cfg.janela = trechoEstavel(d.eventos, A.trial.mot.time);
  A.janelaAuto = !!A.cfg.janela;
}

function preencherForm(A) {
  const c = A.cfg;
  $('#in-rotulo').value = A.rotulo;
  $$('input[name=amb]').forEach(r => r.checked = r.value === c.ambiente);
  $('#in-vel').value = c.velEsteira ?? '';
  $('#in-incl').value = c.incl ?? '';
  $('#sel-incl-un').value = c.inclUn;
  $$('.so-esteira').forEach(e => e.style.display = c.ambiente === 'esteira' ? '' : 'none');
  $('#sel-ativ').value = c.atividade;
  $('#sel-metodo').value = c.metodo;
  infoTrial(A);
}
function infoTrial(A) {
  const t = A.trial.mot.time, d = A.det, j = A.cfg.janela;
  const incl = A.cfg.ambiente !== 'esteira' ? '' : d.inclInformada
    ? `<br>Inclinação informada: ${fmt(Math.atan(inclPct(A.cfg) / 100) * 180 / Math.PI, 1)}° = ${fmt(inclPct(A.cfg), 1)}%`
    : `<br>Inclinação estimada: ${fmt(d.inclinacao, 1)}° = ${fmt(Math.tan(d.inclinacao * Math.PI / 180) * 100, 1)}% <span class="dica">· estimativa pelos pés apoiados, erro de cerca de ±2°; se souber, informe acima</span>`;
  $('#trial-info').classList.remove('erro');
  $('#trial-info').innerHTML = `Duração ${fmt(t[t.length - 1], 1)} s · ${fmt(1 / (t[1] - t[0]), 0)} quadros/s · atividade: <b>${A.cfg.atividade || d.atividade}</b> · método: ${d.metodo}` + incl +
    (j ? `<br>Trecho analisado: <b>${fmt(t[j[0]], 1)} a ${fmt(t[j[1]], 1)} s</b>${A.janelaAuto ? ' (trecho estável detectado automaticamente)' : ''}` : '<br>Trecho analisado: trial inteiro');
  const al = $('#alerta-qualidade');
  if (d.qualidade < 0.6) {
    al.hidden = false;
    al.innerHTML = `<b>Atenção:</b> o movimento dos pés neste trial é pouco regular (índice ${fmt(d.qualidade, 2)}; bom ≥ 0,6). Provável falha de rastreamento do OpenCap. Confira no vídeo e no esqueleto antes de usar os números.`;
  } else al.hidden = true;
}

const atual = () => estado.analises.get(estado.atual);
const num = (v) => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };
function redetectar() { const A = atual(); if (!A) return; detectar(A); preencherForm(A); tl.set(A); tl.redesenhar(); desenharSinal(); recalcular(); }
$('#in-rotulo').oninput = (e) => { const A = atual(); if (A) { A.rotulo = e.target.value; montarComparar(); } };
$$('input[name=amb]').forEach(r => r.onchange = () => { const A = atual(); if (!A) return; A.cfg.ambiente = r.value; redetectar(); });
$('#in-vel').oninput = (e) => { const A = atual(); if (!A) return; A.cfg.velEsteira = num(e.target.value); recalcular(); };
$('#in-incl').onchange = (e) => { const A = atual(); if (!A) return; A.cfg.incl = num(e.target.value); redetectar(); };
$('#sel-incl-un').onchange = (e) => { const A = atual(); if (!A) return; A.cfg.inclUn = e.target.value; if (A.cfg.incl != null) redetectar(); };
$('#sel-ativ').onchange = (e) => { const A = atual(); if (!A) return; A.cfg.atividade = e.target.value; redetectar(); };
$('#sel-metodo').onchange = (e) => { const A = atual(); if (!A) return; A.cfg.metodo = e.target.value; redetectar(); };

// ---------------- 3. revisão ----------------
const video = $('#video'), canvas = $('#esqueleto');
const visor = criarVisor3D($('#visor3d'));
$('#visor3d').addEventListener('vista', (e) => { $('#sel-vista').value = e.detail; });
let modo3d = false;
const tl = criarTimeline($('#timeline'), {
  onSeek: (f) => { pausar(); irPara(f); },
  onChange: () => { const A = atual(); A.cfg.excluidos = null; desenharSinal(); recalcular(); },
  onJanela: () => { const A = atual(); A.janelaAuto = false; A.cfg.excluidos = null; infoTrial(A); recalcular(); },
});

async function mostrarRevisao(A) {
  $('#s-revisao').hidden = false;
  const cams = Object.keys(A.trial.videos);
  $('#sel-cam').innerHTML = cams.length ? cams.map(c => `<option>${c}</option>`).join('') : '<option value="">sem vídeo</option>';
  estado.frame = Math.min(estado.frame, A.trial.mot.time.length - 1);
  if (A.cfg.janela && (estado.frame < A.cfg.janela[0] || estado.frame > A.cfg.janela[1])) estado.frame = A.cfg.janela[0];
  aplicarVisao();
  await trocarVideo();
  tl.set(A); desenharSinal(); irPara(estado.frame);
  prepararVisor3D(A);
}
async function prepararVisor3D(A) {
  const mod = await obterModelo(A.sessao);
  modo3d = !!mod && $('#sel-tipo-esq').value === '3d';
  $('#tela-esq').classList.toggle('modo3d', modo3d);
  $('#sel-tipo-esq').disabled = !mod;
  if (!mod) { $('#sel-tipo-esq').value = 'linhas'; $('#esq-status').textContent = 'Sem modelo do OpenSim nesta sessão: mostrando linhas.'; desenharEsq(); return; }
  if (!modo3d) { desenharEsq(); return; }
  $('#esq-status').textContent = 'Carregando o esqueleto…';
  try { await visor.carregar(mod, A.sessao, A.trial.mot, A.det.dir); $('#esq-status').textContent = 'Arraste para girar · roda = zoom'; visor.setVista($('#sel-vista').value); }
  catch (e) { console.error(e); $('#esq-status').textContent = 'Não consegui montar o esqueleto 3D.'; }
  desenharEsq();
}
$('#sel-tipo-esq').onchange = () => { const A = atual(); if (A) prepararVisor3D(A); };
$('#chk-cm').onchange = (e) => { visor.setCM(e.target.checked); desenharEsq(); };
$('#sel-cam').onchange = trocarVideo;
$('#sel-visao').onchange = () => { aplicarVisao(); desenharEsq(); };
$('#sel-vista').onchange = () => { if (modo3d) visor.setVista($('#sel-vista').value); desenharEsq(); };
function aplicarVisao() {
  const v = $('#sel-visao').value;
  $('#tela-video').hidden = v === 'esqueleto';
  $('#tela-esq').hidden = v === 'video';
  $('.telas').classList.toggle('um', v !== 'ambos');
}
async function trocarVideo() {
  const A = atual(); const cam = $('#sel-cam').value;
  if (estado.videoURL) URL.revokeObjectURL(estado.videoURL);
  estado.videoURL = null; video.removeAttribute('src'); video.load();
  if (!cam) {
    $('#video-status').textContent = 'Este trial não tem vídeo sincronizado; use o esqueleto.';
    if ($('#sel-visao').value !== 'esqueleto') { $('#sel-visao').value = 'esqueleto'; aplicarVisao(); }
    return;
  }
  $('#video-status').textContent = 'carregando vídeo…';
  try {
    estado.videoURL = await urlVideo(A.sessao, A.trial.videos[cam]); video.src = estado.videoURL;
    video.playbackRate = +$('#sel-rate').value;
    $('#video-status').textContent = ''; video.currentTime = A.trial.mot.time[estado.frame] || 0;
  } catch (err) { console.error(err); $('#video-status').textContent = 'Não consegui abrir o vídeo.'; }
}

function irPara(i) {
  const A = atual(); if (!A) return;
  const t = A.trial.mot.time;
  i = Math.max(0, Math.min(t.length - 1, Math.round(i)));
  estado.frame = i;
  $('#tempo').textContent = `${fmt(t[i], 2)} s · quadro ${i}`;
  if (!estado.tocando && video.src && Math.abs(video.currentTime - t[i]) > 0.004) video.currentTime = t[i];
  tl.setFrame(i);
  desenharEsq();
}
function emApoio(A, i) {
  const r = {};
  for (const l of ['D', 'E']) {
    const ci = A.eventos['CI_' + l], rd = A.eventos['RD_' + l];
    const ult = [...ci].reverse().find(x => x <= i);
    r[l] = ult != null && !rd.some(x => x > ult && x <= i);
  }
  return r;
}
function desenharEsq() {
  const A = atual(); if (!A || $('#tela-esq').hidden) return;
  if (modo3d) { visor.quadro(estado.frame, emApoio(A, estado.frame)); return; }
  const v = { lateralE: 'lateral', posterior: 'frontal', livre: 'lateral' }[$('#sel-vista').value] || $('#sel-vista').value;
  desenharEsqueleto(canvas, A.trial.trc, estado.frame, v, A.det.dir, emApoio(A, estado.frame), { d: css('--d'), e: css('--e'), fg: css('--fg'), linha: css('--line') });
}
new ResizeObserver(() => desenharEsq()).observe(canvas);

// reprodução (com ou sem vídeo), em câmera lenta e com repetição do trecho visível
$('#sel-rate').onchange = (e) => { video.playbackRate = +e.target.value; };
$('#btn-play').onclick = () => estado.tocando ? pausar() : tocar();
let raf = null, acum = 0, ultimoT = 0;
function tocar() {
  const A = atual(); if (!A) return;
  const t = A.trial.mot.time, dt = t[1] - t[0];
  estado.tocando = true; $('#btn-play').textContent = '❚❚';
  const [v0, v1] = tl.visivel();
  if ($('#chk-loop').checked && (estado.frame < v0 || estado.frame >= v1)) { estado.frame = v0; if (video.src) video.currentTime = t[v0]; }
  if (video.src) { video.playbackRate = +$('#sel-rate').value; video.currentTime = t[estado.frame]; video.play().catch(() => {}); }
  acum = estado.frame; ultimoT = performance.now();
  const passo = (agora) => {
    if (!estado.tocando) return;
    let f;
    if (video.src) f = Math.round(video.currentTime / dt);
    else { acum += ((agora - ultimoT) / 1000) * (+$('#sel-rate').value) / dt; ultimoT = agora; f = Math.floor(acum); }
    const [a, b] = tl.visivel();
    if ($('#chk-loop').checked && f >= b) { f = a; acum = a; if (video.src) video.currentTime = t[a]; }
    if (f >= t.length - 1) { estado.frame = t.length - 1; pausar(); return; }
    if (f !== estado.frame) {
      estado.frame = f;
      $('#tempo').textContent = `${fmt(t[f], 2)} s · quadro ${f}`;
      tl.setFrame(f); desenharEsq();
    }
    raf = requestAnimationFrame(passo);
  };
  raf = requestAnimationFrame(passo);
}
function pausar() {
  if (!estado.tocando) return;
  estado.tocando = false; $('#btn-play').textContent = '▶︎';
  cancelAnimationFrame(raf); video.pause();
  irPara(estado.frame);
}
$$('[data-step]').forEach(b => b.onclick = () => { pausar(); tl.limparSel(); irPara(estado.frame + +b.dataset.step); });

function marcar(k) {
  const A = atual(); if (!A) return; pausar();
  const f = estado.frame;
  if (!A.eventos[k].includes(f)) { A.eventos[k].push(f); A.eventos[k].sort((a, c) => a - c); }
  tl.selecionar(k, f); A.cfg.excluidos = null; desenharSinal(); recalcular();
}
$$('[data-ev]').forEach(b => b.onclick = () => marcar(b.dataset.ev));
$('#btn-remover').onclick = () => { if (!tl.apagarSel()) $('#video-status').textContent = 'Clique num evento na linha do tempo para selecioná-lo.'; };
let limparTimer = null;
$('#btn-limpar').onclick = () => {
  const A = atual(); if (!A) return; const b = $('#btn-limpar');
  if (!b.classList.contains('confirma')) { b.classList.add('confirma'); b.textContent = 'Clique de novo para apagar todos os TD e TO'; clearTimeout(limparTimer); limparTimer = setTimeout(() => { b.classList.remove('confirma'); b.textContent = 'Limpar todas as marcações'; }, 4000); return; }
  clearTimeout(limparTimer); b.classList.remove('confirma'); b.textContent = 'Limpar todas as marcações';
  pausar(); for (const k of ['CI_D', 'RD_D', 'CI_E', 'RD_E']) A.eventos[k] = [];
  A.cfg.excluidos = null; tl.limparSel(); tl.redesenhar(); desenharSinal(); recalcular(); desenharEsq();
  $('#video-status').textContent = 'Marcações apagadas. Marque com Q/W (direito) e O/P (esquerdo), ou use “Detectar de novo”.';
};
$('#btn-tudo').onclick = () => { const A = atual(); A.cfg.janela = null; A.janelaAuto = false; A.cfg.excluidos = null; infoTrial(A); tl.redesenhar(); recalcular(); };
$('#btn-estavel').onclick = () => { const A = atual(); A.cfg.janela = trechoEstavel(A.eventos, A.trial.mot.time); A.janelaAuto = true; A.cfg.excluidos = null; infoTrial(A); tl.redesenhar(); recalcular(); };
$('#btn-redetectar').onclick = redetectar;

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || $('#s-revisao').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === 'ArrowRight' || k === 'ArrowLeft') {
    const d = (k === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 5 : 1);
    if (!tl.moverSel(d)) { pausar(); irPara(estado.frame + d); }
    e.preventDefault();
  } else if (k === '.' || k === ',') { pausar(); tl.limparSel(); irPara(estado.frame + (k === '.' ? 1 : -1)); }
  else if (k === ' ') { estado.tocando ? pausar() : tocar(); e.preventDefault(); }
  else if (k === 'Delete' || k === 'Backspace') { if (tl.apagarSel()) e.preventDefault(); }
  else if (k === 'Escape') tl.limparSel();
  else { const m = { q: 'CI_D', w: 'RD_D', o: 'CI_E', p: 'RD_E' }[k.toLowerCase()]; if (m) { marcar(m); e.preventDefault(); } }
});

function desenharSinal() {
  const A = atual(); if (!A || !$('.sinal').open) return;
  const t = Array.from(A.trial.mot.time), s = A.det.sinais, cor = { d: css('--d'), e: css('--e') };
  const tr = [
    { x: t, y: Array.from(s.calcR), name: 'Calcâneo D', line: { color: cor.d, width: 1.5 } },
    { x: t, y: Array.from(s.toeR), name: 'Dedos D', line: { color: cor.d, width: 1, dash: 'dot' } },
    { x: t, y: Array.from(s.calcL), name: 'Calcâneo E', line: { color: cor.e, width: 1.5 } },
    { x: t, y: Array.from(s.toeL), name: 'Dedos E', line: { color: cor.e, width: 1, dash: 'dot' } },
  ];
  for (const [k, nome, sig, simb, l] of [['CI_D', 'TD D', 'calcR', 'triangle-down', 'd'], ['RD_D', 'TO D', 'toeR', 'square', 'd'], ['CI_E', 'TD E', 'calcL', 'triangle-down', 'e'], ['RD_E', 'TO E', 'toeL', 'square', 'e']])
    tr.push({ x: A.eventos[k].map(i => t[i]), y: A.eventos[k].map(i => s[sig][i]), name: nome, mode: 'markers', marker: { symbol: simb, size: 8, color: cor[l] } });
  Plotly.react('plot-linha', tr, layoutBase({ margin: { l: 50, r: 10, t: 10, b: 36 }, legend: { orientation: 'h', y: 1.15, font: { size: 11 } }, xaxis: { title: 'tempo (s)' }, yaxis: { title: 'à frente do sacro (m)' } }), { displaylogo: false, responsive: true });
}
$('.sinal').addEventListener('toggle', desenharSinal);

// ---------------- 4. resultados ----------------
let recalcTimer = null;
function recalcular() { clearTimeout(recalcTimer); recalcTimer = setTimeout(recalcularJa, 80); }
function recalcularJa() {
  const A = atual(); if (!A) return;
  calcularRes(A);
  mostrarResultados(A);
  montarSelTrial(); montarComparar();
  $('#s-comparar').hidden = false; $('#s-laudo').hidden = false;
}
function redesenharResultados() { const A = atual(); if (A?.res) { mostrarResultados(A); desenharComparacao(); } }

function mostrarResultados(A) {
  const R = A.res, T = R.tab, sem = A.cfg.ambiente === 'esteira' && !A.cfg.velEsteira;
  $('#s-resultados').hidden = false;
  const ok = R.passadas.filter(p => !p.excluida);
  const nD = ok.filter(p => p.lado === 'D').length, nE = ok.filter(p => p.lado === 'E').length;
  const kpi = (rot, v, u, r = '') => `<div class="kpi"><div class="u">${rot}</div><div class="v">${v}</div><div class="r">${u}${r ? ' · ' + r : ''}</div></div>`;
  const si = (x) => x == null ? '' : `simetria ${x > 0 ? '+' : ''}${fmt(x, 1)}%`;
  $('#cards').innerHTML = (sem ? `<div class="alerta" style="grid-column:1/-1">Informe a <b>velocidade da esteira</b> (passo 2) para calcular velocidade e comprimentos.</div>` : '') + [
    sem ? '' : kpi('Velocidade', fmt(T.velocidade.geral.m, 2), 'm/s', A.cfg.ambiente === 'esteira' ? `esteira ${fmt(A.cfg.velEsteira, 1)} km/h` : ''),
    kpi('Cadência', fmt(T.cadencia.geral.m, 0), 'passos/min'),
    sem ? '' : kpi('Passada', fmt(T.passada.geral.m, 2), 'm', `CV ${fmt(T.passada.geral.cv, 1)}%`),
    R.atividade === 'corrida'
      ? kpi('Contato D / E', `${fmt(T.apoio.D.m * 1000, 0)} / ${fmt(T.apoio.E.m * 1000, 0)}`, 'ms', si(T.apoio.si))
      : kpi('Apoio D / E', `${fmt(T.apoioPct.D.m, 0)} / ${fmt(T.apoioPct.E.m, 0)}`, '% do ciclo', si(T.apoioPct.si)),
    R.atividade === 'corrida' ? kpi('Tempo de voo', fmt(T.voo?.geral.m * 1000, 0), 'ms') : kpi('Duplo apoio', fmt(T.duplaPct?.geral.m, 0), '% do ciclo'),
    kpi('Passadas usadas', `${nD} D · ${nE} E`, R.atividade, `CV tempo ${fmt(T.duracao.geral.cv, 1)}%`),
  ].join('');
  let h = '<tr><th>Variável</th><th class="d">Direito</th><th class="e">Esquerdo</th><th>Simetria</th><th>CV</th></tr>';
  for (const [k, rot, u, d] of VARS) {
    const v = T[k]; if (!v || !vis.vars.includes(k)) continue;
    if (sem && ['velocidade', 'passada', 'passo'].includes(k)) continue;
    if (k === 'velocidade' || k === 'cadencia') { h += `<tr><td>${rot} <span class="dica">${u}</span></td><td colspan="2" style="text-align:center">${fmt(v.geral.m, d)}</td><td></td><td></td></tr>`; continue; }
    const mdp = (x) => x.m == null ? '–' : `${fmt(x.m, d)}${x.dp != null ? ' <span class="dica">± ' + fmt(x.dp, d) + '</span>' : ''}`;
    const a = v.si == null ? '–' : `<span class="${Math.abs(v.si) >= 10 ? 'assim' : ''}">${v.si > 0 ? '+' : ''}${fmt(v.si, 1)}%</span>`;
    h += `<tr><td>${rot} <span class="dica">${u}</span></td><td>${mdp(v.D)}</td><td>${mdp(v.E)}</td><td>${a}</td><td>${fmt(v.geral.cv, 1)}%</td></tr>`;
  }
  $('#tab-et').innerHTML = h;
  $('#bloco-pontos').hidden = !vis.pontos;
  $('#tab-pontos').innerHTML = '<tr><th>Ponto</th><th class="d">D</th><th class="e">E</th><th>D − E</th></tr>' +
    R.pontos.filter(p => vis.curvas.includes(p.curva)).map(p => `<tr><td>${p.rotulo}</td><td>${fmt(p.D, 0)}</td><td>${fmt(p.E, 0)}</td><td>${p.D != null && p.E != null ? fmt(p.D - p.E, 0) : '–'}</td></tr>`).join('');
  desenharCurvas(A);
  $('#n-passadas').textContent = `${ok.length} de ${R.passadas.length}`;
  $('#lista-passadas').innerHTML = R.passadas.map(p => `<label class="${p.suspeita ? 'susp' : ''}" title="${p.suspeita ? 'duração fora do padrão ou sem TO' : ''}"><input type="checkbox" data-p="${p.id}" ${p.excluida ? '' : 'checked'}> ${p.lado}${p.n} · ${fmt(p.t0, 1)} s</label>`).join('');
  $$('#lista-passadas input').forEach(c => c.onchange = () => { if (c.checked) A.cfg.excluidos.delete(c.dataset.p); else A.cfg.excluidos.add(c.dataset.p); recalcularJa(); });
}

function layoutBase(extra) {
  const eixo = { gridcolor: css('--line'), zerolinecolor: css('--mut'), linecolor: css('--line') };
  return Object.assign({ paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: css('--fg'), size: 11, family: '-apple-system,system-ui,sans-serif' } }, extra,
    { xaxis: Object.assign({}, eixo, extra.xaxis), yaxis: Object.assign({}, eixo, extra.yaxis) });
}

function desenharCurvas(A) {
  const R = A.res, cont = $('#curvas'), cores = { D: css('--d'), E: css('--e') };
  const lista = ANGULOS.filter(a => vis.curvas.includes(a[0]) && R.curvas[a[0]] && Object.keys(R.curvas[a[0]]).length);
  cont.innerHTML = lista.map(([c]) => `<div class="curva" id="cv-${c}"></div>`).join('');
  for (const [c, rot] of lista) {
    const shapes = ['D', 'E'].filter(l => R.rdMedio[l] != null).map(l => ({ type: 'line', x0: R.rdMedio[l], x1: R.rdMedio[l], yref: 'paper', y0: 0, y1: 1, line: { color: cores[l], dash: 'dash', width: 1 } }));
    Plotly.newPlot('cv-' + c, tracosCurva(R.curvas, c, cores, vis.dp), layoutBase({ title: { text: rot, font: { size: 12 }, x: 0.02 }, margin: { l: vis.setas ? 74 : 44, r: 8, t: 30, b: 34 }, showlegend: false, shapes,
      annotations: vis.setas ? setasEixo(c, css('--mut'), 10, 48) : [],
      xaxis: { title: { text: '% do ciclo', font: { size: 10 } }, range: [0, 100] }, yaxis: { ticksuffix: unidade(c) === '°' ? '°' : ' cm' } }), { displayModeBar: false, responsive: true });
  }
}

// ---------------- 5. comparar ----------------
const comparados = new Set();
function montarComparar() {
  const html = estado.sessoes.map(s => {
    const itens = s.trials.filter(t => s.files.has(`MarkerData/${t}.trc`)).map(t => {
      const k = chave(s, t), A = estado.analises.get(k);
      const marca = A?.res ? (A.auto ? ' <span class="dica">(automático)</span>' : ' ✓') : '';
      return `<label class="radio"><input type="checkbox" data-c="${k}" ${comparados.has(k) ? 'checked' : ''}> ${esc(A?.rotulo || t)}${marca}</label>`;
    }).join('');
    return `<div class="comp-sessao"><div class="dica">${esc(s.nome)}</div><div class="comp-itens">${itens}</div></div>`;
  }).join('');
  $('#comp-lista').innerHTML = html;
  $$('#comp-lista input').forEach(c => c.onchange = async () => {
    const k = c.dataset.c;
    if (!c.checked) { comparados.delete(k); desenharComparacao(); return; }
    comparados.add(k);
    let A = estado.analises.get(k);
    if (!A?.res) {
      $('#comp-saida').innerHTML = '<p class="status">Analisando o trial…</p>';
      try { A = await prepararAnalise(k); A.auto = true; calcularRes(A); }
      catch (err) { comparados.delete(k); c.checked = false; $('#comp-saida').innerHTML = `<p class="status erro">${esc(err.message)}</p>`; return; }
      montarComparar(); montarSelTrial(); return;
    }
    desenharComparacao();
  });
  desenharComparacao();
}
$('#comp-nenhum').onclick = () => { comparados.clear(); montarComparar(); };
$('#comp-todos').onclick = async () => {
  const ks = estado.sessoes.flatMap(s => s.trials.filter(t => s.files.has(`MarkerData/${t}.trc`)).map(t => chave(s, t)));
  let n = 0;
  for (const k of ks) {
    comparados.add(k);
    let A = estado.analises.get(k);
    if (!A?.res) {
      $('#comp-saida').innerHTML = `<p class="status">Analisando ${++n}…</p>`;
      try { A = await prepararAnalise(k); A.auto = true; calcularRes(A); } catch (err) { comparados.delete(k); }
    }
  }
  montarComparar(); montarSelTrial();
};
function selecionadosComparacao() { return [...comparados].map(k => estado.analises.get(k)).filter(A => A?.res); }
function desenharComparacao() {
  const L = selecionadosComparacao(), out = $('#comp-saida');
  if (L.length < 2) { out.innerHTML = L.length ? '<p class="dica">Marque mais um trial para comparar.</p>' : ''; return; }
  const avisos = [];
  const auto = L.filter(A => A.auto).map(A => A.rotulo), semVel = L.filter(A => A.cfg.ambiente === 'esteira' && !A.cfg.velEsteira).map(A => A.rotulo);
  if (auto.length) avisos.push(`Analisado(s) automaticamente, sem conferência dos eventos: <b>${auto.map(esc).join(', ')}</b>. Para conferir, escolha o trial no passo 2.`);
  if (semVel.length) avisos.push(`Sem velocidade da esteira (velocidade e comprimentos ficam em branco): <b>${semVel.map(esc).join(', ')}</b>. Informe no passo 2.`);
  let h = `<table class="tab"><tr><th>Variável</th>${L.map((A, i) => `<th style="color:${PALETA[i % PALETA.length]}">${esc(A.rotulo)}</th>`).join('')}</tr>`;
  for (const r of linhasComparacao(L, vis, fmt)) h += `<tr><td>${esc(r.rotulo)}</td>${r.valores.map(v => `<td>${v}</td>`).join('')}</tr>`;
  out.innerHTML = (avisos.length ? `<div class="alerta">${avisos.join('<br>')}</div>` : '') + h + '</table><p class="dica">Curvas: linha cheia = direito, tracejada = esquerdo.</p><div class="curvas" id="comp-curvas"></div>';
  const lista = ANGULOS.filter(a => vis.curvas.includes(a[0]) && L.some(A => A.res.curvas[a[0]] && Object.keys(A.res.curvas[a[0]]).length));
  $('#comp-curvas').innerHTML = lista.map(([c]) => `<div class="curva" id="cc-${c}"></div>`).join('');
  for (const [c, rot] of lista) {
    Plotly.newPlot('cc-' + c, tracosComparacao(L, c), layoutBase({ title: { text: rot, font: { size: 12 }, x: 0.02 }, margin: { l: vis.setas ? 74 : 44, r: 8, t: 30, b: 32 }, showlegend: c === lista[0][0], legend: { orientation: 'h', y: -0.25, font: { size: 10 } },
      annotations: vis.setas ? setasEixo(c, css('--mut'), 10, 48) : [], xaxis: { range: [0, 100] }, yaxis: { ticksuffix: unidade(c) === '°' ? '°' : ' cm' } }), { displayModeBar: false, responsive: true });
  }
}

// ---------------- 6. laudo ----------------
$('#in-data').valueAsDate = new Date();
$('#btn-pdf').onclick = async () => {
  const A = atual(); if (!A?.res) return;
  status('#laudo-status', 'Gerando PDF…');
  try { await gerarPDF(A, dadosLaudo(), $('#chk-comp-laudo').checked ? selecionadosComparacao() : [], vis); status('#laudo-status', 'PDF baixado.'); }
  catch (err) { console.error(err); status('#laudo-status', 'Erro ao gerar PDF: ' + err.message, true); }
};
$('#btn-xlsx').onclick = () => {
  const A = atual(); if (!A?.res) return;
  try { gerarExcel(A, dadosLaudo(), selecionadosComparacao()); status('#laudo-status', 'Excel baixado.'); }
  catch (err) { console.error(err); status('#laudo-status', 'Erro ao gerar Excel: ' + err.message, true); }
};
function dadosLaudo() { return { paciente: $('#in-paciente').value.trim(), data: $('#in-data').value, avaliador: $('#in-avaliador').value.trim(), obs: $('#in-obs').value.trim() }; }

// ---------------- util ----------------
function status(sel, msg, erro = false) { const el = $(sel); el.textContent = msg; el.classList.toggle('erro', erro); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
