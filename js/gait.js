// Eventos e variáveis da marcha/corrida a partir dos marcadores e da cinemática do OpenCap.

// ---------- sinal ----------
export function filtfilt(x, fc, fs) {
  if (!(fc > 0) || fc >= fs / 2) return Float64Array.from(x);
  const w = Math.tan(Math.PI * fc / fs), k = Math.SQRT2, n = 1 / (1 + k * w + w * w);
  const b0 = w * w * n, b1 = 2 * b0, b2 = b0, a1 = 2 * (w * w - 1) * n, a2 = (1 - k * w + w * w) * n;
  const pad = Math.min(60, x.length - 1);
  const ext = [];
  for (let i = pad; i > 0; i--) ext.push(2 * x[0] - x[i]);
  for (let i = 0; i < x.length; i++) ext.push(x[i]);
  for (let i = 1; i <= pad; i++) ext.push(2 * x[x.length - 1] - x[x.length - 1 - i]);
  const run = (s) => {
    const y = new Float64Array(s.length);
    let x1 = s[0], x2 = s[0], y1 = s[0], y2 = s[0];
    for (let i = 0; i < s.length; i++) {
      const v = b0 * s[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = s[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  };
  let y = run(ext); y.reverse(); y = run(y); y.reverse();
  return y.slice(pad, pad + x.length);
}

const media = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const dp = (a) => { if (a.length < 2) return NaN; const m = media(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
export { media, dp };

function picos(sig, distMin, limiar) {
  const cand = [];
  for (let i = 1; i < sig.length - 1; i++) if (sig[i] >= sig[i - 1] && sig[i] > sig[i + 1] && sig[i] > limiar) cand.push(i);
  cand.sort((a, b) => sig[b] - sig[a]);
  const ok = [];
  for (const c of cand) if (ok.every(o => Math.abs(o - c) >= distMin)) ok.push(c);
  return ok.sort((a, b) => a - b);
}

function periodo(sig, fs) {
  const m = media(sig), s = sig.map(v => v - m);
  const lo = Math.round(0.35 * fs), hi = Math.min(Math.round(2.5 * fs), s.length - 2);
  const ac = [];
  for (let lag = lo; lag <= hi; lag++) { let a = 0; for (let i = 0; i + lag < s.length; i++) a += s[i] * s[i + lag]; ac.push(a / (s.length - lag)); }
  const max = Math.max(...ac);
  for (let i = 1; i < ac.length - 1; i++) if (ac[i] > ac[i - 1] && ac[i] >= ac[i + 1] && ac[i] > 0.5 * max) return (i + lo) / fs;
  return (ac.indexOf(max) + lo) / fs;
}

// ---------- geometria ----------
function mk(trc, ...nomes) { for (const n of nomes) if (trc.markers[n]) return trc.markers[n]; return null; }

export function marcadoresPe(trc) {
  const calcR = mk(trc, 'r_calc_study', 'RHeel'), calcL = mk(trc, 'L_calc_study', 'LHeel');
  const toeR = mk(trc, 'r_toe_study', 'RBigToe'), toeL = mk(trc, 'L_toe_study', 'LBigToe');
  const psR = mk(trc, 'r.PSIS_study'), psL = mk(trc, 'L.PSIS_study'), mid = mk(trc, 'midHip');
  if (!calcR || !calcL || !toeR || !toeL) throw new Error('Faltam marcadores do pé (calcâneo/dedos) no .trc.');
  const n = trc.time.length;
  const sac = { x: new Float64Array(n), z: new Float64Array(n) };
  for (let i = 0; i < n; i++) {
    sac.x[i] = psR && psL ? (psR.x[i] + psL.x[i]) / 2 : mid.x[i];
    sac.z[i] = psR && psL ? (psR.z[i] + psL.z[i]) / 2 : mid.z[i];
  }
  return { calcR, calcL, toeR, toeL, sac };
}

// Direção de progressão no plano horizontal (x,z do OpenCap; y é vertical).
export function direcao(trc, ambiente) {
  const { calcR, calcL, toeR, toeL, sac } = marcadoresPe(trc);
  const n = trc.time.length;
  const dx = sac.x[n - 1] - sac.x[0], dz = sac.z[n - 1] - sac.z[0];
  const desl = Math.hypot(dx, dz);
  if (ambiente === 'solo' && desl > 0.5) return { x: dx / desl, z: dz / desl, deslocamento: desl };
  // esteira (ou solo sem deslocamento): para onde os pés apontam
  let fx = 0, fz = 0;
  for (let i = 0; i < n; i++) { fx += toeR.x[i] - calcR.x[i] + toeL.x[i] - calcL.x[i]; fz += toeR.z[i] - calcR.z[i] + toeL.z[i] - calcL.z[i]; }
  const f = Math.hypot(fx, fz);
  return { x: fx / f, z: fz / f, deslocamento: desl };
}

// regularidade do sinal: autocorrelação normalizada no período (1 = ciclos idênticos)
function regularidade(sig, fs, T) {
  const m = media(sig), s = sig.map(v => v - m), lag = Math.round(T * fs);
  let a = 0, b = 0;
  for (let i = 0; i + lag < s.length; i++) { a += s[i] * s[i + lag]; b += s[i] * s[i]; }
  return b > 0 ? a / b : 0;
}

// ---------- eventos ----------
// Marcha: Zeni et al. (2008) — CI = calcâneo mais à frente do sacro; RD = dedos mais atrás do sacro.
// Corrida: CI por Zeni; RD = pico de extensão do joelho (Fellin et al., 2010).
// Plano do chão/esteira: ajusta y = a + b·u + c·v (u = ântero-posterior, v = médio-lateral) nos pontos
// em que os pés estão apoiados (20 % mais baixos de cada marcador). Funciona com esteira inclinada e
// com o chão do OpenCap levemente torto. Devolve a altura de um marcador acima desse plano.
export function planoChao(trc, d, inclPct = null) {
  const P = marcadoresPe(trc);
  const mks = [P.calcR, P.calcL, P.toeR, P.toeL];
  const rows = [];
  for (const m of mks) {
    const ys = Array.from(m.y).sort((a, b) => a - b), lim = ys[Math.floor(0.2 * ys.length)];
    for (let i = 0; i < m.y.length; i++) if (m.y[i] <= lim) {
      const u = m.x[i] * d.x + m.z[i] * d.z, v = -m.x[i] * d.z + m.z[i] * d.x;
      rows.push([1, u, v, m.y[i]]);
    }
  }
  // mínimos quadrados 3×3
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bb = [0, 0, 0];
  for (const r of rows) for (let i = 0; i < 3; i++) { bb[i] += r[i] * r[3]; for (let j = 0; j < 3; j++) A[i][j] += r[i] * r[j]; }
  const det = (M) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  const D = det(A), coef = [0, 1, 2].map(k => det(A.map((row, i) => row.map((v, j) => j === k ? bb[i] : v))) / D);
  let [a, b, c] = coef;
  if (inclPct != null && isFinite(inclPct)) {
    // inclinação informada (% de rampa = tangente × 100): fixa a inclinação e ajusta só a altura do plano
    b = inclPct / 100; c = 0;
    const res = rows.map(r => r[3] - b * r[1]).sort((x, y) => x - y);
    a = res[Math.floor(res.length / 2)];
  }
  const altura = (m) => Float64Array.from(m.y, (y, i) => y - (a + b * (m.x[i] * d.x + m.z[i] * d.z) + c * (-m.x[i] * d.z + m.z[i] * d.x)));
  return { altura, inclinacao: Math.atan(b) * 180 / Math.PI, inclLateral: Math.atan(c) * 180 / Math.PI, informada: inclPct != null && isFinite(inclPct) };
}

// metodo: 'zeni' | 'patoz' | 'vertical' | undefined (automático: marcha → zeni; corrida → patoz)
export function detectarEventos(trc, mot, ambiente, atividade, metodoEscolhido, inclPct = null) {
  const fs = trc.rate || 1 / (trc.time[1] - trc.time[0]);
  const P = marcadoresPe(trc), d = direcao(trc, ambiente);
  const proj = (m) => Float64Array.from(m.x, (_, i) => (m.x[i] - P.sac.x[i]) * d.x + (m.z[i] - P.sac.z[i]) * d.z);
  const sinais = {
    calcR: filtfilt(proj(P.calcR), 6, fs), calcL: filtfilt(proj(P.calcL), 6, fs),
    toeR: filtfilt(proj(P.toeR), 6, fs), toeL: filtfilt(proj(P.toeL), 6, fs),
  };
  const T = periodo(sinais.calcR, fs);
  const dist = Math.max(3, Math.round(0.6 * T * fs));
  const ev = { CI_D: picos(sinais.calcR, dist, media(sinais.calcR)), CI_E: picos(sinais.calcL, dist, media(sinais.calcL)),
    RD_D: picos(sinais.toeR.map(v => -v), dist, -media(sinais.toeR)), RD_E: picos(sinais.toeL.map(v => -v), dist, -media(sinais.toeL)) };
  const cadencia = 120 / T;
  const ativ = atividade || (cadencia >= 140 ? 'corrida' : 'marcha');
  const qualidade = Math.min(regularidade(sinais.calcR, fs, T), regularidade(sinais.calcL, fs, T));
  const chao = planoChao(trc, d, inclPct);
  const base = { sinais, fs, periodo: T, dir: d, atividade: ativ, qualidade, inclinacao: chao.inclinacao, inclLateral: chao.inclLateral, inclInformada: chao.informada };
  const metodo = metodoEscolhido || (ativ === 'corrida' ? 'patoz' : 'zeni');
  base.metodoId = metodo;
  if (metodo === 'patoz') {
    // Patoz et al. (2021), corrida em esteira:
    // ponto médio dos dedos = média entre 1º e 5º metatarsos, altura reescalada (− mínimo global).
    // CI = primeiro máximo entre os picos de aceleração vertical do calcâneo e do meio dos dedos,
    //      numa janela de 120 ms centrada no instante em que o meio dos dedos desce a 3,5 cm.
    // RD = meio dos dedos sobe a 3,5 cm depois do CI (se não houver, tenta 4 e 4,5 cm).
    const meta5 = { R: mk(trc, 'r_5meta_study'), L: mk(trc, 'L_5meta_study') };
    const half = Math.max(1, Math.round(0.06 * fs));
    for (const [ci, rd, calc, toe, m5] of [['CI_D', 'RD_D', P.calcR, P.toeR, meta5.R], ['CI_E', 'RD_E', P.calcL, P.toeL, meta5.L]]) {
      const n = calc.y.length;
      const ht = chao.altura(toe), h5 = m5 ? chao.altura(m5) : ht, hc = chao.altura(calc);
      let mt = Float64Array.from(ht, (v, i) => (v + h5[i]) / 2);
      // "mínimo global" robusto: mediana dos mínimos de cada passada (o OpenCap oscila alguns mm entre passos)
      const mins = picos(mt.map(v => -v), Math.round(0.6 * T * fs), -Infinity).map(i => mt[i]).sort((x, y) => x - y);
      const piso = mins.length ? mins[Math.floor(mins.length / 2)] : Math.min(...mt);
      mt = mt.map(v => v - piso);
      const acc = (y) => y.map((_, i) => (i === 0 || i === n - 1) ? 0 : (y[i + 1] - 2 * y[i] + y[i - 1]) * fs * fs);
      const ah = acc(hc), am = acc(mt);
      const cis = [], rds = [];
      const distMin = Math.round(0.6 * T * fs);
      for (let i = 1; i < n; i++) {
        if (!(mt[i - 1] > 0.035 && mt[i] <= 0.035)) continue;           // desce a 3,5 cm
        if (cis.length && i - cis[cis.length - 1] < distMin) continue;
        const a0 = Math.max(1, i - half), a1 = Math.min(n - 2, i + half);
        let ph = a0, pm = a0;
        for (let k = a0; k <= a1; k++) { if (ah[k] > ah[ph]) ph = k; if (am[k] > am[pm]) pm = k; }
        cis.push(Math.min(ph, pm));
      }
      for (let j = 0; j < cis.length; j++) {
        const fim = j + 1 < cis.length ? cis[j + 1] : n - 1;
        let achou = null;
        for (const lim of [0.035, 0.04, 0.045]) {
          for (let k = cis[j] + 1; k < fim; k++) if (mt[k - 1] < lim && mt[k] >= lim) { achou = k; break; }
          if (achou != null) break;
        }
        if (achou != null) rds.push(achou);
      }
      ev[ci] = cis; ev[rd] = rds;
    }
    return { ...base, eventos: ev, metodo: 'Patoz et al. (2021): aceleração vertical do calcâneo e do meio dos dedos; RD pela altura dos dedos' };
  }
  if (metodo === 'vertical') {
    // Velocidade vertical (Leitch et al., 2011): CI = vel. vertical do calcâneo cruza de negativa para positiva
    // junto ao ponto mais baixo; RD = dedos começam a subir (vel. vertical > 20 % do pico de subida do ciclo).
    for (const [ci, rd, calc, toe] of [['CI_D', 'RD_D', P.calcR, P.toeR], ['CI_E', 'RD_E', P.calcL, P.toeL]]) {
      const hy = filtfilt(chao.altura(calc), 8, fs), ty = filtfilt(chao.altura(toe), 8, fs);
      const vh = hy.map((_, i) => (hy[Math.min(i + 1, hy.length - 1)] - hy[Math.max(i - 1, 0)]) * fs / 2);
      const vt = ty.map((_, i) => (ty[Math.min(i + 1, ty.length - 1)] - ty[Math.max(i - 1, 0)]) * fs / 2);
      const lo = Math.min(...hy), hi = Math.max(...hy), limiar = lo + 0.35 * (hi - lo);
      const mins = picos(hy.map(v => -v), dist, -limiar);
      const cis = mins.map(p => { for (let i = Math.max(1, p - 10); i < Math.min(vh.length - 1, p + 5); i++) if (vh[i] <= 0 && vh[i + 1] > 0) return i; return p; });
      const rds = [];
      for (let j = 0; j + 1 < cis.length; j++) {
        const a = cis[j], b = cis[j + 1], i0 = a + Math.round(0.1 * (b - a));
        let pk = 0; for (let i = i0; i < b; i++) pk = Math.max(pk, vt[i]);
        for (let i = i0; i < b; i++) if (vt[i] > 0.2 * pk) { rds.push(i); break; }
      }
      ev[ci] = cis; ev[rd] = rds;
    }
    return { ...base, eventos: ev, metodo: 'Velocidade vertical do calcâneo e dos dedos (Leitch et al., 2011)' };
  }
  if (ativ === 'corrida' && mot?.cols.knee_angle_r) {
    for (const [ci, rd, col] of [['CI_D', 'RD_D', 'knee_angle_r'], ['CI_E', 'RD_E', 'knee_angle_l']]) {
      const k = mot.cols[col], out = [];
      for (let j = 0; j + 1 < ev[ci].length; j++) {
        const a = ev[ci][j], b = ev[ci][j + 1];
        const i0 = a + Math.round(0.1 * (b - a)), i1 = b - Math.round(0.25 * (b - a));
        let m = i0; for (let i = i0; i <= i1; i++) if (k[i] < k[m]) m = i;
        out.push(m);
      }
      ev[rd] = out;
    }
  }
  return { ...base, eventos: ev,
    metodo: ativ === 'corrida' ? 'CI: Zeni et al. (2008); RD: pico de extensão do joelho (Fellin et al., 2010)' : 'Zeni et al. (2008)' };
}

// ---------- variáveis ----------
// [coluna, título, sentido positivo, sentido negativo, opções]
// global: coordenada única (pelve/tronco); espelhaE: inverte o sinal nas passadas esquerdas para que
// os dois lados tenham o mesmo significado; inverte: troca o sinal do OpenSim (convenção clínica).
export const ANGULOS = [
  ['hip_flexion', 'Quadril · flexão / extensão', 'Flexão', 'Extensão', {}],
  ['knee_angle', 'Joelho · flexão / extensão', 'Flexão', 'Extensão', {}],
  ['ankle_angle', 'Tornozelo · dorsi / plantiflexão', 'Dorsiflexão', 'Plantiflexão', {}],
  ['hip_adduction', 'Quadril · adução / abdução', 'Adução', 'Abdução', {}],
  ['hip_rotation', 'Quadril · rotação', 'Interna', 'Externa', {}],
  ['pelvis_tilt', 'Pelve · inclinação ântero-posterior', 'Anteversão', 'Retroversão', { global: true, inverte: true }],
  ['pelvis_list', 'Pelve · obliquidade (lado = membro do ciclo)', 'Lado desce', 'Lado sobe', { global: true, espelhaE: true }],
  ['pelvis_rotation', 'Pelve · rotação (lado = membro do ciclo)', 'Lado à frente', 'Lado atrás', { global: true, espelhaE: true }],
  ['lumbar_extension', 'Tronco · extensão / flexão (em relação à pelve)', 'Extensão', 'Flexão', { global: true }],
  ['lumbar_bending', 'Tronco · inclinação lateral (em relação à pelve)', 'Para o lado', 'Lado oposto', { global: true, espelhaE: true }],
];
export const PREDEF = {
  marcha: { nome: 'Marcha clínica', curvas: ['hip_flexion', 'knee_angle', 'ankle_angle', 'hip_adduction'] },
  corrida: { nome: 'Corrida', curvas: ['hip_flexion', 'knee_angle', 'ankle_angle', 'hip_adduction', 'hip_rotation', 'pelvis_list'] },
  completo: { nome: 'Completo', curvas: ANGULOS.map(a => a[0]) },
};

function interp101(t, y, t0, t1) {
  const out = new Float64Array(101);
  let j = 0;
  for (let k = 0; k <= 100; k++) {
    const tk = t0 + (t1 - t0) * k / 100;
    while (j < t.length - 2 && t[j + 1] < tk) j++;
    const f = (tk - t[j]) / (t[j + 1] - t[j]);
    out[k] = y[j] + Math.max(0, Math.min(1, f)) * (y[j + 1] - y[j]);
  }
  return out;
}

// cfg: { ambiente:'solo'|'esteira', velEsteira (km/h), atividade:'marcha'|'corrida', janela:[i0,i1], excluidos:Set('D:3') }
export function analisar(trial, ev, cfg) {
  const t = trial.mot.time, fs = 1 / (t[1] - t[0]);
  const [i0, i1] = cfg.janela || [0, t.length - 1];
  const dentro = (i) => i >= i0 && i <= i1;
  const E = {}; for (const k in ev) E[k] = ev[k].filter(dentro);
  const P = trial.trc ? marcadoresPe(trial.trc) : null;
  const d = trial.trc ? direcao(trial.trc, cfg.ambiente) : null;
  const vEst = cfg.ambiente === 'esteira' ? (cfg.velEsteira || 0) / 3.6 : null;
  const lados = { D: { ci: E.CI_D, rd: E.RD_D, oci: E.CI_E, ord: E.RD_E, calc: P?.calcR, ocalc: P?.calcL, s: '_r' },
                  E: { ci: E.CI_E, rd: E.RD_E, oci: E.CI_D, ord: E.RD_D, calc: P?.calcL, ocalc: P?.calcR, s: '_l' } };
  const passadas = [];
  for (const lado of ['D', 'E']) {
    const L = lados[lado];
    for (let k = 0; k + 1 < L.ci.length; k++) {
      const a = L.ci[k], b = L.ci[k + 1];
      const rd = L.rd.find(i => i > a && i < b);
      const oci = L.oci.find(i => i > a && i < b);
      const ord = L.ord.find(i => i > a && i < (oci ?? b));
      const ociAnt = [...L.oci].reverse().find(i => i < a);
      const dur = t[b] - t[a];
      const p = { lado, n: k + 1, id: `${lado}:${k + 1}`, ini: a, fim: b, rd, oci, ord,
        t0: t[a], duracao: dur, apoio: rd != null ? t[rd] - t[a] : null };
      p.balanco = p.apoio != null ? dur - p.apoio : null;
      p.apoioPct = p.apoio != null ? 100 * p.apoio / dur : null;
      p.rdPct = p.apoioPct;
      p.passoT = ociAnt != null ? t[a] - t[ociAnt] : null;               // passo que termina neste CI
      if (cfg.atividade === 'corrida') {
        p.voo = rd != null && oci != null && oci > rd ? t[oci] - t[rd] : 0;
      } else {
        p.dupla1 = ord != null ? t[ord] - t[a] : null;                     // CI -> RD contralateral
        p.dupla2 = oci != null && rd != null && rd > oci ? t[rd] - t[oci] : null; // CI contralateral -> RD
        p.duplaPct = p.dupla1 != null && p.dupla2 != null ? 100 * (p.dupla1 + p.dupla2) / dur : null;
      }
      // comprimentos e largura
      if (vEst != null) {
        p.passada = vEst * dur;
        p.passo = p.passoT != null ? vEst * p.passoT : null;
      } else if (P) {
        const pos = (m, i) => m.x[i] * d.x + m.z[i] * d.z;
        p.passada = Math.abs(pos(L.calc, b) - pos(L.calc, a));
        p.passo = ociAnt != null ? Math.abs(pos(L.calc, a) - pos(L.ocalc, a)) : null;
        p.velocidade = p.passada / dur;
      }
      if (P) {
        const lat = (m, i) => -m.x[i] * d.z + m.z[i] * d.x;
        p.largura = ociAnt != null ? Math.abs(lat(L.calc, a) - lat(L.ocalc, ociAnt)) : null; // cada calcâneo no seu próprio contato
      }
      // curvas normalizadas
      p.curvas = {};
      for (const [c, , , , o] of ANGULOS) {
        const col = o.global ? c : c + L.s;
        if (!trial.mot.cols[col]) continue;
        let y = trial.mot.cols[col];
        const sinal = (o.inverte ? -1 : 1) * (lado === 'E' && o.espelhaE ? -1 : 1);
        if (sinal < 0) y = y.map(v => -v);
        p.curvas[c] = interp101(t, y, t[a], t[b]);
      }
      passadas.push(p);
    }
  }
  // passadas suspeitas: duração fora de 0,6–1,4 × mediana do lado
  for (const lado of ['D', 'E']) {
    const ds = passadas.filter(p => p.lado === lado).map(p => p.duracao).sort((x, y) => x - y);
    const med = ds[Math.floor(ds.length / 2)];
    passadas.filter(p => p.lado === lado).forEach(p => { p.suspeita = p.duracao > 1.4 * med || p.duracao < 0.6 * med || p.rd == null; });
  }
  passadas.forEach(p => { p.excluida = cfg.excluidos?.has(p.id) ?? p.suspeita; });
  return resumir(trial, passadas, cfg, { fs, vEst, d, i0, i1 });
}

const VARS = [
  ['velocidade', 'Velocidade', 'm/s', 2],
  ['cadencia', 'Cadência', 'passos/min', 0],
  ['passada', 'Comprimento da passada', 'm', 2],
  ['passo', 'Comprimento do passo', 'm', 2],
  ['largura', 'Largura do passo', 'cm', 1],
  ['duracao', 'Tempo da passada', 's', 2],
  ['passoT', 'Tempo do passo', 's', 3],
  ['apoioPct', 'Apoio', '% do ciclo', 1],
  ['apoio', 'Tempo de apoio', 's', 3],
  ['balanco', 'Tempo de balanço', 's', 3],
  ['duplaPct', 'Duplo apoio', '% do ciclo', 1],
  ['voo', 'Tempo de voo', 's', 3],
];
export { VARS };

function resumir(trial, passadas, cfg, ctx) {
  const ok = passadas.filter(p => !p.excluida);
  const lado = (l) => ok.filter(p => p.lado === l);
  const est = (arr) => { const v = arr.filter(x => x != null && isFinite(x)); return { m: v.length ? media(v) : null, dp: v.length > 1 ? dp(v) : null, n: v.length, cv: v.length > 1 ? 100 * dp(v) / media(v) : null }; };
  const tab = {};
  for (const [k] of VARS) {
    if (k === 'cadencia' || k === 'velocidade') continue;
    if (cfg.atividade === 'corrida' && k === 'duplaPct') continue;
    if (cfg.atividade !== 'corrida' && k === 'voo') continue;
    const mult = k === 'largura' ? 100 : 1;
    const D = est(lado('D').map(p => p[k] != null ? p[k] * mult : null)), Es = est(lado('E').map(p => p[k] != null ? p[k] * mult : null));
    const si = k !== 'largura' && D.m != null && Es.m != null && (D.m + Es.m) !== 0 ? 100 * (D.m - Es.m) / (0.5 * (D.m + Es.m)) : null;
    tab[k] = { D, E: Es, si, geral: est(ok.map(p => p[k] != null ? p[k] * mult : null)) };
  }
  // cadência: passos por minuto pelo tempo médio de passada (2 passos por passada)
  const durs = ok.map(p => p.duracao);
  const cad = durs.length ? 120 / media(durs) : null;
  tab.cadencia = { geral: { m: cad, dp: null, n: durs.length }, D: {}, E: {}, si: null };
  let vel = null;
  if (ctx.vEst != null) vel = ctx.vEst;
  else if (ok.some(p => p.velocidade != null)) vel = media(ok.filter(p => p.velocidade != null).map(p => p.velocidade));
  tab.velocidade = { geral: { m: vel, dp: null, n: ok.length }, D: {}, E: {}, si: null };
  // curvas média ± DP
  const curvas = {};
  for (const [c] of ANGULOS) {
    curvas[c] = {};
    for (const l of ['D', 'E']) {
      const cs = lado(l).map(p => p.curvas[c]).filter(Boolean);
      if (!cs.length) continue;
      const m = new Float64Array(101), s = new Float64Array(101);
      for (let k = 0; k <= 100; k++) { const col = cs.map(x => x[k]); m[k] = media(col); s[k] = cs.length > 1 ? dp(col) : 0; }
      curvas[c][l] = { m, s, n: cs.length };
    }
  }
  const rdMedio = { D: est(lado('D').map(p => p.apoioPct)).m, E: est(lado('E').map(p => p.apoioPct)).m };
  return { passadas, tab, curvas, rdMedio, pontos: pontosChave(curvas, rdMedio), ctx };
}

function pontosChave(curvas, rd) {
  const out = [];
  const val = (c, l, f) => curvas[c]?.[l] ? f(Array.from(curvas[c][l].m), Math.round(rd[l] ?? 60)) : null;
  const max = (a, i0, i1) => Math.max(...a.slice(i0, i1 + 1));
  const min = (a, i0, i1) => Math.min(...a.slice(i0, i1 + 1));
  const def = [
    ['Joelho · flexão no contato inicial', 'knee_angle', (a) => a[0]],
    ['Joelho · pico de flexão no apoio', 'knee_angle', (a, r) => max(a, 0, Math.round(r * 0.6))],
    ['Joelho · pico de flexão no balanço', 'knee_angle', (a, r) => max(a, r, 100)],
    ['Quadril · pico de flexão', 'hip_flexion', (a) => max(a, 0, 100)],
    ['Quadril · pico de extensão (menor valor)', 'hip_flexion', (a) => min(a, 0, 100)],
    ['Tornozelo · pico de dorsiflexão no apoio', 'ankle_angle', (a, r) => max(a, 0, r)],
    ['Tornozelo · pico de plantiflexão', 'ankle_angle', (a) => min(a, 0, 100)],
    ['Pelve · amplitude de obliquidade', 'pelvis_list', (a) => max(a, 0, 100) - min(a, 0, 100)],
    ['Pelve · amplitude de rotação', 'pelvis_rotation', (a) => max(a, 0, 100) - min(a, 0, 100)],
    ['Quadril · pico de adução no apoio', 'hip_adduction', (a, r) => max(a, 0, r)],
    ['Pelve · pico de queda do lado oposto no apoio', 'pelvis_list', (a, r) => -min(a, 0, r)],
  ];
  for (const [rot, c, f] of def) out.push({ rotulo: rot, curva: c, D: val(c, 'D', f), E: val(c, 'E', f) });
  for (const [c, rot] of [['hip_flexion', 'Quadril'], ['knee_angle', 'Joelho'], ['ankle_angle', 'Tornozelo']])
    out.push({ rotulo: rot + ' · amplitude sagital', curva: c, D: val(c, 'D', a => max(a, 0, 100) - min(a, 0, 100)), E: val(c, 'E', a => max(a, 0, 100) - min(a, 0, 100)) });
  return out;
}

// sugere a atividade pela fração de apoio (corrida: apoio < ~50 % do ciclo)
export function sugerirAtividade(ev, t) {
  const pct = [];
  for (const [ci, rd] of [[ev.CI_D, ev.RD_D], [ev.CI_E, ev.RD_E]]) {
    for (let k = 0; k + 1 < ci.length; k++) { const r = rd.find(i => i > ci[k] && i < ci[k + 1]); if (r != null) pct.push((t[r] - t[ci[k]]) / (t[ci[k + 1]] - t[ci[k]])); }
  }
  if (!pct.length) return 'marcha';
  pct.sort((a, b) => a - b);
  return pct[Math.floor(pct.length / 2)] < 0.5 ? 'corrida' : 'marcha';
}

// Trecho estável: maior sequência de passadas com duração dentro de ±12 % da mediana
// (tira a aceleração/desaceleração da esteira e o início/fim no solo). Devolve [i0, i1] ou null.
export function trechoEstavel(ev, t) {
  let melhor = null;
  for (const ci of [ev.CI_D, ev.CI_E]) {
    if (ci.length < 4) continue;
    const d = ci.slice(1).map((c, i) => t[c] - t[ci[i]]);
    const med = [...d].sort((a, b) => a - b)[Math.floor(d.length / 2)];
    let ini = 0, best = [0, -1];
    for (let i = 0; i < d.length; i++) {
      if (Math.abs(d[i] - med) > 0.12 * med) { ini = i + 1; continue; }
      if (i - ini > best[1] - best[0]) best = [ini, i];
    }
    if (best[1] < best[0]) continue;
    const jan = [ci[best[0]], ci[best[1] + 1]];
    if (!melhor) melhor = jan; else melhor = [Math.max(melhor[0], jan[0]), Math.min(melhor[1], jan[1])];
  }
  if (!melhor || melhor[1] <= melhor[0]) return null;
  return [Math.max(0, melhor[0] - 2), Math.min(t.length - 1, melhor[1] + 2)];
}
