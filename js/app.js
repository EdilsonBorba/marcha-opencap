import { abrirZip, abrirArquivosDePasta, lerItensArrastados, carregarTrial, urlVideo } from './io.js';
import { detectarEventos, analisar, trechoEstavel, ANGULOS, VARS } from './gait.js';
import { gerarPDF, gerarExcel } from './report.js';
import { tracosCurva, tracosComparacao, PALETA } from './charts.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = (v, d = 1) => (v == null || !isFinite(v)) ? '–' : (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

const estado = { sessoes: [], analises: new Map(), atual: null, frame: 0, videoURL: null };
window.__estado = estado; // para depuração no console

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

function registrar(s) {
  estado.sessoes.push(s);
  status('#carregar-status', `${estado.sessoes.length} sessão(ões) carregada(s).`);
  const li = document.createElement('li');
  const m = s.meta;
  li.innerHTML = `<b>${esc(s.nome)}</b> <span class="dica">${s.trials.length} trials · ${s.cams.length} câmera(s)${m.altura ? ` · ${fmt(m.altura, 2)} m` : ''}${m.massa ? ` · ${fmt(m.massa, 0)} kg` : ''}</span>`;
  $('#lista-sessoes').appendChild(li);
  montarSelTrial();
  $('#s-trial').hidden = false;
  if (!estado.atual) selecionar(chave(s, s.trials.find(t => s.files.has(`MarkerData/${t}.trc`)) || s.trials[0]));
}

const chave = (s, t) => `${s.id}|${t}`;
function montarSelTrial() {
  const sel = $('#sel-trial'); const atual = sel.value;
  sel.innerHTML = estado.sessoes.map(s => `<optgroup label="${esc(s.nome)}">${s.trials.map(t => `<option value="${chave(s, t)}">${esc(t)}${estado.analises.get(chave(s, t))?.res ? ' ✓' : ''}</option>`).join('')}</optgroup>`).join('');
  if (atual) sel.value = atual;
}
$('#sel-trial').onchange = (e) => selecionar(e.target.value);

// ---------------- 2. trial ----------------
async function selecionar(k) {
  $('#sel-trial').value = k;
  estado.atual = k;
  let A = estado.analises.get(k);
  if (!A) {
    const [sid, nome] = k.split('|');
    const sessao = estado.sessoes.find(s => s.id === sid);
    status('#trial-info', 'Carregando trial…');
    try {
      const trial = await carregarTrial(sessao, nome);
      if (!trial.trc) throw new Error('Este trial não tem MarkerData/' + nome + '.trc.');
      A = { k, sessao, trial, cfg: { ambiente: 'esteira', velEsteira: null, atividade: '', metodo: '', janela: null, excluidos: null }, rotulo: nome };
      estado.analises.set(k, A);
      detectar(A);
    } catch (err) { console.error(err); status('#trial-info', err.message, true); return; }
  }
  preencherForm(A);
  await mostrarRevisao(A);
  recalcular();
}

function detectar(A) {
  const d = detectarEventos(A.trial.trc, A.trial.mot, A.cfg.ambiente, A.cfg.atividade || undefined, A.cfg.metodo || undefined);
  A.det = d; A.eventos = structuredClone(d.eventos); A.cfg.excluidos = null;
  A.cfg.janela = trechoEstavel(d.eventos, A.trial.mot.time);
  A.janelaAuto = !!A.cfg.janela;
}

function preencherForm(A) {
  const c = A.cfg;
  $('#in-rotulo').value = A.rotulo;
  $$('input[name=amb]').forEach(r => r.checked = r.value === c.ambiente);
  $('#in-vel').value = c.velEsteira ?? '';
  $('#lbl-vel').style.display = c.ambiente === 'esteira' ? '' : 'none';
  $('#sel-ativ').value = c.atividade;
  $('#sel-metodo').value = c.metodo;
  const t = A.trial.mot.time, d = A.det;
  $('#trial-info').classList.remove('erro');
  const j = c.janela;
  $('#trial-info').innerHTML = `Duração ${fmt(t[t.length - 1], 1)} s · ${fmt(1 / (t[1] - t[0]), 0)} quadros/s · atividade detectada: <b>${d.atividade}</b> · método: ${d.metodo}` +
    (j ? `<br>Trecho analisado: <b>${fmt(t[j[0]], 1)} a ${fmt(t[j[1]], 1)} s</b>${A.janelaAuto ? ' (trecho estável detectado automaticamente; ajuste no passo 3)' : ''}` : '<br>Trecho analisado: trial inteiro');
  const al = $('#alerta-qualidade');
  if (d.qualidade < 0.6) {
    al.hidden = false;
    al.innerHTML = `<b>Atenção:</b> o movimento dos pés neste trial é pouco regular (índice ${fmt(d.qualidade, 2)}; bom ≥ 0,6). Pode ser falha de rastreamento do OpenCap. Confira os eventos no vídeo antes de usar os números.`;
  } else al.hidden = true;
}

