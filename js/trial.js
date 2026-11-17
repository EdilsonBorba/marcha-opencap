// Passo "Trial completa": curvas ao longo do tempo (com preenchimento conforme a reprodução) e mapa de
// pegadas (tapete virtual) com linha de progressão, desvio lateral e ângulo de progressão do pé.
import { marcadoresPe, direcao } from './gait.js';
import { tr, locale } from './i18n.js';

const fmtN = (v, d = 1) => (v == null || !isFinite(v)) ? '–' : (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------------------------------------------------------------- variáveis
// base → [rótulo, sinal (+1 = como no OpenSim; −1 = convenção clínica invertida), unidade]
const NOMES = {
  hip_flexion: ['Quadril · flexão (+) / extensão', 1], hip_adduction: ['Quadril · adução (+) / abdução', 1], hip_rotation: ['Quadril · rotação interna (+) / externa', 1],
  knee_angle: ['Joelho · flexão (+) / extensão', 1], ankle_angle: ['Tornozelo · dorsiflexão (+) / plantiflexão', 1], subtalar_angle: ['Subtalar · inversão (+) / eversão', 1],
  arm_flex: ['Ombro · flexão (+) / extensão', 1], arm_add: ['Ombro · adução (+) / abdução', 1], arm_rot: ['Ombro · rotação', 1],
  elbow_flex: ['Cotovelo · flexão (+)', 1], pro_sup: ['Antebraço · pronação / supinação', 1],
  pelvis_tilt: ['Pelve · anteversão (+) / retroversão (zero do modelo)', -1], pelvis_list: ['Pelve · obliquidade', 1], pelvis_rotation: ['Pelve · rotação', 1],
  lumbar_extension: ['Tronco · extensão (+) / flexão', 1], lumbar_bending: ['Tronco · inclinação lateral', 1], lumbar_rotation: ['Tronco · rotação', 1],
  com_v: ['Centro de massa · vertical (+ para cima)', 1, 'cm'], com_ml: ['Centro de massa · médio-lateral (+ para a direita)', 1, 'cm'], com_ap: ['Centro de massa · ântero-posterior (+ para frente)', 1, 'cm'],
};
const IGNORAR = /^(pelvis_t[xyz]|mtp_angle_[rl])$/;

// lista para o seletor: { id, base, lado: 'D' | 'E' | 'O', rotulo }
export function variaveisDisponiveis(A) {
  const cols = Object.keys(A.trial.mot.cols).filter(c => c !== 'time' && !IGNORAR.test(c));
  const out = [];
  for (const c of cols) {
    const m = c.match(/^(.*)_(r|l)$/);
    const base = m ? m[1] : c, lado = m ? (m[2] === 'r' ? 'D' : 'E') : 'O';
    out.push({ id: c, base, lado, rotulo: NOMES[base] ? NOMES[base][0].split(' (')[0].split(' /')[0] : base.replace(/_/g, ' ') });
  }
  if (A.trial.com) for (const b of ['com_v', 'com_ml', 'com_ap']) out.push({ id: b, base: b, lado: 'O', rotulo: NOMES[b][0].split(' (')[0] });
  return out;
}
export const PRESETS_SERIE = {
  Joelhos: ['knee_angle_r', 'knee_angle_l'], Quadris: ['hip_flexion_r', 'hip_flexion_l'], Tornozelos: ['ankle_angle_r', 'ankle_angle_l'],
  Pelve: ['pelvis_tilt', 'pelvis_list', 'pelvis_rotation'], 'Centro de massa': ['com_v', 'com_ml', 'com_ap'],
};

// direção de progressão própria do mapa: no solo, o deslocamento do sacro; na esteira, o eixo da lona
// (deslocamento do calcâneo durante o apoio, que é o movimento da esteira), para que o ângulo do pé
// não seja zerado pela própria definição da direção.
function direcaoMapa(A) {
  const trc = A.trial.trc, d0 = direcao(trc, A.cfg.ambiente);
  if (A.cfg.ambiente !== 'esteira') return d0;
  const P = marcadoresPe(trc); let sx = 0, sz = 0;
  for (const [l, cal] of [['D', P.calcR], ['E', P.calcL]]) {
    for (const a of A.eventos['CI_' + l]) {
      const b = A.eventos['RD_' + l].find(x => x > a); if (b == null || b - a < 3) continue;
      sx += cal.x[a] - cal.x[b]; sz += cal.z[a] - cal.z[b];   // pé vai para trás com a lona; o sentido da marcha é o oposto
    }
  }
  const n = Math.hypot(sx, sz);
  return n > 0.05 ? { x: sx / n, z: sz / n } : d0;
}

// séries no tempo (graus ou cm), já com a convenção clínica
function serie(A, id, ctx) {
  const t = A.trial.mot.time;
  if (id.startsWith('com_')) {
    const C = A.trial.com; if (!C) return null;
    const d = ctx.d, n = t.length, y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = id === 'com_v' ? C.y[i] : id === 'com_ml' ? (-C.x[i] * d.z + C.z[i] * d.x) : (C.x[i] * d.x + C.z[i] * d.z);
    // remove a média ou a tendência linear
    // ântero-posterior sempre; vertical no solo (o chão do OpenCap costuma ficar levemente inclinado)
    if (id === 'com_ap' || (id === 'com_v' && A.cfg.ambiente !== 'esteira')) { let st = 0, sy = 0, stt = 0, sty = 0; for (let i = 0; i < n; i++) { st += t[i]; sy += y[i]; stt += t[i] * t[i]; sty += t[i] * y[i]; } const b = (n * sty - st * sy) / (n * stt - st * st), a = (sy - b * st) / n; for (let i = 0; i < n; i++) y[i] -= a + b * t[i]; }
    else { const m = y.reduce((s, v) => s + v, 0) / n; for (let i = 0; i < n; i++) y[i] -= m; }
    return y.map(v => v * 100);
  }
  const col = A.trial.mot.cols[id]; if (!col) return null;
  const base = id.replace(/_(r|l)$/, ''), s = NOMES[base]?.[1] ?? 1;
  return s === 1 ? col : col.map(v => -v);
}

// agrupa: lados D e E da mesma articulação no mesmo gráfico
function grupos(ids) {
  const g = new Map();
  for (const id of ids) {
    const m = id.match(/^(.*)_(r|l)$/), base = m ? m[1] : id;
    if (!g.has(base)) g.set(base, []);
    g.get(base).push({ id, lado: m ? (m[2] === 'r' ? 'D' : 'E') : 'O' });
  }
  return [...g.entries()].map(([base, itens]) => ({ base, itens: itens.sort((a, b) => a.lado.localeCompare(b.lado)), titulo: NOMES[base]?.[0] || base.replace(/_/g, ' '), un: NOMES[base]?.[2] || '°' }));
}

function faixasApoio(A, lado) {
  const out = [], ci = A.eventos['CI_' + lado], rd = A.eventos['RD_' + lado];
  for (const a of ci) { const b = rd.find(x => x > a); const prox = ci.find(x => x > a); if (b != null && (prox == null || b < prox)) out.push([a, b]); }
  return out;
}

// ---------------------------------------------------------------- curvas no tempo (tela)
export function criarSerie(el, { onSeek, cores }) {
  let A = null, G = [], ctx = null, faixaX = null, sincronizando = false;
  const divs = [];

  // Cada variável tem dois traços: um claro (a trial inteira) e um forte por cima, recortado (clip-path)
  // até o instante atual. Só o recorte muda a cada quadro, então a reprodução fica leve.
  function posicionar(i) {
    if (!A) return;
    const tt = A.trial.mot.time[i];
    for (const gd of divs) {
      const xa = gd._fullLayout?.xaxis; if (!xa) continue;
      const xc = xa.l2p(tt);   // instante atual, em px da área do gráfico
      gd.querySelectorAll('.scatterlayer .trace').forEach((g, k) => {
        if (gd.data[k]?.meta !== 'forte') return;
        let bb; try { bb = g.getBBox(); } catch { return; }
        const corte = Math.max(0, bb.x + bb.width - xc);   // px a esconder à direita do traço forte
        g.style.clipPath = `inset(-20px ${corte}px -20px -20px)`;
      });
    }
  }

  function desenhar(lista) {
    el.innerHTML = ''; divs.length = 0;
    if (!A || !lista.length) { el.innerHTML = `<p class="dica">${tr('Escolha as variáveis para ver as curvas ao longo da trial.')}</p>`; return; }
    const t = A.trial.mot.time, x = Array.from(t);
    const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    const [w0, w1] = A.cfg.janela || [0, t.length - 1];
    const apoio = { D: faixasApoio(A, 'D'), E: faixasApoio(A, 'E') };
    G = grupos(lista);
    for (const g of G) {
      const box = document.createElement('div'); box.className = 'serie';
      box.innerHTML = `<div class="serie-tit">${tr(g.titulo)}</div><div class="serie-graf"></div>`;
      el.appendChild(box);
      const gd = box.querySelector('.serie-graf'); divs.push(gd);
      const tracos = g.itens.flatMap(it => {
        const y = Array.from(serie(A, it.id, ctx) || []), cor = it.lado === 'D' ? cores.D : it.lado === 'E' ? cores.E : css('--fg');
        const nome = it.lado === 'D' ? tr('Direito') : it.lado === 'E' ? tr('Esquerdo') : tr(g.titulo.split(' · ')[0]);
        return [
          { x, y, type: 'scatter', mode: 'lines', line: { color: cor, width: 1.6 }, opacity: 0.25, hoverinfo: 'skip', meta: 'claro' },
          { x, y, type: 'scatter', mode: 'lines', name: nome, line: { color: cor, width: 1.8 }, meta: 'forte', hovertemplate: `%{y:.1f}${g.un === '°' ? '°' : ' cm'}<extra>%{fullData.name}</extra>` },
        ];
      });
      const shapes = [];
      // fora do trecho analisado: cinza
      if (w0 > 0) shapes.push({ type: 'rect', xref: 'x', yref: 'paper', x0: t[0], x1: t[w0], y0: 0, y1: 1, fillcolor: css('--line'), opacity: 0.35, line: { width: 0 }, layer: 'below' });
      if (w1 < t.length - 1) shapes.push({ type: 'rect', xref: 'x', yref: 'paper', x0: t[w1], x1: t[t.length - 1], y0: 0, y1: 1, fillcolor: css('--line'), opacity: 0.35, line: { width: 0 }, layer: 'below' });
      // barras de apoio no topo (D em cima, E embaixo)
      const lados = g.itens.some(i => i.lado !== 'O') ? [...new Set(g.itens.map(i => i.lado))].filter(l => l !== 'O') : ['D', 'E'];
      lados.forEach((l, k) => apoio[l].forEach(([a, b]) => shapes.push({ type: 'rect', xref: 'x', yref: 'paper', x0: t[a], x1: t[b], y0: 1.02 + k * 0.05, y1: 1.06 + k * 0.05, fillcolor: cores[l], opacity: 0.85, line: { width: 0 } })));
      const eixo = { gridcolor: css('--line'), zerolinecolor: css('--mut'), linecolor: css('--line') };
      Plotly.newPlot(gd, tracos, {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: css('--fg'), size: 11, family: '-apple-system,system-ui,sans-serif' },
        margin: { l: 48, r: 10, t: 24, b: 28 }, showlegend: false, hovermode: 'x', dragmode: 'zoom', shapes,
        xaxis: { ...eixo, range: faixaX || [t[0], t[t.length - 1]], ticksuffix: ' s' },
        yaxis: { ...eixo, fixedrange: true, ticksuffix: g.un === '°' ? '°' : ' cm' },
      }, { displayModeBar: false, responsive: true, doubleClick: 'reset' });
      gd.on('plotly_click', (ev) => { const p = ev.points?.[0]; if (p) onSeek(Math.round((p.x - t[0]) / (t[1] - t[0]))); });
      gd.on('plotly_relayout', (ev) => {
        if (sincronizando) return;
        const r = ev['xaxis.range[0]'] != null ? [ev['xaxis.range[0]'], ev['xaxis.range[1]']] : ev['xaxis.range'] || (ev['xaxis.autorange'] ? null : undefined);
        if (r === undefined) { posicionar(ultimo); return; }
        faixaX = r; sincronizando = true;
        Promise.all(divs.filter(d => d !== gd).map(d => Plotly.relayout(d, r ? { 'xaxis.range': r } : { 'xaxis.autorange': true }))).finally(() => { sincronizando = false; posicionar(ultimo); });
      });
      gd.on('plotly_afterplot', () => posicionar(ultimo));
    }
    posicionar(ultimo);
  }

  let ultimo = 0, lista = [];
  return {
    set(an, ids) { A = an; ctx = A ? { d: direcaoMapa(A) } : null; lista = ids; faixaX = null; desenhar(ids); },
    frame(i) { ultimo = i; posicionar(i); },
    redesenhar() { desenhar(lista); },
  };
}

