// Esqueleto de linhas a partir dos marcadores do .trc (vista de lado, de frente ou de cima).
const SEG = [
  ['Neck', 'midHip', 'c'], ['RShoulder', 'LShoulder', 'c'], ['Neck', 'RShoulder', 'D'], ['Neck', 'LShoulder', 'E'],
  ['RShoulder', 'RElbow', 'D'], ['RElbow', 'RWrist', 'D'], ['LShoulder', 'LElbow', 'E'], ['LElbow', 'LWrist', 'E'],
  ['RHip', 'LHip', 'c'], ['midHip', 'RHip', 'D'], ['midHip', 'LHip', 'E'],
  ['RHip', 'Rjoelho', 'D'], ['Rjoelho', 'Rtorn', 'D'], ['Rtorn', 'r_calc_study', 'D'], ['r_calc_study', 'r_toe_study', 'D'], ['Rtorn', 'r_toe_study', 'D'],
  ['LHip', 'Ljoelho', 'E'], ['Ljoelho', 'Ltorn', 'E'], ['Ltorn', 'L_calc_study', 'E'], ['L_calc_study', 'L_toe_study', 'E'], ['Ltorn', 'L_toe_study', 'E'],
];

function ponto(trc, nome, i) {
  const m = trc.markers;
  const med = (a, b) => (m[a] && m[b]) ? [(m[a].x[i] + m[b].x[i]) / 2, (m[a].y[i] + m[b].y[i]) / 2, (m[a].z[i] + m[b].z[i]) / 2] : null;
  if (nome === 'Rjoelho') return med('r_knee_study', 'r_mknee_study') || (m.RKnee && [m.RKnee.x[i], m.RKnee.y[i], m.RKnee.z[i]]);
  if (nome === 'Ljoelho') return med('L_knee_study', 'L_mknee_study') || (m.LKnee && [m.LKnee.x[i], m.LKnee.y[i], m.LKnee.z[i]]);
  if (nome === 'Rtorn') return med('r_ankle_study', 'r_mankle_study') || (m.RAnkle && [m.RAnkle.x[i], m.RAnkle.y[i], m.RAnkle.z[i]]);
  if (nome === 'Ltorn') return med('L_ankle_study', 'L_mankle_study') || (m.LAnkle && [m.LAnkle.x[i], m.LAnkle.y[i], m.LAnkle.z[i]]);
  const k = m[nome]; return k ? [k.x[i], k.y[i], k.z[i]] : null;
}

// emApoio: { D: bool, E: bool } para destacar o pé apoiado
export function desenharEsqueleto(canvas, trc, i, vista, dir, emApoio, cores) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  if (!trc) return;
  const ap = (p) => p[0] * dir.x + p[2] * dir.z, ml = (p) => -p[0] * dir.z + p[2] * dir.x;
  // referência: centro da pelve no quadro atual (horizontal) e chão (vertical)
  const pel = ponto(trc, 'midHip', i) || [0, 1, 0];
  let chao = Infinity;
  for (const nm of ['r_calc_study', 'L_calc_study', 'r_toe_study', 'L_toe_study']) { const m = trc.markers[nm]; if (m) for (let k = 0; k < m.y.length; k += 5) chao = Math.min(chao, m.y[k]); }
  const esc = h / 2.15;
  const proj = (p) => {
    if (vista === 'cima') return [w / 2 + (ap(p) - ap(pel)) * esc * 1.3, h / 2 + (ml(p) - ml(pel)) * esc * 1.3];
    const horiz = vista === 'frontal' ? -(ml(p) - ml(pel)) : (ap(p) - ap(pel));
    return [w / 2 + horiz * esc, h - 18 - (p[1] - chao) * esc];
  };
  // chão
  g.strokeStyle = cores.linha; g.lineWidth = 1;
  if (vista !== 'cima') { g.beginPath(); g.moveTo(8, h - 18); g.lineTo(w - 8, h - 18); g.stroke(); }
  // na vista lateral, desenha primeiro o lado mais distante
  const ordem = vista === 'lateral' ? [...SEG].sort((a, b) => (a[2] === 'E' ? -1 : 0) - (b[2] === 'E' ? -1 : 0)) : SEG;
  for (const [a, b, l] of ordem) {
    const pa = ponto(trc, a, i), pb = ponto(trc, b, i);
    if (!pa || !pb) continue;
    const [x1, y1] = proj(pa), [x2, y2] = proj(pb);
    const pe = /calc|toe|torn/.test(a + b);
    g.strokeStyle = l === 'D' ? cores.d : l === 'E' ? cores.e : cores.fg;
    g.lineWidth = pe && emApoio[l] ? 6 : 3.2;
    g.globalAlpha = vista === 'lateral' && l === 'E' ? 0.75 : 1;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  g.globalAlpha = 1;
  // legenda do apoio
  g.font = '12px -apple-system,system-ui,sans-serif';
  g.fillStyle = cores.d; g.fillText(emApoio.D ? 'D apoiado' : 'D no ar', 10, 18);
  g.fillStyle = cores.e; g.fillText(emApoio.E ? 'E apoiado' : 'E no ar', 10, 34);
}
