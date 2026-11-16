// Modelo do OpenSim (.osim) no navegador: leitura, cinemática direta e malhas (.vtp).
// Suporta o que os modelos do OpenCap usam: CustomJoint, PinJoint, WeldJoint, PhysicalOffsetFrame,
// Constant, LinearFunction, MultiplierFunction, PolynomialFunction, SimmSpline e CoordinateCouplerConstraint.

// ---------- álgebra 3×3 ----------
const I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mul = (a, b) => { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j]; return r; };
const mv = (a, v) => [a[0] * v[0] + a[1] * v[1] + a[2] * v[2], a[3] * v[0] + a[4] * v[1] + a[5] * v[2], a[6] * v[0] + a[7] * v[1] + a[8] * v[2]];
const tr = (a) => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function rotEixo(ax, ang) {
  const n = Math.hypot(ax[0], ax[1], ax[2]) || 1, x = ax[0] / n, y = ax[1] / n, z = ax[2] / n, c = Math.cos(ang), s = Math.sin(ang), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}
const rotXYZ = (o) => mul(mul(rotEixo([1, 0, 0], o[0]), rotEixo([0, 1, 0], o[1])), rotEixo([0, 0, 1], o[2])); // body-fixed X-Y-Z
// transformação = { R, p }: ponto no filho -> ponto no pai = R·x + p
const compor = (A, B) => ({ R: mul(A.R, B.R), p: add(mv(A.R, B.p), A.p) });
const inversa = (A) => { const Rt = tr(A.R); const p = mv(Rt, A.p); return { R: Rt, p: [-p[0], -p[1], -p[2]] }; };

// ---------- funções do OpenSim ----------
const nums = (s) => (s || '').trim().split(/\s+/).filter(Boolean).map(Number);
const filhos = (el) => [...el.children];
const filho = (el, tag) => filhos(el).find(c => c.tagName === tag);
const texto = (el, tag) => filho(el, tag)?.textContent ?? null;