// ---------------------------------------------------------------- pegadas
// contorno de sola (coordenadas locais: s ao longo do pé, 0 = calcâneo, 1 = dedos)
const PERFIL = [[-0.1, 0], [-0.09, 0.45], [-0.05, 0.66], [0.05, 0.75], [0.25, 0.72], [0.45, 0.78], [0.65, 0.95], [0.8, 1], [0.93, 0.9], [1.03, 0.66], [1.09, 0.32], [1.1, 0]];

export function calcularPegadas(A) {
  const trc = A.trial.trc; if (!trc) return { erro: 'Este trial não tem marcadores (.trc).' };
  const esteira = A.cfg.ambiente === 'esteira';
  if (esteira && !A.cfg.velEsteira) return { erro: 'Informe a velocidade da esteira (passo 2) para montar o mapa de pegadas.' };
  const v = esteira ? A.cfg.velEsteira / 3.6 : 0, t = trc.time, d = direcaoMapa(A);
  const P = marcadoresPe(trc), meta = { D: trc.markers.r_5meta_study, E: trc.markers.L_5meta_study };
  // u = avanço (m), w = lateral (m, + = direita); na esteira soma o deslocamento da lona
  const U = (m, i) => m.x[i] * d.x + m.z[i] * d.z + v * t[i];
  const Wl = (m, i) => -m.x[i] * d.z + m.z[i] * d.x;
  const [i0, i1] = A.cfg.janela || [0, t.length - 1];
  const exc = A.cfg.excluidos || new Set();
  const pes = [];
  for (const l of ['D', 'E']) {
    const cal = l === 'D' ? P.calcR : P.calcL, toe = l === 'D' ? P.toeR : P.toeL;
    const ci = A.eventos['CI_' + l], rd = A.eventos['RD_' + l];
    ci.forEach((a, k) => {
      const b = rd.find(x => x > a), prox = ci[k + 1];
      const fimApoio = b != null && (prox == null || b < prox) ? b : Math.min(a + Math.round(0.3 / (t[1] - t[0])), t.length - 1);
      const m = Math.round((a + fimApoio) / 2);            // meio do apoio: pé apoiado
      const hu = U(cal, m), hw = Wl(cal, m), tu = U(toe, m), tw = Wl(toe, m);
      const comp = Math.hypot(tu - hu, tw - hw) || 0.2;
      const eu = (tu - hu) / comp, ew = (tw - hw) / comp;   // eixo do pé
      let larg = 0.09;
      const m5 = meta[l]; if (m5) larg = Math.max(0.07, Math.min(0.13, 2.1 * Math.abs((U(m5, m) - hu) * ew - (Wl(m5, m) - hw) * eu)));
      const ang = Math.atan2(ew, eu) * 180 / Math.PI * (l === 'D' ? 1 : -1);   // + = ponta para fora
      const contorno = [];
      const lado = (sgn) => PERFIL.map(([s, f]) => [hu + eu * s * comp - ew * sgn * f * larg / 2, hw + ew * s * comp + eu * sgn * f * larg / 2]);
      contorno.push(...lado(1), ...lado(-1).reverse());
      const id = `${l}:${k + 1}`;
      pes.push({ lado: l, n: k + 1, frame: a, fim: fimApoio, t: t[a], u: hu + eu * comp * 0.5, w: hw + ew * comp * 0.5, uCal: hu, ang, contorno,
        usado: a >= i0 && a <= i1 && !exc.has(id) });
    });
  }
  pes.sort((p, q) => p.frame - q.frame);
  // linha de progressão: na esteira, paralela à lona (no centro médio); no solo, reta ajustada às pegadas usadas
  const us = pes.filter(p => p.usado);
  const base = us.length >= 3 ? us : pes;
  let a0 = 0, b0 = 0;
  if (base.length) {
    const n = base.length, mu = base.reduce((s, p) => s + p.u, 0) / n, mw = base.reduce((s, p) => s + p.w, 0) / n;
    if (!esteira && n >= 3) { let num = 0, den = 0; for (const p of base) { num += (p.u - mu) * (p.w - mw); den += (p.u - mu) ** 2; } b0 = den > 0 ? num / den : 0; }
    a0 = mw - b0 * mu;
  }
  const linhaW = (u) => a0 + b0 * u;
  // trajeto: ponto médio entre pegadas consecutivas de lados opostos; desvio = distância lateral à linha
  const trajeto = [];
  for (let k = 1; k < pes.length; k++) {
    const p = pes[k - 1], q = pes[k]; if (p.lado === q.lado) continue;
    const u = (p.u + q.u) / 2, w = (p.w + q.w) / 2;
    trajeto.push({ u, w, desvio: w - linhaW(u), usado: p.usado && q.usado, frame: q.frame, largura: Math.abs(q.w - p.w) });
  }
  const tu = trajeto.filter(x => x.usado);
  const resumo = { D: {}, E: {} };
  for (const l of ['D', 'E']) {
    const a = us.filter(p => p.lado === l).map(p => p.ang);
    resumo[l].ang = a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
    resumo[l].angDp = a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - resumo[l].ang) ** 2, 0) / (a.length - 1)) : null;
  }
  const dv = tu.map(x => x.desvio);
  resumo.desvioMax = dv.length ? Math.max(...dv.map(Math.abs)) : null;
  resumo.desvioDp = dv.length > 1 ? Math.sqrt(dv.reduce((s, x) => s + x * x, 0) / dv.length) : null;
  resumo.largura = tu.length ? tu.reduce((s, x) => s + x.largura, 0) / tu.length : null;
  // posição do sacro no mapa (cursor)
  const sacU = (i) => P.sac.x[i] * d.x + P.sac.z[i] * d.z + v * t[i];
  // posição da barra: no TD de cada pegada, exatamente no calcanhar dela; entre dois TD, interpola no tempo.
  // Antes da primeira e depois da última, acompanha o deslocamento do sacro.
  const sac = (i) => {
    if (!pes.length) return sacU(i);
    if (i <= pes[0].frame) return pes[0].uCal + sacU(i) - sacU(pes[0].frame);
    const ult = pes[pes.length - 1];
    if (i >= ult.frame) return ult.uCal + sacU(i) - sacU(ult.frame);
    let k = 1; while (pes[k].frame <= i) k++;
    const p = pes[k - 1], q = pes[k], f = (i - p.frame) / (q.frame - p.frame || 1);
    return p.uCal + f * (q.uCal - p.uCal);
  };
  return { pes, trajeto, linha: { a: a0, b: b0 }, resumo, esteira, sac, uMin: Math.min(...pes.map(p => p.u)) - 0.4, uMax: Math.max(...pes.map(p => p.u)) + 0.4 };
}

