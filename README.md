# Marcha OpenCap

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24289782.svg)](https://doi.org/10.5281/zenodo.24289782)

Ferramenta em português para analisar **marcha e corrida** a partir dos dados do [OpenCap](https://www.opencap.ai).

**Abrir:** https://edilsonborba.github.io/marcha-opencap/

Tudo roda no navegador: os arquivos do paciente **não são enviados** a nenhum servidor.

## O que faz
1. Lê o **ZIP** baixado do OpenCap, a **pasta** descompactada (sem limite de tamanho) ou carrega direto da **conta do OpenCap** (login, experimental).
2. Detecta os eventos **TD** (*touchdown*: o pé toca o chão) e **TO** (*toe-off*: os dedos deixam o chão), que você **confere e edita** no vídeo e no esqueleto 3D.
3. Detecta o **trecho estável** (tira a aceleração da esteira e o início/fim no solo).
4. **Esteira (com inclinação) ou solo.** Na esteira, os comprimentos vêm da velocidade informada.
5. Calcula velocidade, cadência, passo, passada, largura do passo, apoio, balanço, duplo apoio ou tempo de voo, **simetria D×E** e **variabilidade (CV)**.
6. Curvas de quadril, joelho, tornozelo, pelve, tronco e **centro de massa nos 3 eixos** (média ± DP, 0–100 % do ciclo), com setas de sentido no eixo.
7. Mostra o **esqueleto do modelo do OpenSim em 3D** ao lado do vídeo (cinemática direta do `.osim` com os ângulos do `.mot`; validado: marcadores do modelo a ~2 cm dos do OpenCap) e calcula o **centro de massa** pelas massas dos segmentos do modelo escalado: oscilação vertical e calcanhar à frente do centro de massa no TD.
8. Avisa quando o rastreamento parece ruim (índice de regularidade).
9. **Compara** trials ou sessões (antes × depois, condições), quantos quiser.
10. Gera **laudo em PDF** e **Excel** com todos os dados.

## Sobre os eventos (TD e TO)
A detecção é automática e você escolhe o método:
- **Marcha:** posição do pé em relação ao sacro (Zeni et al., 2008).
- **Corrida:** aceleração vertical do calcâneo e do meio dos dedos + altura dos dedos (Patoz et al., 2021).
- **Também disponível:** velocidade vertical do pé (Leitch et al., 2011).

A altura do pé é medida em relação ao plano da esteira/chão (funciona com esteira inclinada). Todos os eventos podem ser **editados**: arrastar, mover quadro a quadro, apagar, marcar à mão ou limpar tudo e marcar do zero.

## Arquivos do OpenCap usados
- `OpenSimData/Kinematics/*.mot`: ângulos
- `MarkerData/*.trc`: marcadores (eventos, comprimentos, largura)
- `Videos/Cam*/InputMedia/<trial>/<trial>_sync.mp4`: vídeo para conferir os eventos
- `OpenSimData/Model/*.osim` e `Geometry/*.vtp`: esqueleto 3D e centro de massa (sem as malhas locais, elas vêm do repositório público do OpenCap)
- `sessionMetadata.yaml`: altura e massa (o campo com o nome do participante não é lido)

## Próximas etapas
- **Faixas de normalidade** da literatura atrás das curvas e das variáveis (por velocidade, marcha e corrida).
- Mais variáveis específicas da corrida.

Os valores são estimativas a partir de vídeo (OpenCap) e devem ser interpretados com julgamento clínico.

## Rodar no seu computador (opcional)
Não é preciso: basta abrir o link acima. Para usar uma cópia local (por exemplo, para modificar o código):

1. Baixe o código: botão verde **Code → Download ZIP** nesta página (e descompacte), ou, no terminal:
   ```
   git clone https://github.com/EdilsonBorba/marcha-opencap.git
   ```
2. Entre na pasta e inicie um servidor local (o Python já vem no macOS):
   ```
   cd marcha-opencap
   python3 -m http.server 8000
   ```
3. Abra **http://localhost:8000** no Chrome ou no Edge.

Abrir o `index.html` com dois cliques não funciona: o navegador bloqueia os módulos JavaScript fora de um servidor. As bibliotecas (gráficos, PDF, Excel, 3D) são baixadas da internet ao abrir a página.

## Como citar
Borba, E. F. de. *Marcha OpenCap: análise de marcha e corrida a partir de dados do OpenCap* [software]. Zenodo. https://doi.org/10.5281/zenodo.24289782

## Referências
- Zeni JA, Richards JG, Higginson JS (2008). Two simple methods for determining gait events during treadmill and overground walking using kinematic data. *Gait & Posture* 27:710–714.
- Patoz A, Lussiana T, Gindre C, Malatesta D (2021). A novel kinematic detection of foot-strike and toe-off events during noninstrumented treadmill running to estimate contact time. *J Biomech* 128:110737.
- Leitch J et al. (2011). Identifying gait events without a force plate during running: a comparison of methods. *Gait & Posture* 33:130–132.
- Uhlrich SD et al. (2023). OpenCap: human movement dynamics from smartphone videos. *PLOS Comput Biol* 19:e1011462.

## Autor
Edilson Fernando de Borba · [Lattes](http://lattes.cnpq.br/8263176199605135) · [ORCID](https://orcid.org/0000-0002-9399-1098) · borba.edi@gmail.com
