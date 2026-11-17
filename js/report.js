import { ANGULOS, VARS, unidade, pontosNormais, velocidadeTxt } from './gait.js';
import { tracosCurva, tracosComparacao, setasEixo, PALETA, linhasComparacao } from './charts.js';
import { CREDITOS } from './creditos.js';
import { tr, locale } from './i18n.js';

const f = (v, d = 1) => (v == null || !isFinite(v)) ? '-' : (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });
const CORES = { D: '#c62828', E: '#1f5fd6' };
const nomeArq = (A, ext) => `${(A.rotulo || A.trial.nome).replace(/[^\w\-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.${ext}`;
const dataBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';

async function imagem(tracos, titulo, shapes = [], legenda = false, setas = [], un = '°') {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-9999px;top:0;width:520px;height:300px';
  document.body.appendChild(div);
  await Plotly.newPlot(div, tracos, {
    width: 520, height: 300, paper_bgcolor: '#fff', plot_bgcolor: '#fff', font: { size: 12, color: '#222' },
    title: { text: tr(titulo), font: { size: 14 }, x: 0.02 }, margin: { l: setas.length ? 92 : 48, r: 10, t: 34, b: legenda ? 60 : 36 }, showlegend: legenda, annotations: setas,
    legend: { orientation: 'h', y: -0.22, font: { size: 10 } }, shapes,
    xaxis: { range: [0, 100], title: { text: '% do ciclo', font: { size: 11 } }, gridcolor: '#e6e6e6' }, yaxis: { title: { text: setas.length ? '' : (un === '°' ? 'graus' : 'cm'), font: { size: 11 } }, ticksuffix: un === '°' ? '°' : ' cm', gridcolor: '#e6e6e6', zerolinecolor: '#999' },
  }, { staticPlot: true });
  const url = await Plotly.toImage(div, { format: 'jpeg', width: 780, height: 450 });
  Plotly.purge(div); div.remove();
  return url;
}