const LAT = 0.42;   // meia-largura visível do mapa (m)

function figuraPegadas(M, cores, tema, faixaU, destaque = new Set()) {
  const shapes = [], css = tema;
  for (const p of M.pes) {
    const path = 'M' + p.contorno.map(([u, w]) => `${u},${-w}`).join('L') + 'Z';
    const forte = destaque.has(p.frame);
    shapes.push({ type: 'path', path, fillcolor: cores[p.lado], opacity: !p.usado ? 0.18 : forte ? 0.95 : 0.55, line: { color: cores[p.lado], width: forte ? 2 : 1 } });
  }
  const u0 = faixaU[0] - 1, u1 = faixaU[1] + 1;
  shapes.push({ type: 'line', x0: u0, x1: u1, y0: -(M.linha.a + M.linha.b * u0), y1: -(M.linha.a + M.linha.b * u1), line: { color: css.mut, width: 1.2, dash: 'dash' }, layer: 'below' });
  const tracos = [
    { x: M.trajeto.map(p => p.u), y: M.trajeto.map(p => -p.w), mode: 'lines+markers', type: 'scatter', line: { color: css.fg, width: 1.2 }, marker: { size: 4, color: css.fg }, hoverinfo: 'skip', name: 'trajeto' },
    { x: M.pes.map(p => p.u), y: M.pes.map(p => -p.w), mode: 'markers', type: 'scatter', marker: { size: 16, opacity: 0 }, name: 'pegadas',
      text: M.pes.map(p => `${tr(p.lado === 'D' ? 'Direito' : 'Esquerdo')} ${p.n} · ${fmtN(p.t, 2)} s<br>${tr('Ângulo do pé')}: ${fmtN(p.ang, 0)}° ${tr(p.ang >= 0 ? '(para fora)' : '(para dentro)')}${p.usado ? '' : '<br>' + tr('fora do trecho analisado')}`),
      hovertemplate: '%{text}<extra></extra>' },
  ];
  return { tracos, shapes };
}