const atual = () => estado.analises.get(estado.atual);
$('#in-rotulo').oninput = (e) => { const A = atual(); if (A) { A.rotulo = e.target.value; montarComparar(); } };
$$('input[name=amb]').forEach(r => r.onchange = () => { const A = atual(); if (!A) return; A.cfg.ambiente = r.value; detectar(A); preencherForm(A); desenharLinha(); recalcular(); });
$('#in-vel').oninput = (e) => { const A = atual(); if (!A) return; A.cfg.velEsteira = parseFloat(String(e.target.value).replace(',', '.')) || null; recalcular(); };
$('#sel-ativ').onchange = (e) => { const A = atual(); if (!A) return; A.cfg.atividade = e.target.value; detectar(A); preencherForm(A); desenharLinha(); recalcular(); };
$('#sel-metodo').onchange = (e) => { const A = atual(); if (!A) return; A.cfg.metodo = e.target.value; detectar(A); preencherForm(A); desenharLinha(); recalcular(); };

// ---------------- 3. revisão ----------------
const video = $('#video'), slider = $('#slider');
async function mostrarRevisao(A) {
  $('#s-revisao').hidden = false;
  const cams = Object.keys(A.trial.videos);
  $('#sel-cam').innerHTML = cams.length ? cams.map(c => `<option>${c}</option>`).join('') : '<option value="">sem vídeo</option>';
  slider.max = A.trial.mot.time.length - 1;
  estado.frame = Math.min(estado.frame, slider.max);
  await trocarVideo();
  desenharLinha();
  irPara(estado.frame);
}
$('#sel-cam').onchange = trocarVideo;
async function trocarVideo() {
  const A = atual(); const cam = $('#sel-cam').value;
  if (estado.videoURL) URL.revokeObjectURL(estado.videoURL);
  estado.videoURL = null; video.removeAttribute('src'); video.load();
  if (!cam) { $('#video-status').textContent = 'Este trial não tem vídeo sincronizado.'; return; }
  $('#video-status').textContent = 'carregando vídeo…';
  try { estado.videoURL = await urlVideo(A.sessao, A.trial.videos[cam]); video.src = estado.videoURL; $('#video-status').textContent = ''; video.currentTime = A.trial.mot.time[estado.frame] || 0; }
  catch (err) { $('#video-status').textContent = 'Não consegui abrir o vídeo.'; }
}

function irPara(i, deVideo = false) {
  const A = atual(); if (!A) return;
  const t = A.trial.mot.time;
  i = Math.max(0, Math.min(t.length - 1, Math.round(i)));
  estado.frame = i; slider.value = i;
  $('#tempo').textContent = `${fmt(t[i], 2)} s · quadro ${i}`;
  if (!deVideo && video.src && Math.abs(video.currentTime - t[i]) > 0.004) video.currentTime = t[i];
  moverCursor();
}
slider.oninput = () => irPara(+slider.value);
$$('[data-step]').forEach(b => b.onclick = () => { video.pause(); irPara(estado.frame + +b.dataset.step); });
$('#btn-play').onclick = () => { if (video.paused) video.play(); else video.pause(); };
video.onplay = () => $('#btn-play').textContent = '❚❚';
video.onpause = () => $('#btn-play').textContent = '▶︎';
video.ontimeupdate = () => { if (!video.paused) { const A = atual(); const t = A.trial.mot.time; irPara(Math.round(video.currentTime / (t[1] - t[0])), true); } };
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || $('#s-revisao').hidden) return;
  if (e.key === 'ArrowRight') { irPara(estado.frame + (e.shiftKey ? 10 : 1)); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { irPara(estado.frame - (e.shiftKey ? 10 : 1)); e.preventDefault(); }
});

