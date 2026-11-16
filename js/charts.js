export const PALETA = ['#1f5fd6', '#d2603a', '#2c9a5a', '#8a4fd1', '#b08a00', '#d23a8a'];

export function tracosCurva(curvas, c, cores) {
  const x = [...Array(101).keys()], tr = [];
  for (const l of ['D', 'E']) {
    const cv = curvas[c]?.[l]; if (!cv) continue;
    const m = Array.from(cv.m), s = Array.from(cv.s);
    tr.push({ x: [...x, ...x.slice().reverse()], y: [...m.map((v, i) => v + s[i]), ...m.map((v, i) => v - s[i]).reverse()], fill: 'toself', fillcolor: hexA(cores[l], 0.15), line: { width: 0 }, hoverinfo: 'skip', showlegend: false });
    tr.push({ x, y: m, name: l === 'D' ? 'Direito' : 'Esquerdo', line: { color: cores[l], width: 2 }, hovertemplate: '%{x}%: %{y:.1f}°<extra>' + l + '</extra>' });
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

export function hexA(c, a) {
  const m = c.match(/^#([0-9a-f]{6})$/i);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