export function criarPegadas(el, { onSeek, cores, aoResumo }) {
  let A = null, M = null, gd = null, faixa = null, destaque = new Set(), cursor = null, reajustar = null;
  new ResizeObserver(() => { if (gd?.isConnected && reajustar) Plotly.Plots.resize(gd).then(reajustar); }).observe(el);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function spanU() { const s = gd?._fullLayout?._size; return s ? 2 * LAT * s.w / s.h : 6; }
  function desenhar() {
    el.innerHTML = '';
    if (!A) return;
    M = calcularPegadas(A);
    aoResumo?.(M);
    if (M.erro) { el.innerHTML = `<p class="dica">${tr(M.erro)}</p>`; return; }
    if (!M.pes.length) { el.innerHTML = `<p class="dica">${tr('Sem eventos de TD para montar as pegadas.')}</p>`; return; }
    gd = document.createElement('div'); gd.className = 'pegadas-graf'; el.appendChild(gd);
    cursor = document.createElement('div'); cursor.className = 'pegadas-cursor'; el.appendChild(cursor);
    const tema = { mut: css('--mut'), fg: css('--fg') };
    const { tracos, shapes } = figuraPegadas(M, cores, tema, [M.uMin, M.uMax], destaque);
    const eixo = { gridcolor: css('--line'), zerolinecolor: css('--line'), linecolor: css('--line') };
    const ini = faixa || [M.uMin, M.uMin + 6];
    Plotly.newPlot(gd, tracos, {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: css('--fg'), size: 11, family: '-apple-system,system-ui,sans-serif' },
      margin: { l: 44, r: 10, t: 6, b: 28 }, showlegend: false, dragmode: 'pan', hovermode: 'closest', shapes,
      xaxis: { ...eixo, range: ini, ticksuffix: ' m', zeroline: false },
      yaxis: { ...eixo, range: [-LAT, LAT], fixedrange: true, ticksuffix: ' m', zeroline: false, tickvals: [-0.3, 0, 0.3], ticktext: ['D 0,3', '0', 'E 0,3'] },
    }, { displayModeBar: false, responsive: true, scrollZoom: false });
    // mantém a escala igual nos dois eixos (pegada sem distorção)
    const ajustar = () => { const r = gd._fullLayout.xaxis.range, c = (r[0] + r[1]) / 2, s = spanU(); faixa = [c - s / 2, c + s / 2]; Plotly.relayout(gd, { 'xaxis.range': faixa }); };
    ajustar();
    reajustar = ajustar;
    gd.on('plotly_relayout', (ev) => { if (ev['xaxis.range[0]'] != null) faixa = [ev['xaxis.range[0]'], ev['xaxis.range[1]']]; mover(ultimo, false); });
    gd.on('plotly_click', (ev) => { const p = ev.points?.find(q => q.data.name === 'pegadas'); if (p) onSeek(M.pes[p.pointIndex].frame); });
    gd.on('plotly_afterplot', () => mover(ultimo, false));
  }
  let ultimo = 0, emAndamento = false;
  function mover(i, seguir = true) {
    if (!gd || !M || M.erro || !gd._fullLayout?.xaxis) return;
    const u = M.sac(i), [r0, r1] = gd._fullLayout.xaxis.range, s = gd._fullLayout._size;
    if (seguir && !emAndamento && (u < r0 + 0.1 * (r1 - r0) || u > r1 - 0.1 * (r1 - r0))) {
      const sp = r1 - r0; faixa = [u - 0.3 * sp, u + 0.7 * sp]; emAndamento = true;
      Plotly.relayout(gd, { 'xaxis.range': faixa }).finally(() => { emAndamento = false; });
      return;
    }
    const fr = (u - r0) / (r1 - r0);
    cursor.style.display = fr < 0 || fr > 1 ? 'none' : 'block';
    cursor.style.left = (s.l + fr * s.w) + 'px'; cursor.style.top = s.t + 'px'; cursor.style.height = s.h + 'px';
    // pegada(s) em apoio neste quadro em destaque
    const agora = new Set(M.pes.filter(p => i >= p.frame && i <= p.fim).map(p => p.frame));
    if ([...agora].join() !== [...destaque].join()) {
      destaque = agora;
      const tema = { mut: css('--mut'), fg: css('--fg') };
      Plotly.relayout(gd, { shapes: figuraPegadas(M, cores, tema, [M.uMin, M.uMax], destaque).shapes });
    }
  }
  return {
    set(an) { A = an; faixa = null; destaque = new Set(); desenhar(); },
    frame(i) { ultimo = i; mover(i); },
    inicio() { if (!gd || !M || M.erro) return; faixa = [M.uMin, M.uMin + spanU()]; Plotly.relayout(gd, { 'xaxis.range': faixa }); },
  };
}