const EVS = { CI_D: ['CI D', 'calcR', 'triangle-down', 'd'], RD_D: ['RD D', 'toeR', 'circle-open', 'd'], CI_E: ['CI E', 'calcL', 'triangle-down', 'e'], RD_E: ['RD E', 'toeL', 'circle-open', 'e'] };
function desenharLinha() {
  const A = atual(); if (!A) return;
  const t = Array.from(A.trial.mot.time), s = A.det.sinais;
  const cor = { d: css('--d'), e: css('--e') };
  const sinais = A.det.metodoId === 'vertical'
    ? { calcR: A.trial.trc.markers.r_calc_study.y, calcL: A.trial.trc.markers.L_calc_study.y, toeR: A.trial.trc.markers.r_toe_study.y, toeL: A.trial.trc.markers.L_toe_study.y }
    : s;
  const tr = [
    { x: t, y: Array.from(sinais.calcR), name: 'Calcâneo D', line: { color: cor.d, width: 1.5 } },
    { x: t, y: Array.from(sinais.toeR), name: 'Dedos D', line: { color: cor.d, width: 1, dash: 'dot' } },
    { x: t, y: Array.from(sinais.calcL), name: 'Calcâneo E', line: { color: cor.e, width: 1.5 } },
    { x: t, y: Array.from(sinais.toeL), name: 'Dedos E', line: { color: cor.e, width: 1, dash: 'dot' } },
  ];
  for (const [k, [nome, sig, simb, l]] of Object.entries(EVS)) {
    const idx = A.eventos[k];
    tr.push({ x: idx.map(i => t[i]), y: idx.map(i => sinais[sig][i]), name: nome, mode: 'markers', marker: { symbol: simb, size: 10, color: cor[l], line: { width: 2, color: cor[l] } }, customdata: idx, hovertemplate: nome + ' %{x:.2f} s<extra></extra>' });
  }
  const yt = A.det.metodoId === 'vertical' ? 'altura (m)' : 'posição à frente do sacro (m)';
  Plotly.react('plot-linha', tr, layoutBase({
    margin: { l: 50, r: 10, t: 10, b: 40 }, showlegend: true, legend: { orientation: 'h', y: 1.12, font: { size: 11 } },
    xaxis: { title: 'tempo (s)', rangeslider: { visible: true, thickness: 0.08 }, range: [Math.max(0, t[estado.frame] - 3), Math.max(0, t[estado.frame] - 3) + 6] },
    yaxis: { title: yt, fixedrange: true }, shapes: formas(A), hovermode: 'closest',
  }), { displaylogo: false, responsive: true, modeBarButtons: [['zoomIn2d', 'zoomOut2d', 'resetScale2d']] });
  const el = $('#plot-linha');
  el.removeAllListeners?.('plotly_click');
  el.on('plotly_click', (ev) => { const p = ev.points[0]; if (!p) return; video.pause(); irPara(p.customdata != null ? p.customdata : p.pointIndex); });
}

function formas(A) {
  const t = A.trial.mot.time, sh = [];
  const [i0, i1] = A.cfg.janela || [0, t.length - 1];
  if (i0 > 0) sh.push({ type: 'rect', xref: 'x', yref: 'paper', x0: t[0], x1: t[i0], y0: 0, y1: 1, fillcolor: 'rgba(128,128,128,.18)', line: { width: 0 } });
  if (i1 < t.length - 1) sh.push({ type: 'rect', xref: 'x', yref: 'paper', x0: t[i1], x1: t[t.length - 1], y0: 0, y1: 1, fillcolor: 'rgba(128,128,128,.18)', line: { width: 0 } });
  sh.push({ type: 'line', xref: 'x', yref: 'paper', x0: t[estado.frame], x1: t[estado.frame], y0: 0, y1: 1, line: { color: css('--fg'), width: 1.5 } });
  return sh;
}
let cursorPend = false;
function moverCursor() {
  if (cursorPend) return; cursorPend = true;
  requestAnimationFrame(() => {
    cursorPend = false; const A = atual(); const el = $('#plot-linha'); if (!A || !el.layout) return;
    const t = A.trial.mot.time, x = t[estado.frame];
    const upd = { shapes: formas(A) };
    const r = el.layout.xaxis.range;
    if (r && (x < r[0] || x > r[1])) { const w = r[1] - r[0]; upd['xaxis.range'] = [x - w / 2, x + w / 2]; }
    Plotly.relayout(el, upd);
  });
}

