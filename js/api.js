// Acesso direto à conta do OpenCap (api.opencap.ai), como os scripts oficiais (opencap-processing).
// A senha vai direto para o OpenCap; aqui só fica o token, na memória desta aba (sessionStorage).
const API = 'https://api.opencap.ai/';
const CHAVE = 'marcha-opencap:token';

export const token = () => { try { return sessionStorage.getItem(CHAVE); } catch { return null; } };
export function sair() { try { sessionStorage.removeItem(CHAVE); } catch {} }

async function req(caminho, opts = {}) {
  const r = await fetch(API + caminho, { ...opts, headers: { ...(opts.headers || {}), ...(token() ? { Authorization: 'Token ' + token() } : {}) } });
  const txt = await r.text();
  let js = null; try { js = JSON.parse(txt); } catch {}
  if (!r.ok) throw Object.assign(new Error(js?.detail || js?.non_field_errors?.[0] || `Erro ${r.status} do OpenCap`), { status: r.status, corpo: js ?? txt });
  return js ?? txt;
}

export async function entrar(usuario, senha) {
  const fd = new FormData(); fd.append('username', usuario); fd.append('password', senha);
  const r = await fetch(API + 'login/', { method: 'POST', body: fd });
  const txt = await r.text(); let js = null; try { js = JSON.parse(txt); } catch {}
  if (r.ok && js?.token) { try { sessionStorage.setItem(CHAVE, js.token); } catch {} return { ok: true, resposta: js }; }
  return { ok: false, resposta: js ?? txt, status: r.status };
}

export async function listarSessoes() {
  const s = await req('sessions/valid/');
  return (Array.isArray(s) ? s : s.results || []).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}
export const sessao = (id) => req(`sessions/${id}/`);
export const trial = (id) => req(`trials/${id}/`);

const IGNORAR = /^(calibration|neutral)$/i;
export const trialsDeMovimento = (s) => (s.trials || []).filter(t => !IGNORAR.test(t.name) && t.status !== 'error');

const resultado = (t, tag) => (t.results || []).find(r => r.tag === tag)?.media;

// Monta um objeto de sessão igual ao do ZIP, mas com os arquivos baixados sob demanda.
export async function montarSessaoAPI(s, trialsEscolhidos, aoProgresso = () => {}) {
  const files = new Map();
  const add = (caminho, url) => { if (url) files.set(caminho, { text: () => fetch(url).then(r => { if (!r.ok) throw new Error('download ' + r.status); return r.text(); }), blob: () => fetch(url).then(r => { if (!r.ok) throw new Error('download ' + r.status); return r.blob(); }) }); };
  const diag = [];
  // metadados (altura/massa) vêm do trial "neutral"
  const neutro = (s.trials || []).filter(t => /^neutral$/i.test(t.name)).pop() || s.meta?.neutral_trial;
  if (neutro?.id) { try { const tn = await trial(neutro.id); add('sessionMetadata.yaml', resultado(tn, 'session_metadata')); add('OpenSimData/Model/modelo_escalado.osim', resultado(tn, 'opensim_model')); } catch {} }
  const cams = new Set();
  let k = 0;
  for (const t0 of trialsEscolhidos) {
    aoProgresso(`Lendo trial ${++k} de ${trialsEscolhidos.length}…`);
    const t = await trial(t0.id);
    const nome = t.name.replace(/\s+/g, '');
    diag.push({ trial: nome, tags: (t.results || []).map(r => r.tag + (r.device_id ? '@' + String(r.device_id).slice(0, 6) : '')), videos: (t.videos || []).length });
    add(`OpenSimData/Kinematics/${nome}.mot`, resultado(t, 'ik_results'));
    add(`MarkerData/${nome}.trc`, resultado(t, 'marker_data'));
    // vídeos sincronizados (mp4), se o OpenCap os disponibilizar como resultado
    const sync = (t.results || []).filter(r => /video/i.test(r.tag) && /\.mp4(\?|$)/i.test(r.media || ''));
    sync.forEach((r, i) => { const c = 'Cam' + i; cams.add(c); add(`Videos/${c}/InputMedia/${nome}/${nome}_sync.mp4`, r.media); });
  }
  const trials = [...files.keys()].filter(p => /^OpenSimData\/Kinematics\//.test(p)).map(p => p.split('/').pop().replace(/\.mot$/, ''));
  let meta = {};
  if (files.has('sessionMetadata.yaml')) {
    try { const y = await files.get('sessionMetadata.yaml').text(); const n = (c) => { const m = y.match(new RegExp('^' + c + ':\\s*([0-9.]+)', 'm')); return m ? +m[1] : null; }; meta = { altura: n('height_m'), massa: n('mass_kg') }; } catch (e) { diag.push({ metadados: 'falhou: ' + e.message }); }
  }
  return { id: crypto.randomUUID(), nome: s.name || ('Sessão ' + String(s.id).slice(0, 8)), files, trials, meta, cams: [...cams].sort(), diag };
}