// ---------------------------------------------------------------- imagens para o laudo (fundo branco)
async function png(tracos, layout, w, h) {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px`;
  document.body.appendChild(div);
  await Plotly.newPlot(div, tracos, { width: w, height: h, paper_bgcolor: '#fff', plot_bgcolor: '#fff', font: { size: 12, color: '#222' }, showlegend: false, ...layout }, { staticPlot: true });
  const url = await Plotly.toImage(div, { format: 'jpeg', width: w * 1.5, height: h * 1.5 });
  Plotly.purge(div); div.remove();
  return url;
}

// curvas no tempo: uma faixa de `seg` segundos por linha, dentro do trecho analisado
export async function imagensSerieLaudo(A, ids, cores, seg = 10) {
  const t = A.trial.mot.time, [i0, i1] = A.cfg.janela || [0, t.length - 1], ctx = { d: direcaoMapa(A) };
  const out = [];
  const apoio = { D: faixasApoio(A, 'D'), E: faixasApoio(A, 'E') };
  for (const g of grupos(ids)) {
    const ys = g.itens.map(it => ({ it, y: serie(A, it.id, ctx) })).filter(s => s.y);
    if (!ys.length) continue;
    let lo = Infinity, hi = -Infinity;
    for (const { y } of ys) for (let i = i0; i <= i1; i++) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); }
    const pad = (hi - lo) * 0.08 || 1;
    const linhas = [];
    for (let ta = t[i0]; ta < t[i1] - 0.05; ta += seg) {
      const tb = ta + seg;
      const sel = (arr) => { const xs = [], vs = []; for (let i = i0; i <= i1; i++) if (t[i] >= ta && t[i] <= tb) { xs.push(t[i]); vs.push(arr ? arr[i] : 0); } return [xs, vs]; };
      const tracos = ys.map(({ it, y }) => { const [xs, vs] = sel(y); return { x: xs, y: vs, type: 'scatter', mode: 'lines', line: { color: it.lado === 'D' ? cores.D : it.lado === 'E' ? cores.E : '#222', width: 1.6 } }; });
      const lados = [...new Set(g.itens.map(i => i.lado))].filter(l => l !== 'O');
      const shapes = [];
      (lados.length ? lados : ['D', 'E']).forEach((l, k) => apoio[l].forEach(([a, b]) => { if (t[b] >= ta && t[a] <= tb) shapes.push({ type: 'rect', xref: 'x', yref: 'paper', x0: Math.max(t[a], ta), x1: Math.min(t[b], tb), y0: 1.03 + k * 0.06, y1: 1.07 + k * 0.06, fillcolor: cores[l], line: { width: 0 } }); }));
      linhas.push(await png(tracos, { margin: { l: 50, r: 8, t: 26, b: 24 }, shapes,
        xaxis: { range: [ta, tb], ticksuffix: ' s', gridcolor: '#e6e6e6' }, yaxis: { range: [lo - pad, hi + pad], ticksuffix: g.un === '°' ? '°' : ' cm', gridcolor: '#e6e6e6', zerolinecolor: '#999' } }, 1100, 170));
    }
    out.push({ titulo: g.titulo, lados: g.itens.map(i => i.lado), linhas });
  }
  return out;
}

// mapa de pegadas: faixas de `metros` de comprimento, só o trecho analisado
export async function imagensPegadasLaudo(A, cores, metros = 4) {
  const M = calcularPegadas(A); if (M.erro || !M.pes.length) return { erro: M.erro || 'Sem pegadas.' };
  const us = M.pes.filter(p => p.usado); const base = us.length ? us : M.pes;
  const ua = Math.min(...base.map(p => p.u)) - 0.3, ub = Math.max(...base.map(p => p.u)) + 0.3;
  const Mu = { ...M, pes: base };
  const { tracos, shapes } = figuraPegadas(Mu, cores, { mut: '#888', fg: '#333' }, [ua, ub]);
  tracos[1] = { x: [], y: [], type: 'scatter' };   // sem camada de passar o mouse
  const linhas = [];
  const W = 1100, H = Math.round((W - 52) * (2 * LAT) / metros) + 34;   // mesma escala nos dois eixos
  for (let u = ua; u < ub; u += metros) {
    linhas.push(await png(tracos, { margin: { l: 44, r: 8, t: 4, b: 30 }, shapes,
      xaxis: { range: [u, u + metros], ticksuffix: ' m', gridcolor: '#eee', zeroline: false },
      yaxis: { range: [-LAT, LAT], ticksuffix: ' m', gridcolor: '#eee', zeroline: false, tickvals: [-0.3, 0, 0.3], ticktext: ['D 0,3', '0', 'E 0,3'] } }, W, H));
  }
  return { linhas, resumo: M.resumo, esteira: M.esteira, proporcao: H / W };
}

// tabela de pegadas para o Excel
export function tabelaPegadas(A) {
  const M = calcularPegadas(A); if (M.erro) return null;
  const linha = (u) => M.linha.a + M.linha.b * u;
  return [['Lado', 'Nº', 'Tempo do TD (s)', 'Avanço (m)', 'Lateral (m, + = direita)', 'Desvio da linha de progressão (cm)', 'Ângulo de progressão do pé (°, + = para fora)', 'Usada'],
    ...M.pes.map(p => [p.lado, p.n, p.t, p.u, p.w, (p.w - linha(p.u)) * 100, p.ang, p.usado ? 'sim' : 'não'])];
}