$$('[data-ev]').forEach(b => b.onclick = () => {
  const A = atual(), k = b.dataset.ev, f = estado.frame;
  if (!A.eventos[k].includes(f)) { A.eventos[k].push(f); A.eventos[k].sort((a, c) => a - c); }
  A.cfg.excluidos = null; desenharLinha(); recalcular();
});
$('#btn-remover').onclick = () => {
  const A = atual(), f = estado.frame; let best = null;
  for (const k in A.eventos) for (const i of A.eventos[k]) if (!best || Math.abs(i - f) < Math.abs(best[1] - f)) best = [k, i];
  if (!best || Math.abs(best[1] - f) > A.det.fs * 0.3) { status('#video-status', 'Nenhum evento perto deste quadro.'); return; }
  A.eventos[best[0]] = A.eventos[best[0]].filter(i => i !== best[1]);
  A.cfg.excluidos = null; desenharLinha(); recalcular();
};
$('#btn-ini').onclick = () => { const A = atual(); const n = A.trial.mot.time.length - 1; const j = A.cfg.janela || [0, n]; A.cfg.janela = [estado.frame, Math.max(estado.frame + 1, j[1])]; A.janelaAuto = false; A.cfg.excluidos = null; preencherForm(A); moverCursor(); recalcular(); };
$('#btn-fim').onclick = () => { const A = atual(); const n = A.trial.mot.time.length - 1; const j = A.cfg.janela || [0, n]; A.cfg.janela = [Math.min(j[0], estado.frame - 1), estado.frame]; A.janelaAuto = false; A.cfg.excluidos = null; preencherForm(A); moverCursor(); recalcular(); };
$('#btn-tudo').onclick = () => { const A = atual(); A.cfg.janela = null; A.janelaAuto = false; A.cfg.excluidos = null; preencherForm(A); moverCursor(); recalcular(); };
$('#btn-estavel').onclick = () => { const A = atual(); A.cfg.janela = trechoEstavel(A.eventos, A.trial.mot.time); A.janelaAuto = true; A.cfg.excluidos = null; preencherForm(A); moverCursor(); recalcular(); };
$('#btn-redetectar').onclick = () => { const A = atual(); detectar(A); preencherForm(A); desenharLinha(); recalcular(); };

// ---------------- 4. resultados ----------------
let recalcTimer = null;
function recalcular() { clearTimeout(recalcTimer); recalcTimer = setTimeout(recalcularJa, 60); }
function recalcularJa() {
  const A = atual(); if (!A) return;
  const ativ = A.cfg.atividade || A.det.atividade;
  if (A.cfg.ambiente === 'esteira' && !A.cfg.velEsteira) {
    $('#s-resultados').hidden = false;
    $('#cards').innerHTML = `<div class="alerta" style="grid-column:1/-1">Informe a <b>velocidade da esteira</b> (passo 2) para calcular velocidade e comprimentos. Os tempos e os ângulos já aparecem abaixo.</div>`;
  }
  A.res = analisar(A.trial, A.eventos, { ...A.cfg, atividade: ativ });
  A.res.atividade = ativ; A.res.metodo = A.det.metodo;
  if (!A.cfg.excluidos) A.cfg.excluidos = new Set(A.res.passadas.filter(p => p.excluida).map(p => p.id));
  mostrarResultados(A);
  montarSelTrial(); montarComparar();
  $('#s-comparar').hidden = false; $('#s-laudo').hidden = false;
}

