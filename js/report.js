import { ANGULOS, VARS } from './gait.js';
import { tracosCurva, tracosComparacao, setasEixo, PALETA } from './charts.js';
import { CREDITOS } from './creditos.js';

const f = (v, d = 1) => (v == null || !isFinite(v)) ? '-' : (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const CORES = { D: '#c62828', E: '#1f5fd6' };
const nomeArq = (A, ext) => `${(A.rotulo || A.trial.nome).replace(/[^\w\-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.${ext}`;
const dataBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';

async function imagem(tracos, titulo, shapes = [], legenda = false, setas = []) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-9999px;top:0;width:520px;height:300px';
  document.body.appendChild(div);
  await Plotly.newPlot(div, tracos, {
    width: 520, height: 300, paper_bgcolor: '#fff', plot_bgcolor: '#fff', font: { size: 12, color: '#222' },
    title: { text: titulo, font: { size: 14 }, x: 0.02 }, margin: { l: setas.length ? 92 : 48, r: 10, t: 34, b: legenda ? 60 : 36 }, showlegend: legenda, annotations: setas,
    legend: { orientation: 'h', y: -0.22, font: { size: 10 } }, shapes,
    xaxis: { range: [0, 100], title: { text: '% do ciclo', font: { size: 11 } }, gridcolor: '#e6e6e6' }, yaxis: { title: { text: setas.length ? '' : 'graus', font: { size: 11 } }, ticksuffix: '°', gridcolor: '#e6e6e6', zerolinecolor: '#999' },
  }, { staticPlot: true });
  const url = await Plotly.toImage(div, { format: 'jpeg', width: 780, height: 450 });
  Plotly.purge(div); div.remove();
  return url;
}