export async function gerarPDF(A, D, comparacao, vis = null, extras = {}) {
  vis = vis || { curvas: ANGULOS.map(a => a[0]), vars: VARS.map(v => v[0]), pontos: true, setas: true, dp: true };
  const ANG = ANGULOS.filter(a => vis.curvas.includes(a[0]) && A.res.curvas[a[0]] && Object.keys(A.res.curvas[a[0]]).length);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 15;
  const R = A.res, T = R.tab, sem = A.cfg.ambiente === 'esteira' && !A.cfg.velEsteira;
  let y = M;
  const txt = (s, x, yy, o = {}) => { pdf.setFont('helvetica', o.b ? 'bold' : 'normal'); pdf.setFontSize(o.s || 10); pdf.setTextColor(o.c || '#1d1d1b'); pdf.text(tr(String(s)), x, yy, o.al ? { align: o.al } : undefined); };
  const linha = (yy) => { pdf.setDrawColor('#d8d5cc'); pdf.line(M, yy, W - M, yy); };
  const rodape = () => {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor('#777');
    const linhas = [
      ...pdf.splitTextToSize(tr('Valores estimados a partir de vídeo (OpenCap); interpretar com julgamento clínico. TD = touchdown (pé toca o chão); TO = toe-off (dedos deixam o chão). Eventos:') + ' ' + tr(R.metodo) + '.', W - 2 * M - 16),
      `${tr('Ferramenta desenvolvida por')} ${CREDITOS.autor}${CREDITOS.doi ? ' · DOI ' + CREDITOS.doi : ''} · ${CREDITOS.repositorio.replace('https://', '')} · ORCID ${CREDITOS.orcid.replace('https://orcid.org/', '')}`,
    ];
    pdf.text(linhas, M, 289 - (linhas.length - 1) * 3);
    txt(`Página ${pdf.getNumberOfPages()}`, W - M, 288, { s: 7, c: '#777', al: 'right' });
  };

  // cabeçalho
  txt(`Relatório de análise da ${R.atividade === 'corrida' ? 'corrida' : 'marcha'}`, M, y + 5, { s: 16, b: true }); y += 12;
  const cab = [
    ['Paciente', D.paciente || '-'], ['Data', dataBR(D.data) || '-'], ['Avaliador(a)', D.avaliador || '-'],
    ['Condição', A.rotulo || A.trial.nome], ['Filtro', A.trial.fc ? `${f(A.trial.fc, A.trial.fc % 1 ? 1 : 0)} Hz` : 'sem filtro'], ['Local', A.cfg.ambiente === 'esteira' ? `Esteira${A.cfg.velEsteira ? ' · ' + (velocidadeTxt(A, f)?.kmh ?? f(A.cfg.velEsteira, 1)) + ' km/h' : ''}` : 'Solo'],
    ['Passadas analisadas', `${R.passadas.filter(p => !p.excluida && p.lado === 'D').length} D · ${R.passadas.filter(p => !p.excluida && p.lado === 'E').length} E`],
  ];
  cab.forEach(([k, v], i) => { const x = M + (i % 3) * 60, yy = y + Math.floor(i / 3) * 10; txt(k, x, yy, { s: 7.5, c: '#777' }); txt(v, x, yy + 4.5, { s: 10 }); });
  y += Math.ceil(cab.length / 3) * 10 + 2; linha(y); y += 7;

  // destaques
  const kp = [
    ['Velocidade', sem ? '-' : (velocidadeTxt(A, f)?.ms ?? '-') + ' m/s'], ['Cadência', f(T.cadencia.geral.m, 0) + ' passos/min'],
    ['Passada', sem ? '-' : f(T.passada.geral.m, 2) + ' m'],
    R.atividade === 'corrida' ? ['Tempo de voo', f((T.voo?.geral.m ?? NaN) * 1000, 0) + ' ms'] : ['Duplo apoio', f(T.duplaPct?.geral.m, 0) + ' %'],
  ];
  kp.forEach(([k, v], i) => { const x = M + i * 45; txt(k, x, y, { s: 7.5, c: '#777' }); txt(v, x, y + 6, { s: 13, b: true }); });
  const Vk = sem ? null : velocidadeTxt(A, f); if (Vk) txt(`(${Vk.kmh} km/h)`, M, y + 10.5, { s: 8, c: '#555' });
  y += 15;
  if (R.atividade === 'corrida' && R.padrao?.D) { txt(`Padrão de contato no TD: D ${R.padrao.D.pred} (pé ${f(T.anguloPe?.D.m, 0)}°), E ${R.padrao.E?.pred ?? '-'} (pé ${f(T.anguloPe?.E.m, 0)}°) · Altman & Davis (2012)`, M, y, { s: 8.5 }); y += 6; }
  // achados
  const ach = A.achados || [];
  if (ach.length) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
    const linhasA = ach.flatMap(a => pdf.splitTextToSize('• ' + tr(a.t).replace(/[–−]/g, '-'), W - 2 * M - 8));
    const h = 9 + linhasA.length * 4.2;
    pdf.setDrawColor('#d8a200'); pdf.setFillColor('#fff8e6'); pdf.roundedRect(M, y - 4, W - 2 * M, h, 2, 2, 'FD');
    txt('Achados (sinalização automática; não substitui a avaliação clínica)', M + 3, y + 1, { s: 9, b: true });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor('#1d1d1b'); pdf.text(linhasA, M + 4, y + 6.5);
    y += h + 3;
  }

  // tabela espaço-temporal
  txt('Variáveis espaço-temporais', M, y, { s: 11, b: true }); y += 5;
  const cols = [M, M + 72, M + 102, M + 132, M + 160];
  const cabT = ['Variável', 'Direito', 'Esquerdo', 'Simetria', 'CV'];
  cabT.forEach((h, i) => txt(h, cols[i] + (i ? 26 : 0), y, { s: 8, b: true, c: i === 1 ? CORES.D : i === 2 ? CORES.E : '#555', al: i ? 'right' : undefined }));
  y += 2; linha(y); y += 4.5;
  for (const [k, rot, u, d] of VARS) {
    const v = T[k]; if (!v || k === 'velocidade' || k === 'cadencia' || !vis.vars.includes(k)) continue;
    if (sem && ['passada', 'passo'].includes(k)) continue;
    if (y > 272) { rodape(); pdf.addPage(); y = M + 6; }
    const mdp = (x) => x.m == null ? '-' : f(x.m, d) + (x.dp != null ? ' ± ' + f(x.dp, d) : '');
    const vals = [`${rot} (${u})`, mdp(v.D), mdp(v.E), v.si == null ? '-' : (v.si > 0 ? '+' : '') + f(v.si, 1) + '%', (v.geral.cv == null ? '-' : f(v.geral.cv, 1) + '%')];
    vals.forEach((s, i) => txt(s, cols[i] + (i ? 26 : 0), y, { s: 8.5, al: i ? 'right' : undefined, b: i === 3 && Math.abs(v.si ?? 0) >= 10 }));
    y += 5;
  }
  txt('Simetria = (D - E) / média(D, E) x 100; positivo = maior à direita. CV = variabilidade entre passadas.', M, y, { s: 7, c: '#777' }); y += 8;

  // pontos-chave
  const pontos = vis.pontos ? R.pontos.filter(p => vis.curvas.includes(p.curva)) : [];
  if (pontos.length) { txt('Pontos-chave das curvas (graus)', M, y, { s: 11, b: true }); y += 5;
  const nrm = vis.faixa ? pontosNormais(vis.faixa, R.rdMedio.D) : {}, temN = Object.keys(nrm).length > 0;
  const xs = temN ? [M, M + 108, M + 128, M + 146, M + 180] : [M, M + 128, M + 150, M + 172];
  ['Ponto', 'Direito', 'Esquerdo', 'D - E', ...(temN ? ['Normal (média ± DP)'] : [])].forEach((h, i) => txt(h, xs[i], y, { s: 8, b: true, c: i === 1 ? CORES.D : i === 2 ? CORES.E : '#555', al: i ? 'right' : undefined }));
  y += 2; linha(y); y += 4.5;
  for (const p of pontos) {
    if (y > 272) { rodape(); pdf.addPage(); y = M + 6; }
    const n = nrm[p.rotulo];
    [p.rotulo, f(p.D, 0), f(p.E, 0), p.D != null && p.E != null ? f(p.D - p.E, 0) : '-', ...(temN ? [n ? f(n.m, 0) + (n.s != null ? ' ± ' + f(n.s, 0) : '') : ''] : [])]
      .forEach((s, i) => txt(s, xs[i], y, { s: 8.5, al: i ? 'right' : undefined, c: i === 4 ? '#666' : undefined }));
    y += 5;
  }
  if (temN) { txt('Normal: mesma regra aplicada à curva média da referência (ver faixa e fonte na página das curvas).', M, y, { s: 7, c: '#777' }); y += 5; }
  }
  if (D.obs) {
    y += 4; txt('Observações', M, y, { s: 11, b: true }); y += 5;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor('#1d1d1b');
    const ls = pdf.splitTextToSize(D.obs, W - 2 * M); pdf.text(ls, M, y); y += ls.length * 4.6; // observações: texto do usuário, não traduzido
  }
  rodape();

  // página de curvas
  pdf.addPage(); y = M;
  txt('Curvas ao longo do ciclo', M, y + 4, { s: 13, b: true });
  txt('Linha = média; faixa = ±1 DP; tracejado = TO (dedos deixam o chão).  Vermelho = direito; azul = esquerdo.', M, y + 10, { s: 8, c: '#666' });
  if (vis.faixa) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor('#666');
    const nl = pdf.splitTextToSize(tr(`Faixa cinza = normalidade (média ± 1 DP), adultos saudáveis${vis.faixa.grupo ? ', ' + vis.faixa.grupo : ''}, ${f(vis.faixa.velRef, 1)} m/s, n = ${vis.faixa.n}; ${vis.faixa.fonte}. Dados de laboratório com marcadores.`), W - 2 * M);
    pdf.text(nl, M, y + 14); y += 3.5 * nl.length;
  }
  y += 15;
  const w = (W - 2 * M - 6) / 2, h = w * 300 / 520;
  for (let i = 0; i < ANG.length; i++) {
    const [c, rot] = ANG[i];
    if (i > 0 && i % 8 === 0) { rodape(); pdf.addPage(); y = M; }
    const k = i % 8;
    const shapes = ['D', 'E'].filter(l => R.rdMedio[l] != null).map(l => ({ type: 'line', x0: R.rdMedio[l], x1: R.rdMedio[l], yref: 'paper', y0: 0, y1: 1, line: { color: CORES[l], dash: 'dash', width: 1 } }));
    const img = await imagem(tracosCurva(R.curvas, c, CORES, vis.dp, vis.faixa, 0.35), rot, shapes, false, vis.setas ? setasEixo(c, '#555', 11, 56) : [], unidade(c));
    pdf.addImage(img, 'JPEG', M + (k % 2) * (w + 6), y + Math.floor(k / 2) * (h + 3), w, h);
  }
  rodape();

  // curvas ao longo da trial (faixas de tempo)
  if (extras.serie?.length) {
    pdf.addPage(); y = M;
    txt('Curvas ao longo da trial', M, y + 4, { s: 13, b: true });
    txt('Trecho analisado, uma faixa de 10 s por linha. Barras no topo = apoio. Vermelho = direito; azul = esquerdo.', M, y + 10, { s: 8, c: '#666' });
    y += 16;
    const lw = W - 2 * M, lh = lw * 170 / 1100;
    for (const g of extras.serie) {
      if (y + 6 + lh > 280) { rodape(); pdf.addPage(); y = M; }
      txt(g.titulo, M, y + 3, { s: 9.5, b: true }); y += 5;
      for (const img of g.linhas) {
        if (y + lh > 282) { rodape(); pdf.addPage(); y = M; txt(g.titulo + ' (cont.)', M, y + 3, { s: 9.5, b: true }); y += 5; }
        pdf.addImage(img, 'JPEG', M, y, lw, lh); y += lh + 1.5;
      }
      y += 3;
    }
    rodape();
  }
  // mapa de pegadas
  if (extras.pegadas?.linhas?.length) {
    const P = extras.pegadas, Rm = P.resumo;
    pdf.addPage(); y = M;
    txt('Mapa de pegadas', M, y + 4, { s: 13, b: true });
    txt(`Vista de cima, caminhando para a direita; cada pegada no meio do apoio. Tracejado = linha de progressão; linha fina = trajeto.${P.esteira ? ' Esteira: pegadas reconstruídas com a velocidade da lona.' : ''}`, M, y + 10, { s: 8, c: '#666' });
    y += 17;
    const ang = (l) => Rm[l].ang == null ? '-' : `${f(Rm[l].ang, 0)}°${Rm[l].angDp != null ? ' ± ' + f(Rm[l].angDp, 0) : ''}`;
    txt(`Ângulo de progressão do pé (+ = ponta para fora): D ${ang('D')} · E ${ang('E')}`, M, y, { s: 9 }); y += 5;
    txt(`Largura entre pegadas: ${Rm.largura == null ? '-' : f(Rm.largura * 100, 1) + ' cm'} · Desvio lateral da linha de progressão: máx ${Rm.desvioMax == null ? '-' : f(Rm.desvioMax * 100, 1) + ' cm'}, DP ${Rm.desvioDp == null ? '-' : f(Rm.desvioDp * 100, 1) + ' cm'}`, M, y, { s: 9 }); y += 6;
    const lw = W - 2 * M, lh = lw * P.proporcao;
    for (const img of P.linhas) {
      if (y + lh > 282) { rodape(); pdf.addPage(); y = M; }
      pdf.addImage(img, 'JPEG', M, y, lw, lh); y += lh + 2;
    }
    rodape();
  }

  // comparação
  const L = (comparacao || []).filter(x => x.res);
  if (L.length >= 2) {
    pdf.addPage(); y = M;
    txt('Comparação', M, y + 4, { s: 13, b: true }); y += 12;
    const cw = (W - 2 * M - 62) / L.length;
    txt('Variável', M, y, { s: 8, b: true });
    L.forEach((B, i) => txt(String(B.rotulo).slice(0, 18), M + 62 + cw * (i + 1), y, { s: 8, b: true, c: PALETA[i % PALETA.length], al: 'right' }));
    y += 2; linha(y); y += 4.5;
    for (const r of linhasComparacao(L, vis, f)) {
      if (y > 270) { rodape(); pdf.addPage(); y = M + 6; }
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
      txt(pdf.splitTextToSize(r.rotulo.replace(/·/g, '-'), 60)[0], M, y, { s: 8 });
      r.valores.forEach((v, i) => txt(v.replace(/–/g, '-'), M + 62 + cw * (i + 1), y, { s: 8.5, al: 'right' }));
      y += 4.8;
    }
    // curvas: todas as escolhidas, 6 por página
    rodape(); pdf.addPage(); y = M;
    txt('Comparação · curvas médias (linha cheia = direito; tracejada = esquerdo)', M, y + 4, { s: 11, b: true }); y += 9;
    const ANGc = ANG.length ? ANG : [];
    const hh = w * 300 / 520;
    for (let i = 0; i < ANGc.length; i++) {
      const k = i % 6;
      if (i > 0 && k === 0) { rodape(); pdf.addPage(); y = M + 4; }
      const [c, rot] = ANGc[i];
      const img = await imagem(tracosComparacao(L, c), rot, [], true, vis.setas ? setasEixo(c, '#555', 11, 56) : [], unidade(c));
      pdf.addImage(img, 'JPEG', M + (k % 2) * (w + 6), y + Math.floor(k / 2) * (hh + 4), w, hh);
    }
    rodape();
  }
  pdf.save(nomeArq(A, 'pdf'));
}