function mostrarResultados(A) {
  const R = A.res, T = R.tab, sem = A.cfg.ambiente === 'esteira' && !A.cfg.velEsteira;
  $('#s-resultados').hidden = false;
  const ok = R.passadas.filter(p => !p.excluida);
  const nD = ok.filter(p => p.lado === 'D').length, nE = ok.filter(p => p.lado === 'E').length;
  const kpi = (rot, v, u, r = '') => `<div class="kpi"><div class="u">${rot}</div><div class="v">${v}</div><div class="r">${u}${r ? ' · ' + r : ''}</div></div>`;
  const si = (x) => x == null ? '' : `simetria ${x > 0 ? '+' : ''}${fmt(x, 1)}%`;
  if (!sem) $('#cards').innerHTML = '';
  $('#cards').innerHTML += [
    sem ? '' : kpi('Velocidade', fmt(T.velocidade.geral.m, 2), 'm/s', A.cfg.ambiente === 'esteira' ? `esteira ${fmt(A.cfg.velEsteira, 1)} km/h` : ''),
    kpi('Cadência', fmt(T.cadencia.geral.m, 0), 'passos/min'),
    sem ? '' : kpi('Passada', fmt(T.passada.geral.m, 2), 'm', `CV ${fmt(T.passada.geral.cv, 1)}%`),
    kpi('Apoio D / E', `${fmt(T.apoioPct.D.m, 0)} / ${fmt(T.apoioPct.E.m, 0)}`, '% do ciclo', si(T.apoioPct.si)),
    R.atividade === 'corrida' ? kpi('Tempo de voo', fmt(T.voo?.geral.m * 1000, 0), 'ms') : kpi('Duplo apoio', fmt(T.duplaPct?.geral.m, 0), '% do ciclo'),
    kpi('Passadas usadas', `${nD} D · ${nE} E`, R.atividade, `CV tempo ${fmt(T.duracao.geral.cv, 1)}%`),
  ].join('');
  // tabela espaço-temporal
  let h = '<tr><th>Variável</th><th class="d">Direito</th><th class="e">Esquerdo</th><th>Simetria</th><th>CV</th></tr>';
  for (const [k, rot, u, d] of VARS) {
    const v = T[k]; if (!v) continue;
    if (sem && ['velocidade', 'passada', 'passo'].includes(k)) continue;
    if (k === 'velocidade' || k === 'cadencia') { h += `<tr><td>${rot} <span class="dica">${u}</span></td><td colspan="2" style="text-align:center">${fmt(v.geral.m, d)}</td><td></td><td></td></tr>`; continue; }
    const mdp = (x) => x.m == null ? '–' : `${fmt(x.m, d)}${x.dp != null ? ' <span class="dica">± ' + fmt(x.dp, d) + '</span>' : ''}`;
    const a = v.si == null ? '–' : `<span class="${Math.abs(v.si) >= 10 ? 'assim' : ''}">${v.si > 0 ? '+' : ''}${fmt(v.si, 1)}%</span>`;
    h += `<tr><td>${rot} <span class="dica">${u}</span></td><td>${mdp(v.D)}</td><td>${mdp(v.E)}</td><td>${a}</td><td>${fmt(v.geral.cv, 1)}%</td></tr>`;
  }
  $('#tab-et').innerHTML = h;
  $('#tab-pontos').innerHTML = '<tr><th>Ponto</th><th class="d">D</th><th class="e">E</th><th>D − E</th></tr>' +
    R.pontos.map(p => `<tr><td>${p.rotulo}</td><td>${fmt(p.D, 0)}</td><td>${fmt(p.E, 0)}</td><td>${p.D != null && p.E != null ? fmt(p.D - p.E, 0) : '–'}</td></tr>`).join('');
  desenharCurvas(A);
  // passadas
  $('#n-passadas').textContent = `${ok.length} de ${R.passadas.length}`;
  $('#lista-passadas').innerHTML = R.passadas.map(p => `<label class="${p.suspeita ? 'susp' : ''}" title="${p.suspeita ? 'duração fora do padrão ou sem RD' : ''}"><input type="checkbox" data-p="${p.id}" ${p.excluida ? '' : 'checked'}> ${p.lado}${p.n} · ${fmt(p.t0, 1)} s</label>`).join('');
  $$('#lista-passadas input').forEach(c => c.onchange = () => { if (c.checked) A.cfg.excluidos.delete(c.dataset.p); else A.cfg.excluidos.add(c.dataset.p); recalcularJa(); });
}

function layoutBase(extra) {
  return Object.assign({ paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: css('--fg'), size: 11, family: '-apple-system,system-ui,sans-serif' },
    xaxis: { gridcolor: css('--line'), zerolinecolor: css('--line') }, yaxis: { gridcolor: css('--line'), zerolinecolor: css('--line') } }, extra,
    { xaxis: Object.assign({ gridcolor: css('--line'), zerolinecolor: css('--line') }, extra.xaxis), yaxis: Object.assign({ gridcolor: css('--line'), zerolinecolor: css('--line') }, extra.yaxis) });
}

