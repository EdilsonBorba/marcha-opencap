// Faixas de normalidade (adultos saudáveis), da literatura, por atividade, velocidade e faixa etária.
// Dados em dados/normas.json (gerado por ferramentas/normas.py a partir dos datasets públicos).
let cache = null;
export async function carregarNormas() {
  if (!cache) cache = fetch(new URL('../dados/normas.json', import.meta.url)).then(r => r.ok ? r.json() : null).catch(() => null);
  return cache;
}
// atividade: 'marcha' | 'corrida'; vel: m/s; idade: anos (opcional)
export function escolherFaixa(normas, atividade, vel, idade) {
  const conj = normas?.[atividade]; if (!conj || !(vel > 0)) return null;
  let grupos = conj.grupos;
  if (atividade === 'marcha' && idade) {
    const g = grupos.filter(x => idade >= x.idadeMin && idade <= x.idadeMax);
    if (g.length) grupos = g;
    else grupos = [grupos.reduce((a, b) => Math.abs((a.idadeMin + a.idadeMax) / 2 - idade) < Math.abs((b.idadeMin + b.idadeMax) / 2 - idade) ? a : b)];
  }
  let melhor = null;
  for (const g of grupos) for (const v of g.velocidades) {
    const d = Math.abs(v.vel - vel);
    if (!melhor || d < melhor.d) melhor = { d, g, v };
  }
  if (!melhor) return null;
  const longe = melhor.d > 0.35;
  return { fonte: conj.fonte, doi: conj.doi, grupo: melhor.g.nome, velRef: melhor.v.vel, n: melhor.v.n, curvas: melhor.v.curvas, longe };
}
