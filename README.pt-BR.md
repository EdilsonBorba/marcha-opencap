# Marcha OpenCap

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24289782.svg)](https://doi.org/10.5281/zenodo.24289782)

[English](README.md) · **Português**

Ferramenta para analisar **marcha e corrida** a partir dos dados do [OpenCap](https://www.opencap.ai), em português ou inglês (botão no topo da página).

**Abrir:** https://edilsonborba.github.io/marcha-opencap/

Tudo roda no navegador: os arquivos do paciente **não são enviados** a nenhum servidor.

## O que faz
1. Lê o **ZIP** baixado do OpenCap, a **pasta** descompactada (sem limite de tamanho), carrega direto da **conta do OpenCap** (login) ou abre uma **sessão pública** só com o link ou o ID, sem login.
2. Detecta os eventos **TD** (*touchdown*: o pé toca o chão) e **TO** (*toe-off*: os dedos deixam o chão), que você **confere e edita** no vídeo e no esqueleto 3D.
3. **Filtro passa-baixa** em todos os dados (Butterworth de 4ª ordem sem defasagem; automático 6 Hz marcha / 10 Hz corrida, editável ou desligado).
4. Detecta o **trecho estável** (tira a aceleração da esteira e o início/fim no solo).
5. **Esteira (com inclinação) ou solo.** Na esteira, os comprimentos vêm da velocidade informada.
6. **Corrida:** ângulo do pé no TD e padrão de contato (retropé / mediopé / antepé; Altman & Davis, 2012).
7. Calcula velocidade, cadência, passo, passada, largura do passo, apoio, balanço, duplo apoio ou tempo de voo, **simetria D×E** e **variabilidade (CV)**.
8. Curvas de quadril, joelho, tornozelo, pelve, tronco e **centro de massa nos 3 eixos** (média ± DP, 0–100 % do ciclo), com setas de sentido no eixo.
9. **Faixa de normalidade** da literatura (adultos saudáveis), escolhida pela velocidade e pela faixa etária.
10. Mostra o **esqueleto do modelo do OpenSim em 3D** ao lado do vídeo (cinemática direta do `.osim` com os ângulos do `.mot`; validado: marcadores do modelo a ~2 cm dos do OpenCap) e calcula o **centro de massa** pelas massas dos segmentos do modelo escalado.
11. Dados do participante (sexo, idade, altura, massa) vêm do OpenCap e podem ser corrigidos.
12. Avisa quando o rastreamento parece ruim (índice de regularidade).
13. **Compara** trials ou sessões (antes × depois, condições), quantos quiser.
14. Gera **laudo em PDF** (com caixa de **achados** automáticos: assimetrias ≥ 10 %, variabilidade, qualidade do rastreamento) e **Excel** com todos os dados.
15. **Salva a análise** num arquivo `.json` (marcações, ajustes e resultados). Para comparar depois, basta abrir o arquivo, mesmo sem o ZIP; com o ZIP, tudo volta a ficar editável.

## Privacidade: o que fica no seu computador
- **ZIP ou pasta:** lidos direto do seu disco, só na memória da aba.
- **Conta do OpenCap ou sessão pública (API):** cada arquivo (.mot, .trc, vídeos, modelo) é buscado direto do OpenCap quando você abre o trial e fica **só na memória da aba**: nada é gravado como arquivo e nada passa por outro servidor. Fechou ou recarregou a aba, some.
- **Login:** a senha vai direto para o OpenCap e não é guardada; o *token* de acesso fica no `sessionStorage` da aba e é apagado ao fechá-la (ou ao sair).
- **Guardado no navegador:** só as preferências de exibição e o idioma (`localStorage`); nenhum dado de paciente.
- **Cache:** como em qualquer site, o navegador pode manter cópias temporárias (sobretudo vídeos). Em computador compartilhado, use janela anônima ou limpe o cache.
- **Só é salvo se você pedir:** laudo PDF, Excel e análise `.json` (vão para Downloads). O `.json` contém o nome do paciente: guarde com cuidado.

## Sobre os eventos (TD e TO)
A detecção é automática e você escolhe o método:
- **Marcha:** posição do pé em relação ao sacro (Zeni et al., 2008).
- **Corrida:** aceleração vertical do calcâneo e do meio dos dedos + altura dos dedos (Patoz et al., 2021).
- **Também disponível:** velocidade vertical do pé (Leitch et al., 2011).

A altura do pé é medida em relação ao plano da esteira/chão (funciona com esteira inclinada). Todos os eventos podem ser **editados**: arrastar, mover quadro a quadro, apagar, marcar à mão ou limpar tudo e marcar do zero.

## Faixa de normalidade
Dados públicos (CC BY 4.0) de Fukuchi et al.: marcha (2018; adultos jovens e mais velhos, de 0,45 a 2 m/s) e corrida (2017; 2,5, 3,5 e 4,5 m/s). Flexão de quadril e joelho, dorsiflexão e adução do quadril. São dados de laboratório com marcadores: diferenças de alguns graus em relação ao OpenCap são esperadas. O arquivo `dados/normas.json` é gerado por `ferramentas/normas.py`.

## Arquivos do OpenCap usados
- `OpenSimData/Kinematics/*.mot`: ângulos
- `MarkerData/*.trc`: marcadores (eventos, comprimentos, largura)
- `Videos/Cam*/InputMedia/<trial>/<trial>_sync.mp4`: vídeo para conferir os eventos
- `OpenSimData/Model/*.osim` e `Geometry/*.vtp`: esqueleto 3D e centro de massa (sem as malhas locais, elas vêm do repositório público do OpenCap)
- `sessionMetadata.yaml`: altura, massa e sexo (o campo com o nome do participante não é lido)

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
- Altman AR, Davis IS (2012). A kinematic method for footstrike pattern detection in barefoot and shod runners. *Gait & Posture* 35:298–300.
- Leitch J et al. (2011). Identifying gait events without a force plate during running: a comparison of methods. *Gait & Posture* 33:130–132.
- Fukuchi RK, Fukuchi CA, Duarte M (2017). A public dataset of running biomechanics and the effects of running speed on lower extremity kinematics and kinetics. *PeerJ* 5:e3298.
- Fukuchi CA, Fukuchi RK, Duarte M (2018). A public dataset of overground and treadmill walking kinematics and kinetics in healthy individuals. *PeerJ* 6:e4640.
- Uhlrich SD et al. (2023). OpenCap: human movement dynamics from smartphone videos. *PLOS Comput Biol* 19:e1011462.

## Apoie o projeto
A ferramenta é gratuita e aberta. Se ela ajuda no seu trabalho, você pode me pagar um café:
- **Pix** (chave aleatória): `2a5b4d70-dbe4-458a-aa2f-dfa7e6e75549`
- **Ko-fi** (cartão ou PayPal, internacional): https://ko-fi.com/edilsonborba

Também há o botão **"Me pague um café"** no rodapé do site.

## Autor
Edilson Fernando de Borba · [Lattes](http://lattes.cnpq.br/8263176199605135) · [ORCID](https://orcid.org/0000-0002-9399-1098) · borba.edi@gmail.com
