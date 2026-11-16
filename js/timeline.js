// Linha do tempo dos eventos: faixa geral (com corte) + uma faixa por pé com as barras de apoio.
const NS = 'http://www.w3.org/2000/svg';
const EV = { CI_D: ['D', 'ci'], RD_D: ['D', 'rd'], CI_E: ['E', 'ci'], RD_E: ['E', 'rd'] };

export function criarTimeline(el, cb) {
  const st = { A: null, frame: 0, v0: 0, v1: 240, sel: null, drag: null };
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'tl-svg');
  el.appendChild(svg);
  const H = { ov: 30, gap: 10, lane: 40, eixo: 22 };
  const altura = H.ov + H.gap + 2 * H.lane + 8 + H.eixo;
  svg.setAttribute('height', altura);

  const W = () => el.clientWidth || 600;
  const n = () => st.A.trial.mot.time.length;
  const tt = (i) => st.A.trial.mot.time[Math.max(0, Math.min(n() - 1, i))];
  const xv = (i) => 50 + (i - st.v0) / (st.v1 - st.v0) * (W() - 60);      // faixas por pé
  const iv = (x) => st.v0 + (x - 50) / (W() - 60) * (st.v1 - st.v0);
  const xo = (i) => 50 + i / (n() - 1) * (W() - 60);                        // faixa geral
  const io = (x) => (x - 50) / (W() - 60) * (n() - 1);
  const jan = () => st.A.cfg.janela || [0, n() - 1];
  const cor = (l) => getComputedStyle(document.documentElement).getPropertyValue(l === 'D' ? '--d' : '--e').trim();

  function mk(tag, at, pai = svg) { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); pai.appendChild(e); return e; }

  function desenhar() {
    if (!st.A) return;
    svg.innerHTML = '';
    svg.setAttribute('width', W());
    const [j0, j1] = jan();
    // ---- faixa geral ----
    mk('text', { x: 4, y: H.ov / 2 + 4, class: 'tl-rot' }).textContent = 'Trial';
    mk('rect', { x: xo(0), y: 6, width: xo(n() - 1) - xo(0), height: H.ov - 12, class: 'tl-ov' });
    for (const [k, [l, tipo]] of Object.entries(EV)) if (tipo === 'ci') for (const i of st.A.eventos[k])
      mk('line', { x1: xo(i), x2: xo(i), y1: l === 'D' ? 8 : H.ov / 2, y2: l === 'D' ? H.ov / 2 : H.ov - 8, stroke: cor(l), 'stroke-width': 1, opacity: 0.6 });
    mk('rect', { x: xo(0), y: 4, width: Math.max(0, xo(j0) - xo(0)), height: H.ov - 8, class: 'tl-corte' });
    mk('rect', { x: xo(j1), y: 4, width: Math.max(0, xo(n() - 1) - xo(j1)), height: H.ov - 8, class: 'tl-corte' });
    mk('rect', { x: xo(st.v0), y: 3, width: Math.max(2, xo(st.v1) - xo(st.v0)), height: H.ov - 6, class: 'tl-vis' });
    for (const [lado, i] of [['ini', j0], ['fim', j1]]) {
      const g = mk('g', { class: 'tl-alca', 'data-alca': lado });
      mk('rect', { x: xo(i) - 5, y: 1, width: 10, height: H.ov - 2, rx: 3 }, g);
      mk('line', { x1: xo(i), x2: xo(i), y1: 7, y2: H.ov - 7 }, g);
    }
    if (st.brush) mk('rect', { x: xo(st.brush[0]), y: 2, width: Math.max(1, xo(st.brush[1]) - xo(st.brush[0])), height: H.ov - 4, class: 'tl-brush' });
    mk('line', { x1: xo(st.frame), x2: xo(st.frame), y1: 2, y2: H.ov - 2, class: 'tl-cursor' });
    // ---- faixas por pé ----
    const y0 = H.ov + H.gap;
    mk('rect', { x: 50, y: y0, width: W() - 60, height: 2 * H.lane, class: 'tl-fundo' });
    if (j0 > st.v0) mk('rect', { x: xv(st.v0), y: y0, width: Math.max(0, xv(Math.min(j0, st.v1)) - xv(st.v0)), height: 2 * H.lane, class: 'tl-corte' });
    if (j1 < st.v1) mk('rect', { x: xv(Math.max(j1, st.v0)), y: y0, width: Math.max(0, xv(st.v1) - xv(Math.max(j1, st.v0))), height: 2 * H.lane, class: 'tl-corte' });
    ['D', 'E'].forEach((l, li) => {
      const yl = y0 + li * H.lane;
      mk('text', { x: 4, y: yl + H.lane / 2 + 4, class: 'tl-rot', fill: cor(l) }).textContent = l === 'D' ? 'Direito' : 'Esquerdo';
      const ci = st.A.eventos['CI_' + l], rd = st.A.eventos['RD_' + l];
      // barras de apoio
      for (let k = 0; k < ci.length; k++) {
        const prox = ci[k + 1] ?? Infinity, r = rd.find(i => i > ci[k] && i < prox);
        const fim = r ?? Math.min(prox, ci[k] + 1);
        if (fim < st.v0 || ci[k] > st.v1) continue;
        const xa = Math.max(50, xv(ci[k])), xb = Math.min(W() - 10, xv(fim));
        if (xb > xa) mk('rect', { x: xa, y: yl + 10, width: Math.max(1, xb - xa), height: H.lane - 20, rx: 3, fill: cor(l), opacity: r == null ? 0.25 : 0.55 });
      }
      // marcadores
      for (const tipo of ['ci', 'rd']) {
        const k = (tipo === 'ci' ? 'CI_' : 'RD_') + l;
        for (const i of st.A.eventos[k]) {
          if (i < st.v0 - 2 || i > st.v1 + 2) continue;
          const x = xv(i), sel = st.sel && st.sel.k === k && st.sel.i === i;
          const g = mk('g', { class: 'tl-ev' + (sel ? ' sel' : ''), 'data-k': k, 'data-i': i });
          mk('rect', { x: x - 8, y: yl + 1, width: 16, height: H.lane - 2, fill: 'transparent' }, g);
          if (tipo === 'ci') mk('path', { d: `M${x - 7},${yl + 3} L${x + 7},${yl + 3} L${x},${yl + 14} Z`, fill: cor(l) }, g);
          else mk('rect', { x: x - 3, y: yl + H.lane - 15, width: 6, height: 12, rx: 1.5, fill: cor(l) }, g);
          mk('line', { x1: x, x2: x, y1: yl + 3, y2: yl + H.lane - 3, stroke: cor(l), 'stroke-width': sel ? 2.5 : 1.2 }, g);
        }
      }
    });
    // alças grandes de início/fim do trecho analisado, dentro das faixas
    for (const [lado, i] of [['ini', j0], ['fim', j1]]) {
      if (i < st.v0 - 1 || i > st.v1 + 1) continue;
      const x = xv(i), g = mk('g', { class: 'tl-alca2', 'data-alca2': lado });
      mk('rect', { x: x - 7, y: y0 - 2, width: 14, height: 2 * H.lane + 4, fill: 'transparent' }, g);
      mk('line', { x1: x, x2: x, y1: y0 - 2, y2: y0 + 2 * H.lane + 2 }, g);
      const tw = 46, tx = lado === 'ini' ? x : x - tw;
      mk('rect', { x: tx, y: y0 - 2, width: tw, height: 14, rx: 3, class: 'tl-aba' }, g);
      mk('text', { x: tx + tw / 2, y: y0 + 8.5, 'text-anchor': 'middle', class: 'tl-aba-t' }, g).textContent = lado === 'ini' ? '▶ início' : 'fim ◀';
    }
    // eixo de tempo
    const ye = y0 + 2 * H.lane + 4;
    const dur = tt(st.v1) - tt(st.v0), passo = dur > 8 ? 1 : dur > 3 ? 0.5 : dur > 1.2 ? 0.2 : 0.1;
    const fs = 1 / (tt(1) - tt(0));
    for (let s = Math.ceil(tt(st.v0) / passo) * passo; s <= tt(st.v1) + 1e-9; s += passo) {
      const x = xv(s * fs);
      mk('line', { x1: x, x2: x, y1: ye, y2: ye + 4, class: 'tl-tick' });
      mk('text', { x, y: ye + 15, class: 'tl-tick-t', 'text-anchor': 'middle' }).textContent = s.toFixed(passo < 0.5 ? 1 : 1).replace('.', ',') + ' s';
    }
    mk('line', { x1: xv(st.frame), x2: xv(st.frame), y1: y0 - 2, y2: y0 + 2 * H.lane + 2, class: 'tl-cursor' });
  }

  // ---- interação ----
  const capturar = (e) => { try { svg.setPointerCapture(e.pointerId); } catch {} };
  const ptX = (e) => e.clientX - svg.getBoundingClientRect().left;
  const ptY = (e) => e.clientY - svg.getBoundingClientRect().top;
  svg.addEventListener('pointerdown', (e) => {
    if (!st.A) return;
    const x = ptX(e), y = ptY(e);
    const alca = e.target.closest('[data-alca]'), alca2 = e.target.closest('[data-alca2]'), ev = e.target.closest('[data-k]');
    if (alca) { st.drag = { tipo: 'alca', lado: alca.dataset.alca, map: io }; capturar(e); return; }
    if (alca2) { st.drag = { tipo: 'alca', lado: alca2.dataset.alca2, map: iv }; capturar(e); return; }
    if (ev) {
      st.sel = { k: ev.dataset.k, i: +ev.dataset.i };
      st.drag = { tipo: 'ev', moveu: false };
      capturar(e);
      cb.onSeek(st.sel.i); desenhar(); return;
    }
    if (y < H.ov) { // faixa geral: clique centraliza; arrastar seleciona o trecho analisado
      st.drag = { tipo: 'brush', x0: x, i0: io(x) }; capturar(e); return;
    }
    st.sel = null; cb.onSeek(Math.round(iv(x))); desenhar();
    st.drag = { tipo: 'cursor' }; capturar(e);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!st.drag) return;
    const x = ptX(e);
    if (st.drag.tipo === 'alca') {
      const i = Math.round(Math.max(0, Math.min(n() - 1, st.drag.map(x))));
      const [j0, j1] = jan();
      st.A.cfg.janela = st.drag.lado === 'ini' ? [Math.min(i, j1 - 1), j1] : [j0, Math.max(i, j0 + 1)];
      cb.onSeek(i); desenhar();
    } else if (st.drag.tipo === 'ev') {
      const i = Math.round(Math.max(0, Math.min(n() - 1, iv(x))));
      if (i !== st.sel.i) { moverSel(i - st.sel.i, false); st.drag.moveu = true; }
    } else if (st.drag.tipo === 'cursor') cb.onSeek(Math.round(iv(x)));
    else if (st.drag.tipo === 'brush' && Math.abs(x - st.drag.x0) > 4) {
      const a = Math.max(0, Math.min(n() - 1, st.drag.i0)), b = Math.max(0, Math.min(n() - 1, io(x)));
      st.brush = [Math.round(Math.min(a, b)), Math.round(Math.max(a, b))]; desenhar();
    }
  });
  const terminar = () => {
    if (!st.drag) return;
    const d = st.drag; st.drag = null;
    if (d.tipo === 'brush') {
      if (st.brush && st.brush[1] - st.brush[0] > 5) { st.A.cfg.janela = st.brush; st.brush = null; const w = st.v1 - st.v0; setView(st.A.cfg.janela[0] - w * 0.1, st.A.cfg.janela[0] + w * 0.9); cb.onJanela(); }
      else { st.brush = null; const c = d.i0, w = st.v1 - st.v0; setView(c - w / 2, c + w / 2); cb.onSeek(Math.round(c)); }
      return;
    }
    if (d.tipo === 'alca') cb.onJanela();
    if (d.tipo === 'ev' && d.moveu) cb.onChange();
  };
  // gesto interrompido (trackpad, troca de janela) também conclui a ação
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.addEventListener(ev, terminar);
  svg.addEventListener('wheel', (e) => {
    if (!st.A) return; e.preventDefault();
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { const w = st.v1 - st.v0, d = (e.deltaX || e.deltaY) / 400 * w; setView(st.v0 + d, st.v1 + d); return; }
    const c = iv(ptX(e)), f = e.deltaY > 0 ? 1.25 : 0.8;
    setView(c - (c - st.v0) * f, c + (st.v1 - c) * f);
  }, { passive: false });
  new ResizeObserver(() => desenhar()).observe(el);

  function setView(a, b) {
    const N = n() - 1, w = Math.max(20, Math.min(N, b - a));
    a = Math.max(0, Math.min(N - w, a)); st.v0 = a; st.v1 = a + w; desenhar();
  }
  function moverSel(delta, avisar = true) {
    if (!st.sel) return false;
    const arr = st.A.eventos[st.sel.k], j = arr.indexOf(st.sel.i);
    if (j < 0) return false;
    const novo = Math.max(0, Math.min(n() - 1, st.sel.i + delta));
    arr[j] = novo; arr.sort((a, b) => a - b); st.sel.i = novo;
    cb.onSeek(novo); desenhar();
    if (avisar) cb.onChange();
    return true;
  }

  return {
    set(A) {
      const novo = st.A !== A; st.A = A;
      if (novo) { st.sel = null; const fs = 1 / (tt(1) - tt(0)); const w = Math.round(4 * fs); setView(st.frame - w / 2, st.frame + w / 2); }
      desenhar();
    },
    setFrame(f) {
      st.frame = f;
      if (st.A && (f < st.v0 || f > st.v1)) { const w = st.v1 - st.v0; setView(f - w * 0.2, f + w * 0.8); }
      else desenhar();
    },
    redesenhar: desenhar,
    selecionado: () => st.sel,
    selecionar(k, i) { st.sel = { k, i }; desenhar(); },
    limparSel() { st.sel = null; desenhar(); },
    moverSel,
    apagarSel() {
      if (!st.sel) return false;
      st.A.eventos[st.sel.k] = st.A.eventos[st.sel.k].filter(i => i !== st.sel.i);
      st.sel = null; desenhar(); cb.onChange(); return true;
    },
    visivel: () => [Math.round(st.v0), Math.round(st.v1)],
  };
}