export async function gerarPDF(A, D, comparacao, vis = null) {
  vis = vis || { curvas: ANGULOS.map(a => a[0]), vars: VARS.map(v => v[0]), pontos: true, setas: true, dp: true };
  const ANG = ANGULOS.filter(a => vis.curvas.includes(a[0]) && A.res.curvas[a[0]] && Object.keys(A.res.curvas[a[0]]).length);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 15;
  const R = A.res, T = R.tab, sem = A.cfg.ambiente === 'esteira' && !A.cfg.velEsteira;
  let y = M;
  const txt = (s, x, yy, o = {}) => { pdf.setFont('helvetica', o.b ? 'bold' : 'normal'); pdf.setFontSize(o.s || 10); pdf.setTextColor(o.c || '#1d1d1b'); pdf.text(String(s), x, yy, o.al ? { align: o.al } : undefined); };
  const linha = (yy) => { pdf.setDrawColor('#d8d5cc'); pdf.line(M, yy, W - M, yy); };
  const rodape = () => {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor('#777');
    const linhas = [
      ...pdf.splitTextToSize('Valores estimados a partir de vídeo (OpenCap); interpretar com julgamento clínico. TD = touchdown (pé toca o chão); TO = toe-off (dedos deixam o chão). Eventos: ' + R.metodo + '.', W - 2 * M - 16),
      `Ferramenta desenvolvida por ${CREDITOS.autor}${CREDITOS.doi ? ' · DOI ' + CREDITOS.doi : ''} · ${CREDITOS.repositorio.replace('https://', '')} · ORCID ${CREDITOS.orcid.replace('https://orcid.org/', '')}`,
    ];
    pdf.text(linhas, M, 289 - (linhas.length - 1) * 3);
    txt(`Página ${pdf.getNumberOfPages()}`, W - M, 288, { s: 7, c: '#777', al: 'right' });
  };

  // cabeçalho
  txt(`Relatório de análise da ${R.atividade === 'corrida' ? 'corrida' : 'marcha'}`, M, y + 5, { s: 16, b: true }); y += 12;
  const cab = [
    ['Paciente', D.paciente || '-'], ['Data', dataBR(D.data) || '-'], ['Avaliador(a)', D.avaliador || '-'],
    ['Condição', A.rotulo || A.trial.nome], ['Local', A.cfg.ambiente === 'esteira' ? `Esteira${A.cfg.velEsteira ? ' · ' + f(A.cfg.velEsteira, 1) + ' km/h' : ''}` : 'Solo'],
    ['Passadas analisadas', `${R.passadas.filter(p => !p.excluida && p.lado === 'D').length} D · ${R.passadas.filter(p => !p.excluida && p.lado === 'E').length} E`],
  ];
  cab.forEach(([k, v], i) => { const x = M + (i % 3) * 60, yy = y + Math.floor(i / 3) * 10; txt(k, x, yy, { s: 7.5, c: '#777' }); txt(v, x, yy + 4.5, { s: 10 }); });
  y += 22; linha(y); y += 7;

  // destaques
  const kp = [
    ['Velocidade', sem ? '-' : f(T.velocidade.geral.m, 2) + ' m/s'], ['Cadência', f(T.cadencia.geral.m, 0) + ' passos/min'],
    ['Passada', sem ? '-' : f(T.passada.geral.m, 2) + ' m'],
    R.atividade === 'corrida' ? ['Tempo de voo', f((T.voo?.geral.m ?? NaN) * 1000, 0) + ' ms'] : ['Duplo apoio', f(T.duplaPct?.geral.m, 0) + ' %'],
  ];
  kp.forEach(([k, v], i) => { const x = M + i * 45; txt(k, x, y, { s: 7.5, c: '#777' }); txt(v, x, y + 6, { s: 13, b: true }); });
  y += 14;

  // tabela espaço-temporal
  txt('Variáveis espaço-temporais', M, y, { s: 11, b: true }); y += 5;
  const cols = [M, M + 72, M + 102, M + 132, M + 160];
  const cabT = ['Variável', 'Direito', 'Esquerdo', 'Simetria', 'CV'];
  cabT.forEach((h, i) => txt(h, cols[i] + (i ? 26 : 0), y, { s: 8, b: true, c: i === 1 ? CORES.D : i === 2 ? CORES.E : '#555', al: i ? 'right' : undefined }));
  y += 2; linha(y); y += 4.5;
  for (const [k, rot, u, d] of VARS) {
    const v = T[k]; if (!v || k === 'velocidade' || k === 'cadencia' || !vis.vars.includes(k)) continue;
    if (sem && ['passada', 'passo'].includes(k)) continue;
    const mdp = (x) => x.m == null ? '-' : f(x.m, d) + (x.dp != null ? ' ± ' + f(x.dp, d) : '');
    const vals = [`${rot} (${u})`, mdp(v.D), mdp(v.E), v.si == null ? '-' : (v.si > 0 ? '+' : '') + f(v.si, 1) + '%', f(v.geral.cv, 1) + '%'];
    vals.forEach((s, i) => txt(s, cols[i] + (i ? 26 : 0), y, { s: 8.5, al: i ? 'right' : undefined, b: i === 3 && Math.abs(v.si ?? 0) >= 10 }));
    y += 5;
  }
  txt('Simetria = (D - E) / média(D, E) x 100; positivo = maior à direita. CV = variabilidade entre passadas.', M, y, { s: 7, c: '#777' }); y += 8;

  // pontos-chave
  const pontos = vis.pontos ? R.pontos.filter(p => vis.curvas.includes(p.curva)) : [];
  if (pontos.length) { txt('Pontos-chave das curvas (graus)', M, y, { s: 11, b: true }); y += 5;
  ['Ponto', 'Direito', 'Esquerdo', 'D - E'].forEach((h, i) => txt(h, [M, M + 128, M + 150, M + 172][i], y, { s: 8, b: true, c: i === 1 ? CORES.D : i === 2 ? CORES.E : '#555', al: i ? 'right' : undefined }));
  y += 2; linha(y); y += 4.5;
  for (const p of pontos) {
    [p.rotulo, f(p.D, 0), f(p.E, 0), p.D != null && p.E != null ? f(p.D - p.E, 0) : '-'].forEach((s, i) => txt(s, [M, M + 128, M + 150, M + 172][i], y, { s: 8.5, al: i ? 'right' : undefined }));
    y += 5;
  }
  }
  if (D.obs) {
    y += 4; txt('Observações', M, y, { s: 11, b: true }); y += 5;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor('#1d1d1b');
    const ls = pdf.splitTextToSize(D.obs, W - 2 * M); pdf.text(ls, M, y); y += ls.length * 4.6;
  }
  rodape();

  // página de curvas
  pdf.addPage(); y = M;
  txt('Ângulos ao longo do ciclo', M, y + 4, { s: 13, b: true });
  txt('Linha = média; faixa = ±1 DP; tracejado = TO (dedos deixam o chão).  Vermelho = direito; azul = esquerdo.', M, y + 10, { s: 8, c: '#666' });
  y += 15;
  const w = (W - 2 * M - 6) / 2, h = w * 300 / 520;
  for (let i = 0; i < ANG.length; i++) {
    const [c, rot] = ANG[i];
    if (i > 0 && i % 8 === 0) { rodape(); pdf.addPage(); y = M; }
    const k = i % 8;
    const shapes = ['D', 'E'].filter(l => R.rdMedio[l] != null).map(l => ({ type: 'line', x0: R.rdMedio[l], x1: R.rdMedio[l], yref: 'paper', y0: 0, y1: 1, line: { color: CORES[l], dash: 'dash', width: 1 } }));
    const img = await imagem(tracosCurva(R.curvas, c, CORES, vis.dp), rot, shapes, false, vis.setas ? setasEixo(c, '#555', 11, -0.13) : []);
    pdf.addImage(img, 'JPEG', M + (k % 2) * (w + 6), y + Math.floor(k / 2) * (h + 3), w, h);
  }
  rodape();

  // comparação
  const L = (comparacao || []).filter(x => x.res);
  if (L.length >= 2) {
    pdf.addPage(); y = M;
    txt('Comparação', M, y + 4, { s: 13, b: true }); y += 12;
    const cw = (W - 2 * M - 62) / L.length;
    txt('Variável', M, y, { s: 8, b: true });
    L.forEach((B, i) => txt(String(B.rotulo).slice(0, 18), M + 62 + cw * (i + 1), y, { s: 8, b: true, c: PALETA[i % PALETA.length], al: 'right' }));
    y += 2; linha(y); y += 4.5;
    const vs = [['velocidade', 'Velocidade (m/s)', 2], ['cadencia', 'Cadência (passos/min)', 0], ['passada', 'Passada (m)', 2], ['largura', 'Largura do passo (cm)', 1], ['apoioPct', 'Apoio (%)', 1], ['duplaPct', 'Duplo apoio (%)', 1], ['voo', 'Tempo de voo (s)', 3]];
    for (const [k, rot, d] of vs) {
      if (!L.some(B => B.res.tab[k]?.geral?.m != null)) continue;
      txt(rot, M, y, { s: 8.5 }); L.forEach((B, i) => txt(f(B.res.tab[k]?.geral?.m, d), M + 62 + cw * (i + 1), y, { s: 8.5, al: 'right' })); y += 5;
    }
    txt('Simetria do apoio (%)', M, y, { s: 8.5 }); L.forEach((B, i) => txt(f(B.res.tab.apoioPct?.si, 1), M + 62 + cw * (i + 1), y, { s: 8.5, al: 'right' })); y += 5;
    L[0].res.pontos.forEach((p, j) => {
      if (!vis.curvas.includes(p.curva) || !vis.pontos) return;
      txt(p.rotulo + ' (D/E)', M, y, { s: 8 });
      L.forEach((B, i) => txt(`${f(B.res.pontos[j].D, 0)} / ${f(B.res.pontos[j].E, 0)}`, M + 62 + cw * (i + 1), y, { s: 8.5, al: 'right' })); y += 5;
    });
    y += 4;
    txt('Curvas médias: linha cheia = direito; tracejada = esquerdo.', M, y, { s: 8, c: '#666' }); y += 3;
    for (let i = 0; i < Math.min(4, ANG.length); i++) {
      const [c, rot] = ANG[i];
      const img = await imagem(tracosComparacao(L, c), rot, [], true, vis.setas ? setasEixo(c, '#555', 11, -0.13) : []);
      const hh = w * 300 / 520;
      pdf.addImage(img, 'JPEG', M + (i % 2) * (w + 6), y + Math.floor(i / 2) * (hh + 3), w, hh);
    }
    rodape();
  }
  pdf.save(nomeArq(A, 'pdf'));
}

