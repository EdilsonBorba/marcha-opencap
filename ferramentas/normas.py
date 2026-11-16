"""Gera dados/normas.json (faixas de normalidade) a partir dos datasets públicos de Fukuchi et al.

Corrida: Fukuchi RK, Fukuchi CA, Duarte M (2017). A public dataset of running biomechanics and the
  effects of running speed on lower extremity kinematics and kinetics. PeerJ 5:e3298.
  doi:10.6084/m9.figshare.4543435 (arquivos RBDSxxxprocessed.txt e RBDSinfo.txt)
Marcha: Fukuchi CA, Fukuchi RK, Duarte M (2018). A public dataset of overground and treadmill walking
  kinematics and kinetics in healthy individuals. PeerJ 6:e4640.
  doi:10.6084/m9.figshare.5722711 (pasta WBDSascii: arquivos *ang.txt e WBDSinfo.csv)

Uso: python3 normas.py <pasta_RBDS> <pasta_WBDS> <saida.json>
Só ângulos com convenção equivalente à do OpenSim/OpenCap: flexão do quadril, flexão do joelho,
dorsiflexão do tornozelo e adução do quadril. Média ± DP entre participantes (cada participante =
média dos lados direito e esquerdo), 101 pontos (0–100 % do ciclo).
"""
import sys, glob, os, json, re, csv
import numpy as np

def ler(f):
    """Lê tabela separada por tabulação; células vazias viram NaN."""
    linhas = open(f).read().splitlines()
    h = linhas[0].split('\t') if '\t' in linhas[0] else linhas[0].split()
    h = [x.strip() for x in h]
    d = np.full((len(linhas) - 1, len(h)), np.nan)
    for i, l in enumerate(linhas[1:]):
        for j, v in enumerate(l.split('\t')[:len(h)]):
            try: d[i, j] = float(v)
            except ValueError: pass
    return h, d


MAPA_RBDS = {'hip_flexion': ('hip', 'Z'), 'knee_angle': ('knee', 'Z'), 'ankle_angle': ('ankle', 'Z'), 'hip_adduction': ('hip', 'X')}


def resumo(lista):
    a = np.array(lista)
    return {'m': [round(float(v), 2) for v in a.mean(0)], 's': [round(float(v), 2) for v in a.std(0, ddof=1)]}


def corrida(pasta):
    vels = {'25': 2.5, '35': 3.5, '45': 4.5}
    por_vel = {v: {c: [] for c in MAPA_RBDS} for v in vels}
    arquivos = sorted(glob.glob(os.path.join(pasta, 'RBDS*processed.txt')))
    for f in arquivos:
        h, d = ler(f)
        for v in vels:
            for c, (art, eixo) in MAPA_RBDS.items():
                cols = [f'{lado}{art}Ang{eixo}{v}' for lado in 'RL']
                if not all(k in h for k in cols):
                    continue
                y = np.mean([d[:, h.index(k)] for k in cols], axis=0)
                if len(y) == 101 and np.all(np.isfinite(y)):
                    por_vel[v][c].append(y)
    velocidades = []
    for v, vv in vels.items():
        n = min(len(x) for x in por_vel[v].values())
        if n < 5:
            continue
        velocidades.append({'vel': vv, 'n': n, 'curvas': {c: resumo(x) for c, x in por_vel[v].items() if len(x) >= 5}})
    return {'fonte': 'Fukuchi et al. (2017), corrida em esteira', 'doi': '10.7717/peerj.3298',
            'grupos': [{'nome': 'adultos', 'idadeMin': 18, 'idadeMax': 65, 'velocidades': velocidades}]}


def marcha(pasta):
    info = list(csv.DictReader(open(os.path.join(pasta, 'WBDSinfo.csv'), encoding='utf-8-sig')))
    vel_de = {}
    grupo_de = {}
    for r in info:
        nome = r['FileName'].replace('.c3d', '').replace('.txt', '')
        try:
            vel_de[nome] = float(r['GaitSpeed(m/s)'])
        except ValueError:
            pass
        grupo_de[nome] = (r['AgeGroup'], int(float(r['Age'])))
    return info, vel_de, grupo_de


def marcha_curvas(pasta, mapa_cols):
    """mapa_cols: {'hip_flexion': (coluna_direita, coluna_esquerda, sinal)} definido após inspecionar os arquivos."""
    info, vel_de, grupo_de = marcha(pasta)
    arquivos = sorted(glob.glob(os.path.join(pasta, '**', '*walkT*ang.txt'), recursive=True))
    # agrupa por faixa etária e por velocidade (faixas de 0,2 m/s)
    blocos = {}
    for f in arquivos:
        base = os.path.basename(f).replace('ang.txt', '')
        if base not in vel_de:
            continue
        idade_grupo = grupo_de[base][0]
        sujeito = re.match(r'WBDS(\d+)', base).group(1)
        faixa_v = round(vel_de[base] / 0.2) * 0.2
        h, d = ler(f)
        curvas = {}
        for c, (cr, cl, sinal) in mapa_cols.items():
            if cr in h and cl in h:
                y = sinal * np.mean([d[:, h.index(cr)], d[:, h.index(cl)]], axis=0)
                if len(y) == 101 and np.all(np.isfinite(y)):   # descarta curvas incompletas
                    curvas[c] = y
        if curvas:
            blocos.setdefault((idade_grupo, round(faixa_v, 1)), {}).setdefault(sujeito, []).append((vel_de[base], curvas))
    grupos = {}
    for (g, v), por_sujeito in blocos.items():
        cur = {c: [] for c in mapa_cols}
        vs = []
        for suj, lista in por_sujeito.items():   # 1 curva por participante (média dos trials daquela faixa)
            vs.append(np.mean([x[0] for x in lista]))
            for c in mapa_cols:
                ys = [x[1][c] for x in lista if c in x[1]]
                if ys:
                    cur[c].append(np.mean(ys, axis=0))
        n = min(len(x) for x in cur.values())
        if n < 5:
            continue
        grupos.setdefault(g, []).append({'vel': round(float(np.mean(vs)), 2), 'n': n, 'curvas': {c: resumo(x) for c, x in cur.items()}})
    faixas = {'Young': ('adultos jovens', 18, 35), 'Old': ('adultos mais velhos', 50, 90), 'Older': ('adultos mais velhos', 50, 90)}
    saida = []
    for g, vel in grupos.items():
        nome, i0, i1 = faixas.get(g, (g, 18, 90))
        idades = [a for (gg, a) in grupo_de.values() if gg == g]
        if idades:
            i0, i1 = min(idades), max(idades)
        saida.append({'nome': f'{nome} ({i0}–{i1} anos)', 'idadeMin': i0, 'idadeMax': i1, 'velocidades': sorted(vel, key=lambda x: x['vel'])})
    return {'fonte': 'Fukuchi et al. (2018), marcha em esteira e no solo', 'doi': '10.7717/peerj.4640', 'grupos': saida}


if __name__ == '__main__':
    rbds, wbds, saida = sys.argv[1], sys.argv[2], sys.argv[3]
    normas = {'corrida': corrida(rbds)}
    mapa = json.loads(os.environ.get('MAPA_WBDS', '{}'))
    if mapa:
        normas['marcha'] = marcha_curvas(wbds, {k: tuple(v) for k, v in mapa.items()})
    json.dump(normas, open(saida, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('ok', {k: [(g['nome'], [(v['vel'], v['n']) for v in g['velocidades']]) for g in n['grupos']] for k, n in normas.items()})