const NOMES_ABA = {"Pegadas": "Footprints", "Resumo": "Summary", "Passadas": "Strides", "Eventos": "Events", "Curvas_media": "Mean_curves", "Curvas_passadas": "Stride_curves", "Comparacao": "Comparison"};
// traduz cabeçalhos e rótulos (as linhas com dados do usuário ficam como estão)
function aba(wb, aoa, nome) {
  const t = aoa.map(l => l.map(v => typeof v === 'string' ? tr(v) : v));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(t), tr === null ? nome : (locale() === 'en-US' ? NOMES_ABA[nome] || nome : nome));
}
export function gerarExcel(A, D, comparacao, pegadas = null) {
  const wb = XLSX.utils.book_new();
  const R = A.res, T = R.tab, t = A.trial.mot.time;
  const info = [
    ['Paciente', D.paciente], ['Data', dataBR(D.data)], ['Avaliador(a)', D.avaliador], ['Condição', A.rotulo], ['Sessão', A.sessao.nome], ['Trial', A.trial.nome],
    ['Local', A.cfg.ambiente], ['Velocidade da esteira (km/h)', A.cfg.velEsteira ?? ''], ['Velocidade média (km/h)', R.tab.velocidade?.geral?.m != null ? R.tab.velocidade.geral.m * 3.6 : ''], ['Atividade', R.atividade], ['Método de eventos', R.metodo],
    ['Filtro passa-baixa (Hz; Butterworth 4ª ordem, sem defasagem)', A.trial.fc || 'sem filtro'], ['Trecho analisado (s)', A.cfg.janela ? `${f(t[A.cfg.janela[0]], 2)} a ${f(t[A.cfg.janela[1]], 2)}` : 'trial inteiro'], ['Observações', D.obs], [],
    ['Variável', 'Unidade', 'Direito média', 'Direito DP', 'Direito n', 'Esquerdo média', 'Esquerdo DP', 'Esquerdo n', 'Simetria %', 'Geral média', 'Geral DP', 'CV %'],
  ];
  for (const [k, rot, u] of VARS) {
    const v = T[k]; if (!v) continue;
    info.push([rot, u, v.D?.m ?? '', v.D?.dp ?? '', v.D?.n ?? '', v.E?.m ?? '', v.E?.dp ?? '', v.E?.n ?? '', v.si ?? '', v.geral?.m ?? '', v.geral?.dp ?? '', v.geral?.cv ?? '']);
  }
  info.push([], ['Ponto-chave (graus)', '', 'Direito', '', '', 'Esquerdo']);
  R.pontos.forEach(p => info.push([p.rotulo, '', p.D ?? '', '', '', p.E ?? '']));
  aba(wb, info, 'Resumo');

  const ps = [['Passada', 'Lado', 'Usada', 'Suspeita', 'Início (s)', 'Duração (s)', 'Apoio (s)', 'Apoio %', 'Balanço (s)', 'Tempo do passo (s)', 'Duplo apoio %', 'Voo (s)', 'Passada (m)', 'Passo (m)', 'Largura (cm)']];
  R.passadas.forEach(p => ps.push([p.id, p.lado, p.excluida ? 'não' : 'sim', p.suspeita ? 'sim' : '', p.t0, p.duracao, p.apoio ?? '', p.apoioPct ?? '', p.balanco ?? '', p.passoT ?? '', p.duplaPct ?? '', p.voo ?? '', p.passada ?? '', p.passo ?? '', p.largura != null ? p.largura * 100 : '']));
  aba(wb, ps, 'Passadas');

  const ev = [['Evento', 'Lado', 'Quadro', 'Tempo (s)']];
  for (const [k, nome, lado] of [['CI_D', 'TD (touchdown: pé toca o chão)', 'D'], ['RD_D', 'TO (toe-off: dedos deixam o chão)', 'D'], ['CI_E', 'TD (touchdown: pé toca o chão)', 'E'], ['RD_E', 'TO (toe-off: dedos deixam o chão)', 'E']])
    A.eventos[k].forEach(i => ev.push([nome, lado, i, t[i]]));
  ev.splice(1, ev.length - 1, ...ev.slice(1).sort((a, b) => a[3] - b[3]));
  aba(wb, ev, 'Eventos');
  if (pegadas) aba(wb, pegadas, 'Pegadas');

  const head = ['% ciclo']; const colsC = [];
  for (const [c] of ANGULOS) for (const l of ['D', 'E']) if (R.curvas[c]?.[l]) { head.push(`${c}_${l}_media`, `${c}_${l}_dp`); colsC.push([c, l]); }
  const cm = [head];
  for (let k = 0; k <= 100; k++) { const row = [k]; colsC.forEach(([c, l]) => row.push(R.curvas[c][l].m[k], R.curvas[c][l].s[k])); cm.push(row); }
  aba(wb, cm, 'Curvas_media');

  const usadas = R.passadas.filter(p => !p.excluida);
  const cp = [['% ciclo', ...ANGULOS.flatMap(([c]) => usadas.map(p => `${c}_${p.id}`))]];
  for (let k = 0; k <= 100; k++) cp.push([k, ...ANGULOS.flatMap(([c]) => usadas.map(p => p.curvas[c]?.[k] ?? ''))]);
  aba(wb, cp, 'Curvas_passadas');

  const L = (comparacao || []).filter(x => x.res);
  if (L.length >= 2) {
    const cc = [['Variável', ...L.map(B => B.rotulo)]];
    for (const [k, rot, u] of VARS) if (L.some(B => B.res.tab[k]?.geral?.m != null)) cc.push([`${rot} (${u})`, ...L.map(B => B.res.tab[k]?.geral?.m ?? '')]);
    cc.push(['Simetria do apoio (%)', ...L.map(B => B.res.tab.apoioPct?.si ?? '')]);
    L[0].res.pontos.forEach((p, j) => { cc.push([p.rotulo + ' D', ...L.map(B => B.res.pontos[j].D ?? '')]); cc.push([p.rotulo + ' E', ...L.map(B => B.res.pontos[j].E ?? '')]); });
    aba(wb, cc, 'Comparacao');
  }
  XLSX.writeFile(wb, nomeArq(A, 'xlsx'));
}