export function gerarExcel(A, D, comparacao) {
  const wb = XLSX.utils.book_new();
  const R = A.res, T = R.tab, t = A.trial.mot.time;
  const info = [
    ['Paciente', D.paciente], ['Data', dataBR(D.data)], ['Avaliador(a)', D.avaliador], ['Condição', A.rotulo], ['Sessão', A.sessao.nome], ['Trial', A.trial.nome],
    ['Local', A.cfg.ambiente], ['Velocidade da esteira (km/h)', A.cfg.velEsteira ?? ''], ['Atividade', R.atividade], ['Método de eventos', R.metodo],
    ['Trecho analisado (s)', A.cfg.janela ? `${f(t[A.cfg.janela[0]], 2)} a ${f(t[A.cfg.janela[1]], 2)}` : 'trial inteiro'], ['Observações', D.obs], [],
    ['Variável', 'Unidade', 'Direito média', 'Direito DP', 'Direito n', 'Esquerdo média', 'Esquerdo DP', 'Esquerdo n', 'Simetria %', 'Geral média', 'Geral DP', 'CV %'],
  ];
  for (const [k, rot, u] of VARS) {
    const v = T[k]; if (!v) continue;
    info.push([rot, u, v.D?.m ?? '', v.D?.dp ?? '', v.D?.n ?? '', v.E?.m ?? '', v.E?.dp ?? '', v.E?.n ?? '', v.si ?? '', v.geral?.m ?? '', v.geral?.dp ?? '', v.geral?.cv ?? '']);
  }
  info.push([], ['Ponto-chave (graus)', '', 'Direito', '', '', 'Esquerdo']);
  R.pontos.forEach(p => info.push([p.rotulo, '', p.D ?? '', '', '', p.E ?? '']));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Resumo');

  const ps = [['Passada', 'Lado', 'Usada', 'Suspeita', 'Início (s)', 'Duração (s)', 'Apoio (s)', 'Apoio %', 'Balanço (s)', 'Tempo do passo (s)', 'Duplo apoio %', 'Voo (s)', 'Passada (m)', 'Passo (m)', 'Largura (cm)']];
  R.passadas.forEach(p => ps.push([p.id, p.lado, p.excluida ? 'não' : 'sim', p.suspeita ? 'sim' : '', p.t0, p.duracao, p.apoio ?? '', p.apoioPct ?? '', p.balanco ?? '', p.passoT ?? '', p.duplaPct ?? '', p.voo ?? '', p.passada ?? '', p.passo ?? '', p.largura != null ? p.largura * 100 : '']));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ps), 'Passadas');

  const ev = [['Evento', 'Lado', 'Quadro', 'Tempo (s)']];
  for (const [k, nome, lado] of [['CI_D', 'TD (touchdown: pé toca o chão)', 'D'], ['RD_D', 'TO (toe-off: dedos deixam o chão)', 'D'], ['CI_E', 'TD (touchdown: pé toca o chão)', 'E'], ['RD_E', 'TO (toe-off: dedos deixam o chão)', 'E']])
    A.eventos[k].forEach(i => ev.push([nome, lado, i, t[i]]));
  ev.splice(1, ev.length - 1, ...ev.slice(1).sort((a, b) => a[3] - b[3]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ev), 'Eventos');

  const head = ['% ciclo']; const colsC = [];
  for (const [c] of ANGULOS) for (const l of ['D', 'E']) if (R.curvas[c]?.[l]) { head.push(`${c}_${l}_media`, `${c}_${l}_dp`); colsC.push([c, l]); }
  const cm = [head];
  for (let k = 0; k <= 100; k++) { const row = [k]; colsC.forEach(([c, l]) => row.push(R.curvas[c][l].m[k], R.curvas[c][l].s[k])); cm.push(row); }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cm), 'Curvas_media');

  const usadas = R.passadas.filter(p => !p.excluida);
  const cp = [['% ciclo', ...ANGULOS.flatMap(([c]) => usadas.map(p => `${c}_${p.id}`))]];
  for (let k = 0; k <= 100; k++) cp.push([k, ...ANGULOS.flatMap(([c]) => usadas.map(p => p.curvas[c]?.[k] ?? ''))]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cp), 'Curvas_passadas');

  const L = (comparacao || []).filter(x => x.res);
  if (L.length >= 2) {
    const cc = [['Variável', ...L.map(B => B.rotulo)]];
    for (const [k, rot, u] of VARS) if (L.some(B => B.res.tab[k]?.geral?.m != null)) cc.push([`${rot} (${u})`, ...L.map(B => B.res.tab[k]?.geral?.m ?? '')]);
    cc.push(['Simetria do apoio (%)', ...L.map(B => B.res.tab.apoioPct?.si ?? '')]);
    L[0].res.pontos.forEach((p, j) => { cc.push([p.rotulo + ' D', ...L.map(B => B.res.pontos[j].D ?? '')]); cc.push([p.rotulo + ' E', ...L.map(B => B.res.pontos[j].E ?? '')]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cc), 'Comparacao');
  }
  XLSX.writeFile(wb, nomeArq(A, 'xlsx'));
}
