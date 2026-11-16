import { ANGULOS } from './gait.js';
export const PALETA = ['#1f5fd6', '#d2603a', '#2c9a5a', '#8a4fd1', '#b08a00', '#d23a8a'];
export const infoAngulo = (c) => ANGULOS.find(a => a[0] === c);

export function tracosCurva(curvas, c, cores, comDP = true) {
  const x = [...Array(101).keys()], tr = [];
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
// xr: posição horizontal em fração do gráfico (negativa = à esquerda do eixo)
export function setasEixo(c, cor = '#666', tam = 10, xr = -0.1) {
  const a = infoAngulo(c); if (!a) return [];
  const seta = (y, ay) => ({ xref: 'paper', yref: 'paper', x: xr, y, ax: 0, ay, text: '', showarrow: true, arrowhead: 2, arrowsize: 1, arrowwidth: 1.3, arrowcolor: cor });
  const rot = (y, txt, anc) => ({ xref: 'paper', yref: 'paper', x: xr - 0.035, y, xanchor: 'center', yanchor: anc, text: txt, textangle: -90, showarrow: false, font: { size: tam, color: cor } });
  return [seta(1, 34), seta(0, -34), rot(0.97, a[2], 'top'), rot(0.03, a[3], 'bottom')];
}

export function hexA(c, a) {
  const m = c.match(/^#([0-9a-f]{6})$/i);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
