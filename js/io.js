// Leitura dos dados do OpenCap: ZIP (mesmo > 2 GB, lido por partes) ou pasta descompactada.
import { ZipReader, BlobReader, BlobWriter, TextWriter } from 'https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.45/index.min.js';

// Cada sessão expõe um mapa caminho-relativo -> { text(), blob() }.
// O caminho é normalizado a partir da pasta que contém OpenSimData/MarkerData/Videos.
const ROOTS = ['OpenSimData/', 'MarkerData/', 'Videos/', 'sessionMetadata.yaml', 'CalibrationImages/', 'README.txt'];

function normalizar(path) {
  path = path.replace(/\\/g, '/');
  let best = -1;
  for (const r of ROOTS) {
    const i = path.indexOf(r);
    if (i >= 0 && (i === 0 || path[i - 1] === '/') && (best < 0 || i < best)) best = i;
  }
  return best >= 0 ? path.slice(best) : null;
}

export async function abrirZip(file) {
  const reader = new ZipReader(new BlobReader(file));
  const entries = await reader.getEntries();
  const files = new Map();
  for (const e of entries) {
    if (e.directory) continue;
    const p = normalizar(e.filename);
    if (!p || /\.(mov|pkl)$/i.test(p)) continue;
    files.set(p, {
      text: () => e.getData(new TextWriter()),
      blob: (type) => e.getData(new BlobWriter(type || 'application/octet-stream')),
    });
  }
  return montarSessao(file.name.replace(/\.zip$/i, ''), files);
}

export function abrirArquivosDePasta(fileList, nome) {
  const files = new Map();
  for (const f of fileList) {
    const p = normalizar(f.webkitRelativePath || f._relPath || f.name);
    if (!p || /\.(mov|pkl)$/i.test(p)) continue;
    files.set(p, { text: () => f.text(), blob: async () => f });
  }
  const raiz = (fileList[0]?.webkitRelativePath || fileList[0]?._relPath || '').split('/')[0];
  return montarSessao(nome || raiz || 'Pasta', files);
}

// Arrastar e soltar: aceita ZIP(s) ou pasta(s).
export async function lerItensArrastados(dataTransfer) {
  const out = [];
  const items = [...dataTransfer.items].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  for (const entry of items) {
    if (entry.isFile) {
      const f = await new Promise((res, rej) => entry.file(res, rej));
      if (/\.zip$/i.test(f.name)) out.push(await abrirZip(f));
    } else if (entry.isDirectory) {
      const lista = [];
      await percorrer(entry, entry.name, lista);
      out.push(await abrirArquivosDePasta(lista, entry.name));
    }
  }
  return out;
}

async function percorrer(dir, prefixo, lista) {
  const reader = dir.createReader();
  let lote;
  do {
    lote = await new Promise((res, rej) => reader.readEntries(res, rej));
    for (const e of lote) {
      if (e.isFile) {
        if (/\.(mov|pkl)$/i.test(e.name)) continue;
        const f = await new Promise((res, rej) => e.file(res, rej));
        f._relPath = prefixo + '/' + e.name;
        lista.push(f);
      } else if (e.isDirectory) {
        await percorrer(e, prefixo + '/' + e.name, lista);
      }
    }
  } while (lote.length);
}

async function montarSessao(nome, files) {
  const trials = [...files.keys()]
    .filter(p => /^OpenSimData\/Kinematics\/[^/]+\.mot$/i.test(p))
    .map(p => p.split('/').pop().replace(/\.mot$/i, ''))
    .sort((a, b) => a.localeCompare(b, 'pt', { numeric: true }));
  if (!trials.length) throw new Error('Não encontrei OpenSimData/Kinematics/*.mot. É uma sessão do OpenCap?');
  let meta = {};
  if (files.has('sessionMetadata.yaml')) meta = lerYaml(await files.get('sessionMetadata.yaml').text());
  const cams = new Set();
  for (const p of files.keys()) {
    const m = p.match(/^Videos\/(Cam\d+)\/InputMedia\/([^/]+)\/\2_sync\.mp4$/i);
    if (m) cams.add(m[1]);
  }
  return { id: crypto.randomUUID(), nome, files, trials, meta, cams: [...cams].sort() };
}

// Só o que interessa (altura, massa, modelo). O subjectID (nome real) nunca é lido.
function lerYaml(txt) {
  const num = (k) => { const m = txt.match(new RegExp('^' + k + ':\\s*([0-9.]+)', 'm')); return m ? parseFloat(m[1]) : null; };
  const str = (k) => { const m = txt.match(new RegExp('^' + k + ':\\s*(\\S+)', 'm')); return m ? m[1] : null; };
  return { altura: num('height_m'), massa: num('mass_kg'), modelo: str('openSimModel') };
}

export async function carregarTrial(sessao, nome) {
  const mot = parseMot(await sessao.files.get(`OpenSimData/Kinematics/${nome}.mot`).text());
  const trcF = sessao.files.get(`MarkerData/${nome}.trc`);
  const trc = trcF ? parseTrc(await trcF.text()) : null;
  const videos = {};
  for (const c of sessao.cams) {
    const p = `Videos/${c}/InputMedia/${nome}/${nome}_sync.mp4`;
    if (sessao.files.has(p)) videos[c] = p;
  }
  return { nome, mot, trc, videos };
}

export async function urlVideo(sessao, caminho) {
  const b = await sessao.files.get(caminho).blob('video/mp4');
  return URL.createObjectURL(b);
}

export function parseMot(txt) {
  const L = txt.split(/\r?\n/);
  let i = L.findIndex(l => l.trim().toLowerCase() === 'endheader');
  if (i < 0) throw new Error('Arquivo .mot sem "endheader".');
  const graus = !/inDegrees\s*=\s*no/i.test(L.slice(0, i).join('\n'));
  const cols = L[i + 1].trim().split(/\s+/);
  const data = cols.map(() => []);
  for (let k = i + 2; k < L.length; k++) {
    const s = L[k].trim(); if (!s) continue;
    const v = s.split(/\s+/);
    for (let j = 0; j < cols.length; j++) data[j].push(parseFloat(v[j]));
  }
  const c = {};
  cols.forEach((n, j) => { c[n] = Float64Array.from(data[j]); });
  if (!graus) for (const n of cols) if (!/^(time|pelvis_t[xyz])$/.test(n)) c[n] = c[n].map(x => x * 180 / Math.PI);
  return { time: c.time, cols: c, nomes: cols };
}

export function parseTrc(txt) {
  const L = txt.split(/\r?\n/);
  const info = L[2].split('\t'); const rate = parseFloat(info[0]);
  const nomes = L[3].split('\t').slice(2).filter(s => s.trim() !== '').map(s => s.trim());
  const time = [], cols = nomes.map(() => [[], [], []]);
  for (let k = 5; k < L.length; k++) {
    const s = L[k]; if (!s.trim()) continue;
    const v = s.split('\t');
    time.push(parseFloat(v[1]));
    for (let m = 0; m < nomes.length; m++) for (let a = 0; a < 3; a++) cols[m][a].push(parseFloat(v[2 + 3 * m + a]));
  }
  const markers = {};
  nomes.forEach((n, m) => { markers[n] = { x: Float64Array.from(cols[m][0]), y: Float64Array.from(cols[m][1]), z: Float64Array.from(cols[m][2]) }; });
  return { rate, time: Float64Array.from(time), markers };
}

// modelo escalado do OpenSim (lido uma vez por sessão)
export function caminhoModelo(sessao) {
  return [...sessao.files.keys()].find(p => /^OpenSimData\/Model\/[^/]+\.osim$/i.test(p)) || null;
}