function lerFuncao(el) {
  if (!el) return () => 0;
  switch (el.tagName) {
    case 'Constant': { const v = +texto(el, 'value'); return () => v; }
    case 'LinearFunction': { const [a, b] = nums(texto(el, 'coefficients')); return (x) => a * x + b; }
    case 'PolynomialFunction': { const c = nums(texto(el, 'coefficients')); return (x) => c.reduce((s, k) => s * x + k, 0); }
    case 'MultiplierFunction': { const s = +(texto(el, 'scale') ?? 1); const f = lerFuncao(filhos(filho(el, 'function') || el).find(c => c.tagName !== 'scale') || null); return (x) => s * f(x); }
    case 'SimmSpline': case 'NaturalCubicSpline': return spline(nums(texto(el, 'x')), nums(texto(el, 'y')));
    case 'PiecewiseLinearFunction': { const X = nums(texto(el, 'x')), Y = nums(texto(el, 'y')); return (x) => { if (x <= X[0]) return Y[0]; for (let i = 1; i < X.length; i++) if (x <= X[i]) return Y[i - 1] + (Y[i] - Y[i - 1]) * (x - X[i - 1]) / (X[i] - X[i - 1]); return Y[Y.length - 1]; }; }
    default: console.warn('Função do OpenSim não suportada:', el.tagName); return () => 0;
  }
}
// spline cúbica natural (a SimmSpline do OpenSim difere pouco nas pontas)
function spline(X, Y) {
  const n = X.length;
  if (n < 3) return (x) => n === 2 ? Y[0] + (Y[1] - Y[0]) * (x - X[0]) / (X[1] - X[0]) : (Y[0] ?? 0);
  const h = [], al = [0], l = [1], mu = [0], z = [0], c = new Array(n).fill(0), b = [], d = [];
  for (let i = 0; i < n - 1; i++) h.push(X[i + 1] - X[i]);
  for (let i = 1; i < n - 1; i++) al.push(3 / h[i] * (Y[i + 1] - Y[i]) - 3 / h[i - 1] * (Y[i] - Y[i - 1]));
  for (let i = 1; i < n - 1; i++) { l[i] = 2 * (X[i + 1] - X[i - 1]) - h[i - 1] * mu[i - 1]; mu[i] = h[i] / l[i]; z[i] = (al[i] - h[i - 1] * z[i - 1]) / l[i]; }
  for (let j = n - 2; j >= 0; j--) { c[j] = (z[j] ?? 0) - (mu[j] ?? 0) * c[j + 1]; b[j] = (Y[j + 1] - Y[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3; d[j] = (c[j + 1] - c[j]) / (3 * h[j]); }
  return (x) => {
    let j = 0; if (x >= X[n - 1]) j = n - 2; else while (j < n - 2 && x > X[j + 1]) j++;
    const t = x - X[j]; return Y[j] + b[j] * t + c[j] * t * t + d[j] * t * t * t;
  };
}

// ---------- leitura do .osim ----------
export function lerModelo(xmlTexto) {
  const doc = new DOMParser().parseFromString(xmlTexto, 'application/xml');
  const modelo = doc.getElementsByTagName('Model')[0];
  if (!modelo) throw new Error('Arquivo .osim sem <Model>.');
  const corpos = {}, juntas = [], coords = {}, acopl = [], marcadores = {};
  for (const b of doc.querySelectorAll('BodySet > objects > Body')) {
    const geos = [];
    for (const m of b.querySelectorAll('attached_geometry > Mesh')) geos.push({ arquivo: texto(m, 'mesh_file'), escala: nums(texto(m, 'scale_factors') || '1 1 1') });
    corpos[b.getAttribute('name')] = { geos, massa: +(texto(b, 'mass') || 0), cm: nums(texto(b, 'mass_center') || '0 0 0') };
  }
  for (const j of doc.querySelectorAll('JointSet > objects > *')) {
    const tipo = j.tagName, nome = j.getAttribute('name');
    const frames = {};
    for (const f of j.querySelectorAll(':scope > frames > PhysicalOffsetFrame')) {
      frames[f.getAttribute('name')] = { pai: (texto(f, 'socket_parent') || '').split('/').pop(), X: { R: rotXYZ(nums(texto(f, 'orientation') || '0 0 0')), p: nums(texto(f, 'translation') || '0 0 0') } };
    }
    const resolve = (nm) => frames[nm] ? frames[nm] : { pai: nm.split('/').pop(), X: { R: I3(), p: [0, 0, 0] } };
    const pf = resolve(texto(j, 'socket_parent_frame')), cf = resolve(texto(j, 'socket_child_frame'));
    const cs = [...j.querySelectorAll(':scope > coordinates > Coordinate')].map(c => c.getAttribute('name'));
    cs.forEach(c => { coords[c] = { padrao: +(texto(j.querySelector(`Coordinate[name="${c}"]`), 'default_value') || 0), rot: true }; });
    const eixos = [];
    if (tipo === 'CustomJoint') {
      for (const ta of j.querySelectorAll(':scope > SpatialTransform > TransformAxis')) {
        const nmEixo = ta.getAttribute('name'), cc = nums(''), cn = (texto(ta, 'coordinates') || '').trim().split(/\s+/).filter(Boolean);
        const fEl = filhos(ta).find(c => !['coordinates', 'axis'].includes(c.tagName));
        const tipoEixo = nmEixo.startsWith('rotation') ? 'R' : 'T';
        cn.forEach(c => { if (!coords[c]) return; (coords[c].usos ||= new Set()).add(tipoEixo); });
        eixos.push({ tipo: tipoEixo, eixo: nums(texto(ta, 'axis')), coord: cn[0] || null, f: cn.length ? lerFuncao(fEl) : () => 0 });
      }
    } else if (tipo === 'PinJoint') {
      eixos.push({ tipo: 'R', eixo: [0, 0, 1], coord: cs[0], f: (x) => x });
    } else if (tipo === 'SliderJoint') {
      eixos.push({ tipo: 'T', eixo: [1, 0, 0], coord: cs[0], f: (x) => x }); if (coords[cs[0]]) coords[cs[0]].rot = false;
    } else if (tipo !== 'WeldJoint') console.warn('Articulação não suportada:', tipo, nome);
    juntas.push({ nome, tipo, pai: pf.pai, Xpai: pf.X, filho: cf.pai, Xfilho: cf.X, eixos });
  }
  // coordenada só é translacional se só aparece em eixos de translação (o joelho usa o ângulo também nas translações)
  for (const c of Object.values(coords)) if (c.usos) { c.rot = c.usos.has('R'); delete c.usos; }
  for (const c of doc.querySelectorAll('CoordinateCouplerConstraint')) {
    if ((texto(c, 'isEnforced') || 'true').trim() === 'false') continue;
    const ind = (texto(c, 'independent_coordinate_names') || '').trim().split(/\s+/)[0];
    const dep = (texto(c, 'dependent_coordinate_name') || '').trim();
    const fEl = filho(c, 'coupled_coordinates_function'); const fn = fEl ? lerFuncao(filhos(fEl)[0]) : (x) => x;
    const esc = +(texto(c, 'scale_factor') ?? 1);
    acopl.push({ ind, dep, f: (x) => esc * fn(x) });
  }
  for (const m of doc.querySelectorAll('MarkerSet > objects > Marker'))
    marcadores[m.getAttribute('name')] = { corpo: (texto(m, 'socket_parent_frame') || '').split('/').pop(), pos: nums(texto(m, 'location')) };
  // ordena as juntas a partir do chão
  const ordem = [], feitos = new Set(['ground']);
  let mudou = true;
  while (mudou) { mudou = false; for (const j of juntas) if (!ordem.includes(j) && feitos.has(j.pai)) { ordem.push(j); feitos.add(j.filho); mudou = true; } }
  const naoLigados = Object.keys(corpos).filter(c => !feitos.has(c));
  if (naoLigados.length) console.warn('Corpos não ligados ao chão:', naoLigados);
  return { corpos, juntas: ordem, coords, acopl, marcadores, nome: modelo.getAttribute('name') };
}

// valores: { coordenada: valor em rad ou m }. Devolve { corpo: {R, p} } no referencial do chão.
export function cinematica(modelo, valores) {
  const q = {};
  for (const [c, info] of Object.entries(modelo.coords)) q[c] = valores[c] ?? info.padrao;
  for (const a of modelo.acopl) if (a.ind in q) q[a.dep] = a.f(q[a.ind]);
  const X = { ground: { R: I3(), p: [0, 0, 0] } };
  for (const j of modelo.juntas) {
    const P = X[j.pai]; if (!P) continue;
    let R = I3(); const t = [0, 0, 0];
    for (const e of j.eixos) {
      const v = e.f(e.coord ? (q[e.coord] ?? 0) : 0);
      if (e.tipo === 'R') R = mul(R, rotEixo(e.eixo, v));
      else { const n = Math.hypot(...e.eixo) || 1; t[0] += e.eixo[0] / n * v; t[1] += e.eixo[1] / n * v; t[2] += e.eixo[2] / n * v; }
    }
    // chão → corpo pai → frame pai → (movimento da junta) → frame filho → corpo filho
    X[j.filho] = compor(compor(compor(P, j.Xpai), { R, p: t }), inversa(j.Xfilho));
  }
  return X;
}

// coordenadas de uma linha do .mot → valores em rad/m
export function valoresDoMot(modelo, mot, i) {
  const v = {};
  for (const [c, info] of Object.entries(modelo.coords)) {
    const col = mot.cols[c]; if (!col) continue;
    v[c] = info.rot ? col[i] * Math.PI / 180 : col[i];
  }
  return v;
}

export function posicaoMarcador(modelo, X, nome) {
  const m = modelo.marcadores[nome]; if (!m || !X[m.corpo]) return null;
  return add(mv(X[m.corpo].R, m.pos), X[m.corpo].p);
}

// centro de massa do corpo todo (média das posições dos centros de massa dos segmentos, ponderada pela massa)
export function centroMassa(modelo, X) {
  let m = 0; const c = [0, 0, 0];
  for (const [nome, b] of Object.entries(modelo.corpos)) {
    if (!b.massa || !X[nome]) continue;
    const p = add(mv(X[nome].R, b.cm), X[nome].p);
    c[0] += b.massa * p[0]; c[1] += b.massa * p[1]; c[2] += b.massa * p[2]; m += b.massa;
  }
  return m ? [c[0] / m, c[1] / m, c[2] / m] : null;
}
export const massaTotal = (modelo) => Object.values(modelo.corpos).reduce((s, b) => s + (b.massa || 0), 0);

// ---------- malhas .vtp (XML ASCII) ----------
export function lerVTP(txt) {
  const arr = (nome) => { const m = txt.match(new RegExp(`<DataArray[^>]*Name="${nome}"[^>]*>([\\s\\S]*?)</DataArray>`)); return m ? nums(m[1]) : null; };
  const ptsBloco = txt.match(/<Points>[\s\S]*?<DataArray[^>]*>([\s\S]*?)<\/DataArray>/);
  const pts = ptsBloco ? nums(ptsBloco[1]) : [];
  const polys = txt.match(/<Polys>([\s\S]*?)<\/Polys>/);
  const tri = [];
  if (polys) {
    const con = nums((polys[1].match(/Name="connectivity"[^>]*>([\s\S]*?)<\/DataArray>/) || [])[1]);
    const off = nums((polys[1].match(/Name="offsets"[^>]*>([\s\S]*?)<\/DataArray>/) || [])[1]);
    let ini = 0;
    for (const o of off) { for (let k = ini + 1; k < o - 1; k++) tri.push(con[ini], con[k], con[k + 1]); ini = o; }
  }
  return { pontos: Float32Array.from(pts), triangulos: Uint32Array.from(tri), normais: arr('Normals') };
}
