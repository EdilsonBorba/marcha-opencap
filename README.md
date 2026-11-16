# Marcha OpenCap

Ferramenta em português para analisar **marcha e corrida** a partir dos dados do [OpenCap](https://www.opencap.ai), pensada para uso clínico e em aula.

**Abrir:** https://edilsonborba.github.io/marcha-opencap/

Tudo roda no navegador: os arquivos do paciente **não são enviados** a nenhum servidor.

## O que faz
1. Lê o **ZIP** baixado do OpenCap ou a **pasta** descompactada (pasta = sem limite de tamanho).
2. Detecta os eventos automaticamente (contato inicial e retirada do pé), e você **confere e corrige no vídeo**.
   - Marcha: posição do pé em relação ao sacro (Zeni et al., 2008).
   - Corrida: aceleração vertical do calcâneo e do meio dos dedos + altura dos dedos (Patoz et al., 2021). Também disponível: velocidade vertical (Leitch et al., 2011).
   - A altura do pé é medida em relação ao plano da esteira/chão, estimado dos pés apoiados (funciona com esteira inclinada).
3. Detecta o **trecho estável** (tira a aceleração da esteira e o início/fim no solo).
4. **Esteira ou solo.** Na esteira, os comprimentos vêm da velocidade informada.
5. Calcula velocidade, cadência, passo, passada, largura do passo, apoio, balanço, duplo apoio ou tempo de voo, **simetria D×E**, **variabilidade (CV)** e as curvas de quadril, joelho, tornozelo e pelve (média ± DP, 0–100 % do ciclo).
6. Avisa quando o rastreamento parece ruim (índice de regularidade).
7. **Compara** trials ou sessões (antes × depois, condições).
8. Gera **laudo em PDF** e **Excel** com todos os dados.

## Arquivos do OpenCap usados
- `OpenSimData/Kinematics/*.mot`: ângulos
- `MarkerData/*.trc`: marcadores (eventos, comprimentos, largura)
- `Videos/Cam*/InputMedia/<trial>/<trial>_sync.mp4`: vídeo para conferir os eventos
- `sessionMetadata.yaml`: altura e massa (o campo com o nome do participante não é lido)

## Limitações
Os valores são estimativas a partir de vídeo. A detecção de eventos é automática e deve ser conferida. As faixas de normalidade ainda não estão incluídas.

## Rodar localmente
```
python3 -m http.server 8000
```
e abrir http://localhost:8000

## Referências
- Zeni JA, Richards JG, Higginson JS (2008). Two simple methods for determining gait events during treadmill and overground walking using kinematic data. *Gait & Posture* 27:710–714.
- Patoz A, Lussiana T, Gindre C, Malatesta D (2021). A novel kinematic detection of foot-strike and toe-off events during noninstrumented treadmill running to estimate contact time. *J Biomech* 128:110737.
- Leitch J et al. (2011). Identifying gait events without a force plate during running: a comparison of methods. *Gait & Posture* 33:130–132.
- Uhlrich SD et al. (2023). OpenCap: human movement dynamics from smartphone videos. *PLOS Comput Biol* 19:e1011462.