function desenharCurvas(A) {
  const R = A.res, cont = $('#curvas'), cores = { D: css('--d'), E: css('--e') };
  if (cont.children.length !== ANGULOS.length) cont.innerHTML = ANGULOS.map(([c]) => `<div class="curva" id="cv-${c}"></div>`).join('');
  for (const [c, rot] of ANGULOS) {
    const shapes = ['D', 'E'].filter(l => R.rdMedio[l] != null).map(l => ({ type: 'line', x0: R.rdMedio[l], x1: R.rdMedio[l], yref: 'paper', y0: 0, y1: 1, line: { color: cores[l], dash: 'dash', width: 1 } }));
    Plotly.react('cv-' + c, tracosCurva(R.curvas, c, cores), layoutBase({ title: { text: rot, font: { size: 12 }, x: 0.02 }, margin: { l: 40, r: 8, t: 30, b: 32 }, showlegend: false, shapes,
      xaxis: { title: { text: '% do ciclo', font: { size: 10 } }, range: [0, 100] }, yaxis: { title: { text: 'graus', font: { size: 10 } } } }), { displayModeBar: false, responsive: true });
  }
}

// ---------------- 5. comparar ----------------
const comparados = new Set();
function montarComparar() {
  const feitos = [...estado.analises.values()].filter(A => A.res);
  $('#comp-lista').innerHTML = feitos.map(A => `<label class="radio"><input type="checkbox" data-c="${A.k}" ${comparados.has(A.k) ? 'checked' : ''}> ${esc(A.rotulo)} <span class="dica">(${esc(A.sessao.nome)})</span></label>`).join('') || '<span class="dica">Analise pelo menos dois trials.</span>';
  $$('#comp-lista input').forEach(c => c.onchange = () => { c.checked ? comparados.add(c.dataset.c) : comparados.delete(c.dataset.c); desenharComparacao(); });
  desenharComparacao();
}
export function selecionadosComparacao() { return [...comparados].map(k => estado.analises.get(k)).filter(A => A?.res); }
function desenharComparacao() {
  const L = selecionadosComparacao(), out = $('#comp-saida');
  if (L.length < 2) { out.innerHTML = ''; return; }
  const vars = [['velocidade', 'Velocidade (m/s)', 2], ['cadencia', 'Cadência (passos/min)', 0], ['passada', 'Passada (m)', 2], ['largura', 'Largura do passo (cm)', 1], ['apoioPct', 'Apoio (%)', 1], ['duplaPct', 'Duplo apoio (%)', 1], ['voo', 'Tempo de voo (s)', 3]];
  let h = `<table class="tab"><tr><th>Variável</th>${L.map((A, i) => `<th style="color:${PALETA[i % 6]}">${esc(A.rotulo)}</th>`).join('')}</tr>`;
  for (const [k, rot, d] of vars) {
    if (!L.some(A => A.res.tab[k]?.geral?.m != null)) continue;
    h += `<tr><td>${rot}</td>${L.map(A => `<td>${fmt(A.res.tab[k]?.geral?.m, d)}</td>`).join('')}</tr>`;
  }
  h += `<tr><td>Simetria do apoio (%)</td>${L.map(A => `<td>${fmt(A.res.tab.apoioPct?.si, 1)}</td>`).join('')}</tr>`;
  for (const p of L[0].res.pontos.slice(0, 7)) {
    const idx = L[0].res.pontos.indexOf(p);
    h += `<tr><td>${p.rotulo} (D / E)</td>${L.map(A => `<td>${fmt(A.res.pontos[idx].D, 0)} / ${fmt(A.res.pontos[idx].E, 0)}</td>`).join('')}</tr>`;
  }
  out.innerHTML = h + '</table><p class="dica">Curvas: linha cheia = direito, tracejada = esquerdo.</p><div class="curvas" id="comp-curvas"></div>';
  const cc = $('#comp-curvas');
  cc.innerHTML = ANGULOS.slice(0, 6).map(([c]) => `<div class="curva" id="cc-${c}"></div>`).join('');
  for (const [c, rot] of ANGULOS.slice(0, 6)) {
    Plotly.newPlot('cc-' + c, tracosComparacao(L, c), layoutBase({ title: { text: rot, font: { size: 12 }, x: 0.02 }, margin: { l: 40, r: 8, t: 30, b: 32 }, showlegend: c === 'hip_flexion', legend: { orientation: 'h', y: -0.25, font: { size: 10 } },
      xaxis: { range: [0, 100] }, yaxis: {} }), { displayModeBar: false, responsive: true });
  }
}

// ---------------- 6. laudo ----------------
$('#in-data').valueAsDate = new Date();
$('#btn-pdf').onclick = async () => {
  const A = atual(); if (!A?.res) return;
  status('#laudo-status', 'Gerando PDF…');
  try { await gerarPDF(A, dadosLaudo(), $('#chk-comp-laudo').checked ? selecionadosComparacao() : []); status('#laudo-status', 'PDF baixado.'); }
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
export { fmt };
