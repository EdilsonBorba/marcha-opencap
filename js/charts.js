import { ANGULOS, VARS } from './gait.js';

// Linhas da tabela de comparação, seguindo as escolhas de "O que mostrar" (mesmas variáveis e pontos-chave da análise).
// fmt(valor, casas) formata; devolve [{ rotulo, valores: [texto por trial] }]
export function linhasComparacao(L, vis, fmt) {
  const out = [];
  for (const [k, rot, u, d] of VARS) {
    if (!vis.vars.includes(k)) continue;
    const tem = L.some(A => A.res.tab[k]?.geral?.m != null);
    if (!tem) continue;
    const porLado = !['velocidade', 'cadencia'].includes(k);
    out.push({ rotulo: `${rot} (${u})${porLado ? ' · D / E' : ''}`, valores: L.map(A => {
      const v = A.res.tab[k]; if (!v) return '–';
      return porLado && v.D?.m != null && v.E?.m != null ? `${fmt(v.D.m, d)} / ${fmt(v.E.m, d)}` : fmt(v.geral?.m, d);
    }) });
    if (porLado && L.some(A => A.res.tab[k]?.si != null) && ['apoioPct', 'apoio', 'passo', 'passoT'].includes(k))
      out.push({ rotulo: `  simetria (%)`, valores: L.map(A => fmt(A.res.tab[k]?.si, 1)) });
  }
  if (vis.pontos) L[0].res.pontos.forEach((p, j) => {
    if (!vis.curvas.includes(p.curva)) return;
    out.push({ rotulo: `${p.rotulo} · D / E`, valores: L.map(A => `${fmt(A.res.pontos[j]?.D, 0)} / ${fmt(A.res.pontos[j]?.E, 0)}`) });
  });
  return out;
}
export const PALETA = ['#1f5fd6', '#d2603a', '#2c9a5a', '#8a4fd1', '#b08a00', '#d23a8a'];
export const infoAngulo = (c) => ANGULOS.find(a => a[0] === c);

export function tracosCurva(curvas, c, cores, comDP = true, faixa = null, opFaixa = 0.22) {
  const x = [...Array(101).keys()], tr = [];
  const fn = faixa?.curvas?.[c];
  if (fn) {
    const sup = fn.m.map((v, i) => v + fn.s[i]), inf = fn.m.map((v, i) => v - fn.s[i]);
    tr.push({ x: [...x, ...x.slice().reverse()], y: [...sup, ...inf.reverse()], fill: 'toself', fillcolor: `rgba(128,128,128,${opFaixa})`, line: { width: 0 }, hoverinfo: 'skip', name: 'Normal', showlegend: false });
    tr.push({ x, y: fn.m, line: { color: 'rgba(128,128,128,0.9)', width: 1, dash: 'dot' }, name: 'Normal', hovertemplate: '%{x}%: %{y:.1f} (normal)<extra></extra>', showlegend: false });
  }
  for (const l of ['D', 'E']) {
    const cv = curvas[c]?.[l]; if (!cv) continue;
    const m = Array.from(cv.m), s = Array.from(cv.s);
    if (comDP) tr.push({ x: [...x, ...x.slice().reverse()], y: [...m.map((v, i) => v + s[i]), ...m.map((v, i) => v - s[i]).reverse()], fill: 'toself', fillcolor: hexA(cores[l], 0.15), line: { width: 0 }, hoverinfo: 'skip', showlegend: false });
    tr.push({ x, y: m, name: l === 'D' ? 'Direito' : 'Esquerdo', line: { color: cores[l], width: 2 }, hovertemplate: '%{x}%: %{y:.1f}' + (c.startsWith('com_') ? ' cm' : '°') + '<extra>' + l + '</extra>' });
  }
  return tr;
}

export function tracosComparacao(L, c) {
  const x = [...Array(101).keys()], tr = [];
  L.forEach((A, i) => {
    for (const l of ['D', 'E']) {
      const cv = A.res.curvas[c]?.[l]; if (!cv) continue;
      tr.push({ x, y: Array.from(cv.m), name: `${A.rotulo} ${l}`, line: { color: PALETA[i % PALETA.length], width: 2, dash: l === 'E' ? 'dash' : 'solid' } });
    }
  });
  return tr;
}

// Setas de sentido ao lado do eixo y, como no artigo: seta para cima = sentido positivo.
// px: distância (pixels) da seta à esquerda do eixo; o nome fica logo à esquerda da seta.
export function setasEixo(c, cor = '#666', tam = 10, px = 46) {
  const a = infoAngulo(c); if (!a) return [];
  const seta = (y, ay) => ({ xref: 'paper', yref: 'paper', x: 0, y, xshift: -px, ax: 0, ay, text: '', showarrow: true, arrowhead: 2, arrowsize: 1, arrowwidth: 1.3, arrowcolor: cor });
  const rot = (y, txt, anc) => ({ xref: 'paper', yref: 'paper', x: 0, y, xshift: -px - tam * 0.9, xanchor: 'center', yanchor: anc, text: txt, textangle: -90, showarrow: false, font: { size: tam, color: cor } });
  return [seta(1, 34), seta(0, -34), rot(0.97, a[2], 'top'), rot(0.03, a[3], 'bottom')];
}

export function hexA(c, a) {
  const m = c.match(/^#([0-9a-f]{6})$/i);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
