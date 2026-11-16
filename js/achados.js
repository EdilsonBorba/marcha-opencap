// "Achados": sinalização automática do que merece atenção (sem interpretação clínica).
import { VARS, ANGULOS } from './gait.js';

const nomeVar = (k) => VARS.find(v => v[0] === k)?.[1] || k;
const nomeCurva = (c) => ANGULOS.find(a => a[0] === c)?.[1] || c;

// trechos contíguos (em % do ciclo) onde a condição é verdadeira (reservado para uso futuro)
export function trechos(bool) {
  const out = []; let ini = null;
  bool.forEach((b, i) => { if (b && ini == null) ini = i; if ((!b || i === bool.length - 1) && ini != null) { out.push([ini, b ? i : i - 1]); ini = null; } });
  return out.filter(([a, b]) => b - a >= 4);
}

export function calcularAchados(A, faixa, fmt) {
  const R = A.res, T = R.tab, lista = [];
  const ok = R.passadas.filter(p => !p.excluida);
  const nD = ok.filter(p => p.lado === 'D').length, nE = ok.filter(p => p.lado === 'E').length;
  if (A.det?.qualidade != null && A.det.qualidade < 0.6)
    lista.push({ n: 'alerta', t: `Rastreamento irregular (índice ${fmt(A.det.qualidade, 2)}): confira os eventos no vídeo antes de usar os números.` });
  if (nD < 5 || nE < 5)
    lista.push({ n: 'alerta', t: `Poucas passadas analisadas (D ${nD}, E ${nE}): resultados menos estáveis.` });
  // assimetrias ≥ 10 %
  for (const [k] of VARS) {
    const v = T[k]; if (!v || v.si == null || Math.abs(v.si) < 10) continue;
    lista.push({ n: 'atencao', t: `Assimetria em ${nomeVar(k).toLowerCase()}: ${v.si > 0 ? '+' : ''}${fmt(v.si, 1)}% (maior à ${v.si > 0 ? 'direita' : 'esquerda'}).` });
  }
  // variabilidade do tempo da passada
  const cv = T.duracao?.geral?.cv;
  if (cv != null && cv > 5) lista.push({ n: 'atencao', t: `Variabilidade do tempo da passada de ${fmt(cv, 1)}% (acima de 5%).` });
  // padrão de contato (corrida)
  if (R.atividade === 'corrida' && R.padrao?.D && R.padrao?.E) {
    const p = R.padrao;
    lista.push({ n: 'info', t: `Padrão de contato: D ${p.D.pred} (${fmt(p.D.pct, 0)}% das passadas), E ${p.E.pred} (${fmt(p.E.pct, 0)}%).` });
  }
  // As curvas NÃO são sinalizadas automaticamente: a comparação ponto a ponto com dados de laboratório
  // (outro sistema, outra velocidade, fase de apoio diferente) gera alarmes falsos. A faixa cinza fica nos
  // gráficos para avaliação visual.
  if (faixa?.longe) lista.push({ n: 'info', t: `Velocidade de referência da faixa normal (${fmt(faixa.velRef, 1)} m/s) distante da do paciente.` });
  return lista;
}
