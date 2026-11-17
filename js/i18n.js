// Português ⇄ English. A interface é escrita em português; em inglês, os textos são traduzidos por
// dicionário (frases mais longas primeiro), inclusive os que aparecem depois (resultados, gráficos).
const CHAVE = 'marcha-opencap:lang';
let lang = (() => { try { return localStorage.getItem(CHAVE) || ((navigator.language || 'pt').startsWith('pt') ? 'pt' : 'en'); } catch { return 'pt'; } })();
export const idioma = () => lang;
export const locale = () => (lang === 'en' ? 'en-US' : 'pt-BR');

const D = [
  // cabeçalho e navegação
  ['Análise de marcha e corrida a partir dos dados do OpenCap · tudo roda neste computador, nada é enviado', 'Gait and running analysis from OpenCap data · everything runs on this computer, nothing is uploaded'],
  ['1 Dados', '1 Data'], ['2 Trial', '2 Trial'], ['3 Eventos', '3 Events'], ['4 Resultados', '4 Results'], ['5 Comparar', '5 Compare'], ['6 Laudo', '6 Report'],
  // passo 1
  ['Carregar a sessão do OpenCap', 'Load the OpenCap session'],
  ['Arquivo do OpenCap', 'OpenCap file'], ['Arraste aqui o ZIP ou a pasta descompactada.', 'Drop the ZIP or the unzipped folder here.'], ['ZIP muito grande? Use a pasta: não há limite de tamanho.', 'ZIP too large? Use the folder: there is no size limit.'], ['Abra um arquivo .json salvo antes (para comparar com avaliações anteriores).', 'Open a .json file saved earlier (to compare with previous assessments).'], ['Abrir análise (.json)', 'Open analysis (.json)'], ['Conta do OpenCap', 'OpenCap account'], ['Usuário ou e-mail', 'Username or e-mail'], ['A senha vai direto para o OpenCap; aqui só fica o acesso temporário desta aba.', 'The password goes straight to OpenCap; only temporary access is kept in this tab.'], ['Sessão pública', 'Public session'], ['Link ou ID da sessão', 'Session link or ID'], ['Abrir sessão', 'Open session'], ['Sem login: funciona com sessões marcadas como públicas no OpenCap.', 'No login: works with sessions set to public on OpenCap.'], ['Diagnóstico da conexão com o OpenCap', 'OpenCap connection diagnostics'], ['Pode carregar várias sessões (ex.: antes e depois), de qualquer origem.', 'You can load several sessions (e.g., before and after), from any source.'], ['Sessão não encontrada ou sem acesso.', 'Session not found or no access.'], ['Sessão não encontrada ou não é pública. No OpenCap, marque a sessão como pública ou entre com a conta.', 'Session not found or not public. On OpenCap, make the session public or sign in.'], ['Não encontrei um ID de sessão válido (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).', 'No valid session ID found (format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).'],
  ['Baixando o trial do OpenCap… (pode levar até 1 minuto)', 'Downloading the trial from OpenCap… (may take up to 1 minute)'],
  ['Avaliação anterior', 'Previous assessment'], ['Abra uma análise salva (.json) para revisar ou comparar.', 'Open a saved analysis (.json) to review or compare.'], ['Funciona mesmo sem o ZIP; com o ZIP, volta a ser editável.', 'Works even without the ZIP; with the ZIP it becomes editable again.'], ['Entre e escolha a sessão e os trials.', 'Sign in and pick the session and trials.'], ['Cole o link ou o ID da sessão.', 'Paste the session link or ID.'],
  ['Escolher o ZIP baixado do OpenCap', 'Choose the ZIP downloaded from OpenCap'], ['Escolher a pasta descompactada', 'Choose the unzipped folder'],
  ['Me pague um café', 'Buy me a coffee'], ['A ferramenta é gratuita e aberta. Se ela ajuda no seu trabalho, considere apoiar o desenvolvimento.', 'This tool is free and open. If it helps your work, consider supporting its development.'],
  ['(Brasil)', '(Brazil)'], ['(internacional)', '(international)'], ['Cartão ou PayPal, de qualquer país, em dólar.', 'Card or PayPal, from any country, in US dollars.'], ['Apoiar pelo Ko-fi', 'Support on Ko-fi'],
  ['Copiar Pix copia e cola', 'Copy Pix code'], ['Copiar chave Pix', 'Copy Pix key'], ['Chave aleatória', 'Random key'], ['Copiado!', 'Copied!'], ['Não consegui copiar; selecione a chave', 'Could not copy; select the key'], ['Fechar', 'Close'],
  ['Arraste aqui o', 'Drop here the'], ['baixado do OpenCap', 'downloaded from OpenCap'], ['ou a pasta', 'or the unzipped'], [' descompactada.', ' folder.'],
  ['Escolher ZIP', 'Choose ZIP'], ['Escolher pasta', 'Choose folder'],
  ['Pode carregar várias sessões (ex.: antes e depois). ZIP muito grande? Use a pasta descompactada: não há limite de tamanho.', 'You can load several sessions (e.g., before and after). ZIP too large? Use the unzipped folder: there is no size limit.'],
  ['Abrir análise salva (.json)', 'Open saved analysis (.json)'],
  ['Ou entre com a sua conta do OpenCap', 'Or sign in with your OpenCap account'],
  ['(experimental · escolha a sessão e os trials sem baixar o ZIP)', '(experimental · pick the session and trials without downloading the ZIP)'],
  ['Usuário ou e-mail do OpenCap', 'OpenCap username or e-mail'], ['Senha', 'Password'], ['Entrar', 'Sign in'], ['Sair', 'Sign out'],
  ['A senha vai direto para o OpenCap (api.opencap.ai). Esta página guarda só o acesso temporário, nesta aba, e esquece ao fechar.', 'The password goes straight to OpenCap (api.opencap.ai). This page keeps only a temporary access token, in this tab, and forgets it when closed.'],
  ['Carregar trials marcados', 'Load checked trials'], ['Marcar todos', 'Check all'], ['Desmarcar todos', 'Uncheck all'],
  ['Diagnóstico (para conferir a conexão)', 'Diagnostics (to check the connection)'],
  ['sessões na conta', 'sessions in the account'], ['escolha…', 'choose…'], ['sem nome', 'unnamed'],
  ['Escolha a sessão.', 'Choose the session.'], ['Buscando suas sessões…', 'Fetching your sessions…'], ['Entrando…', 'Signing in…'], ['Lendo a sessão…', 'Reading the session…'],
  ['trials. Marque os que quer analisar.', 'trials. Check the ones to analyze.'], ['Sem trials processados.', 'No processed trials.'],
  ['Marque pelo menos um trial.', 'Check at least one trial.'], ['Você saiu da conta.', 'You signed out.'],
  ['O OpenCap não aceitou o login. Veja o diagnóstico.', 'OpenCap did not accept the login. See diagnostics.'],
  ['O OpenCap não devolveu os arquivos de cinemática destes trials. Veja o diagnóstico.', 'OpenCap did not return kinematics files for these trials. See diagnostics.'],
  ['O navegador não conseguiu baixar os arquivos do OpenCap (bloqueio do servidor de arquivos). Veja o diagnóstico.', 'The browser could not download the OpenCap files (blocked by the file server). See diagnostics.'],
  ['(sem vídeo sincronizado pela API; use o esqueleto)', '(no synchronized video from the API; use the skeleton)'],
  ['Lendo trial', 'Reading trial'],
  ['sessão(ões) carregada(s).', 'session(s) loaded.'], ['câmera(s)', 'camera(s)'], ['Lendo…', 'Reading…'], ['Lendo ', 'Reading '], ['pasta', 'folder'],
  ['Arraste um arquivo .zip ou uma pasta do OpenCap.', 'Drop an OpenCap .zip file or folder.'], ['Não consegui ler: ', 'Could not read: '],
  ['Análise salva aberta:', 'Saved analysis opened:'], ['trial(s) de', 'trial(s) from'],
  ['Os trials da mesma sessão recebem as marcações salvas ao serem abertos.', 'Trials of the same session get the saved marks when opened.'],
  ['Já podem ser usados na comparação (passo 5).', 'They can now be used in the comparison (step 5).'],
  // passo 2
  ['Trial e condições da coleta', 'Trial and recording conditions'], ['Rótulo (aparece no laudo)', 'Label (shown in the report)'], ['ex.: Pré · 4 km/h', 'e.g., Pre · 4 km/h'],
  ['Local', 'Setting'], ['Esteira', 'Treadmill'], ['Solo', 'Overground'],
  ['Velocidade da esteira (km/h)', 'Treadmill speed (km/h)'], ['obrigatório na esteira', 'required on treadmill'],
  ['Inclinação da esteira', 'Treadmill incline'], ['vazio = estimar', 'empty = estimate'],
  ['Atividade', 'Activity'], ['Automático (marcha: Zeni · corrida: Patoz)', 'Automatic (walking: Zeni · running: Patoz)'], ['Automático', 'Automatic'],
  ['Detecção dos eventos', 'Event detection'], ['Referência do ângulo do pé', 'Foot angle reference'], ['Pé apoiado no meio do apoio (padrão)', 'Foot flat at mid-stance (default)'], ['Trial em pé do OpenCap (neutral)', 'OpenCap standing trial (neutral)'],
  ['Ângulo do pé no TD', 'Foot angle at TD'], ['Padrão de contato no TD:', 'Foot strike pattern at TD:'], ['Padrão de contato:', 'Foot strike pattern:'], ['padrão no TD', 'pattern at TD'], ['retropé', 'rearfoot'], ['mediopé', 'midfoot'], ['antepé', 'forefoot'], ['pé ', 'foot '], ['das passadas', 'of strides'],
  ['Achados (sinalização automática; não substitui a avaliação clínica)', 'Findings (automatic flags; do not replace clinical assessment)'], ['sinalização automática; não substitui a avaliação clínica', 'automatic flags; do not replace clinical assessment'], ['Achados', 'Findings'],
  ['Nenhum achado sinalizado (assimetrias < 10%, variabilidade ≤ 5%, rastreamento regular).', 'No findings flagged (asymmetries < 10%, variability ≤ 5%, regular tracking).'],
  ['Rastreamento irregular', 'Irregular tracking'], [': confira os eventos no vídeo antes de usar os números.', ': check the events on video before using the numbers.'],
  ['Poucas passadas analisadas', 'Few strides analyzed'], [': resultados menos estáveis.', ': less stable results.'], ['Assimetria em', 'Asymmetry in'], ['maior à direita', 'larger on the right'], ['maior à esquerda', 'larger on the left'],
  ['Variabilidade do tempo da passada de', 'Stride time variability of'], ['(acima de 5%)', '(above 5%)'], ['forma da curva além de 2 DP da faixa normal em', 'curve shape beyond 2 SD of the normative band in'], ['do ciclo', 'of the cycle'], ['curva deslocada', 'curve offset by'], ['em média em relação à referência (pode ser diferença de convenção entre OpenCap e laboratório).', 'on average relative to the reference (may be a convention difference between OpenCap and the laboratory).'],
  ['Velocidade de referência da faixa normal', 'Normative band reference speed'], ['distante da do paciente.', 'far from the patient’s.'], ['(direito)', '(right)'], ['(esquerdo)', '(left)'],
  ['tempo da passada', 'stride time'], ['tempo do passo', 'step time'], ['tempo de apoio', 'stance time'], ['tempo de balanço', 'swing time'], ['comprimento da passada', 'stride length'], ['comprimento do passo', 'step length'], ['apoio', 'stance'], ['duplo apoio', 'double support'], ['tempo de voo', 'flight time'], ['oscilação vertical do centro de massa', 'vertical oscillation of the center of mass'], ['Filtro passa-baixa (Hz; Butterworth 4ª ordem, sem defasagem)', 'Low-pass filter (Hz; 4th-order zero-lag Butterworth)'], ['Filtro passa-baixa (Hz)', 'Low-pass filter (Hz)'],
  ['auto: 6 marcha · 10 corrida', 'auto: 6 walking · 10 running'], ['Butterworth de 4ª ordem sem defasagem. Vazio = automático; 0 = sem filtro.', '4th-order zero-lag Butterworth. Empty = automatic; 0 = no filter.'],
  ['Butterworth passa-baixa', 'Butterworth low-pass'], ['4ª ordem, sem defasagem', '4th order, zero lag'], ['(automático)', '(automatic)'], ['sem filtro (dados como saem do OpenCap)', 'no filter (data as exported by OpenCap)'], ['sem filtro', 'no filter'], ['Filtro', 'Filter'],
  ['Posição do pé em relação ao sacro (Zeni et al., 2008)', 'Foot position relative to the sacrum (Zeni et al., 2008)'],
  ['Aceleração e altura do calcâneo e dedos (Patoz et al., 2021)', 'Heel and toe acceleration and height (Patoz et al., 2021)'],
  ['Velocidade vertical do pé (Leitch et al., 2011)', 'Vertical foot velocity (Leitch et al., 2011)'],
  ['(vem do OpenCap; corrija se algo foi registrado errado)', '(from OpenCap; correct it if something was recorded wrong)'],
  ['Participante', 'Participant'], ['não informado', 'not informed'], ['Feminino', 'Female'], ['Masculino', 'Male'], ['Sexo', 'Sex'], ['Idade (anos)', 'Age (years)'], ['Altura (m)', 'Height (m)'], ['Massa (kg)', 'Mass (kg)'],
  ['quadros/s', 'frames/s'], ['Duração', 'Duration'], ['atividade:', 'activity:'], ['método:', 'method:'],
  ['Patoz et al. (2021): TD pela aceleração vertical do calcâneo e do meio dos dedos; TO pela altura dos dedos', 'Patoz et al. (2021): TD from vertical heel and mid-toe acceleration; TO from toe height'],
  ['Velocidade vertical do calcâneo e dos dedos (Leitch et al., 2011)', 'Vertical heel and toe velocity (Leitch et al., 2011)'],
  ['TD: Zeni et al. (2008); TO: pico de extensão do joelho (Fellin et al., 2010)', 'TD: Zeni et al. (2008); TO: peak knee extension (Fellin et al., 2010)'],
  ['Inclinação informada:', 'Incline entered:'], ['Inclinação estimada:', 'Estimated incline:'],
  ['· estimativa pelos pés apoiados, erro de cerca de ±2°; se souber, informe acima', '· estimated from the feet in stance, error of about ±2°; if known, enter it above'],
  ['Trecho analisado:', 'Analyzed window:'], ['(trecho estável detectado automaticamente)', '(steady window detected automatically)'], ['trial inteiro', 'whole trial'],
  ['Marcações e ajustes restaurados', 'Marks and settings restored'], ['da análise salva em', 'from the analysis saved on'],
  ['Atenção:', 'Warning:'], ['o movimento dos pés neste trial é pouco regular', 'foot motion in this trial is irregular'], ['índice', 'index'], ['bom ≥ 0,6', 'good ≥ 0.6'],
  ['Provável falha de rastreamento do OpenCap. Confira no vídeo e no esqueleto antes de usar os números.', 'Probably an OpenCap tracking failure. Check the video and skeleton before using the numbers.'],
  ['Carregando trial…', 'Loading trial…'], ['Este trial não tem MarkerData/', 'This trial has no MarkerData/'],
  // passo 3
  ['Conferir os eventos', 'Check the events'], ['Mostrar', 'Show'], ['Vídeo + modelo', 'Video + model'], ['Só vídeo', 'Video only'], ['Só modelo', 'Model only'],
  ['Esqueleto do OpenSim (3D)', 'OpenSim skeleton (3D)'], ['Linhas (marcadores)', 'Lines (markers)'], ['Modelo', 'Model'], ['Câmera', 'Camera'], ['Vista', 'View'],
  ['Lado direito', 'Right side'], ['Lado esquerdo', 'Left side'], ['Frente', 'Front'], ['Trás', 'Back'], ['Cima', 'Top'], ['Livre (girar com o mouse)', 'Free (rotate with the mouse)'],
  ['centro de massa', 'center of mass'], ['Arraste para girar · roda = zoom', 'Drag to rotate · wheel = zoom'], ['Carregando o esqueleto…', 'Loading the skeleton…'],
  ['Sem modelo do OpenSim nesta sessão: mostrando linhas.', 'No OpenSim model in this session: showing lines.'], ['Não consegui montar o esqueleto 3D.', 'Could not build the 3D skeleton.'],
  ['Este trial não tem vídeo sincronizado; use o esqueleto.', 'This trial has no synchronized video; use the skeleton.'], ['carregando vídeo…', 'loading video…'], ['Não consegui abrir o vídeo.', 'Could not open the video.'], ['sem vídeo', 'no video'],
  ['10 quadros para trás', '10 frames back'], ['1 quadro para trás (,)', '1 frame back (,)'], ['1 quadro para frente (.)', '1 frame forward (.)'], ['10 quadros para frente', '10 frames forward'],
  ['tocar / pausar (espaço)', 'play / pause (space)'], ['Velocidade', 'Speed'], ['repetir o trecho visível', 'loop the visible window'], ['quadro', 'frame'],
  ['Marcar no quadro atual:', 'Mark at the current frame:'], ['TD direito', 'TD right'], ['TO direito', 'TO right'], ['TD esquerdo', 'TD left'], ['TO esquerdo', 'TO left'],
  ['touchdown: o pé toca o chão', 'touchdown: the foot touches the ground'], ['toe-off: os dedos deixam o chão', 'toe-off: the toes leave the ground'],
  ['Apagar selecionado', 'Delete selected'], ['Limpar todas as marcações', 'Clear all marks'], ['Clique de novo para apagar todos os TD e TO', 'Click again to delete all TD and TO'],
  ['apaga todos os TD e TO deste trial para marcar do zero', 'deletes all TD and TO of this trial to mark from scratch'],
  ['Marcações apagadas. Marque com Q/W (direito) e O/P (esquerdo), ou use “Detectar de novo”.', 'Marks cleared. Mark with Q/W (right) and O/P (left), or use “Detect again”.'],
  ['Clique num evento na linha do tempo para selecioná-lo.', 'Click an event on the timeline to select it.'],
  ['Detectar de novo', 'Detect again'], ['Trecho estável (auto)', 'Steady window (auto)'], ['Trial inteiro', 'Whole trial'],
  [') = o instante em que o pé', ') = the instant the foot'], ['toca o chão', 'touches the ground'], ['(contato inicial).', '(initial contact).'],
  [') = o instante em que os', ') = the instant the'], ['dedos deixam o chão', 'toes leave the ground'], ['(retirada do pé). Do TD ao TO o pé está apoiado (fase de apoio); do TO ao próximo TD está no ar (fase de balanço).', '(foot off). From TD to TO the foot is on the ground (stance); from TO to the next TD it is in the air (swing).'],
  ['Barra = apoio (do TD ▼ até o TO ▮).', 'Bar = stance (from TD ▼ to TO ▮).'], ['Clique', 'Click'], ['num evento para selecionar e', 'an event to select it and'], ['arraste', 'drag'], [', ou use', ', or use'],
  ['(1 quadro;', '(1 frame;'], ['= 5). Sem evento selecionado, as setas andam no vídeo e', '= 5). With no event selected, the arrows move the video and'], ['espaço', 'space'],
  ['toca/pausa. Na faixa de cima, arraste as', 'plays/pauses. On the top strip, drag the'], ['alças', 'handles'], ['para cortar o início e o fim. Roda do mouse = zoom.', 'to trim the start and end. Mouse wheel = zoom.'],
  ['Trecho analisado:', 'Analyzed window:'], ['arraste as alças azuis', 'drag the blue handles'], ['▶ início', '▶ start'], ['fim ◀', 'end ◀'],
  [', ou', ', or'], ['arraste na faixa de cima', 'drag on the top strip'], ['de um ponto a outro para escolher um trecho novo; as teclas', 'from one point to another to choose a new window; the keys'],
  ['marcam início e fim no quadro atual. Roda do mouse = zoom.', 'set start and end at the current frame. Mouse wheel = zoom.'], [' e ', ' and '],
  ['Ver o sinal usado na detecção', 'Show the signal used for detection'], ['tempo (s)', 'time (s)'], ['à frente do sacro (m)', 'ahead of the sacrum (m)'],
  ['Calcâneo D', 'Heel R'], ['Calcâneo E', 'Heel L'], ['Dedos D', 'Toes R'], ['Dedos E', 'Toes L'], ['Direito', 'Right'], ['Esquerdo', 'Left'],
  ['D apoiado', 'R in stance'], ['E apoiado', 'L in stance'], ['D no ar', 'R in the air'], ['E no ar', 'L in the air'],
  // passo 4
  ['Resultados', 'Results'], ['O que mostrar (na tela e no laudo)', 'What to show (on screen and in the report)'], ['Predefinições:', 'Presets:'],
  ['Marcha clínica', 'Clinical gait'], ['Completo', 'Complete'], ['Curvas', 'Curves'], ['Variáveis', 'Variables'], ['Outros', 'Other'],
  ['Pontos-chave das curvas (graus)', 'Curve key points (degrees)'], ['Pontos-chave das curvas', 'Curve key points'], ['Setas de sentido no eixo', 'Direction arrows on the axis'], ['Faixa de ±1 DP', '±1 SD band'],
  ['Faixa de normalidade (literatura)', 'Normative band (literature)'],
  ['Informe a', 'Enter the'], ['velocidade da esteira', 'treadmill speed'], ['(passo 2) para calcular velocidade e comprimentos.', '(step 2) to compute speed and lengths.'],
  ['Espaço-temporais', 'Spatiotemporal'], ['Simetria = (D − E) / média(D, E) × 100. Positivo: maior à direita. CV = variabilidade entre passadas.', 'Symmetry = (R − L) / mean(R, L) × 100. Positive: larger on the right. CV = stride-to-stride variability.'],
  ['Simetria', 'Symmetry'], ['simetria', 'symmetry'], ['Variável', 'Variable'], ['Ponto', 'Point'],
  ['Curvas ao longo do ciclo', 'Curves over the cycle'],
  ['linha = média, faixa = ±1 DP, tracejado = TO (dedos deixam o chão); centro de massa em cm, em relação à média da passada', 'line = mean, band = ±1 SD, dashed = TO (toes leave the ground); center of mass in cm, relative to the stride mean'],
  ['Faixa cinza = normal (média ± 1 DP) de adultos saudáveis', 'Gray band = normal (mean ± 1 SD) of healthy adults'], ['adultos jovens', 'young adults'], ['adultos mais velhos', 'older adults'], ['adultos', 'adults'], ['anos', 'years'],
  ['Fukuchi et al. (2018), marcha em esteira e no solo', 'Fukuchi et al. (2018), treadmill and overground walking'], ['Fukuchi et al. (2017), corrida em esteira', 'Fukuchi et al. (2017), treadmill running'],
  ['Atenção: velocidade de referência distante da do paciente.', 'Warning: reference speed far from the patient’s.'],
  ['Dados de laboratório com marcadores: diferenças de alguns graus em relação ao OpenCap são esperadas (sobretudo no tornozelo).', 'Marker-based laboratory data: differences of a few degrees from OpenCap are expected (especially at the ankle).'],
  ['Faixa de normalidade: informe a velocidade (passo 2) para escolher a referência.', 'Normative band: enter the speed (step 2) to choose the reference.'], ['Faixa de normalidade indisponível.', 'Normative band unavailable.'],
  ['Passadas usadas', 'Strides used'], [' · desmarque as que estiverem erradas', ' · uncheck the wrong ones'], ['duração fora do padrão ou sem TO', 'unusual duration or no TO'],
  ['Contato D / E', 'Contact R / L'], ['Apoio D / E', 'Stance R / L'], ['% do ciclo', '% of cycle'], ['passos/min', 'steps/min'], ['esteira', 'treadmill'], ['CV tempo', 'CV time'],
  ['Tempo de voo', 'Flight time'], ['Duplo apoio', 'Double support'],
  // variáveis
  ['Oscilação vertical do centro de massa', 'Vertical oscillation of the center of mass'], ['Calcanhar à frente do centro de massa no TD', 'Heel ahead of the center of mass at TD'],
  ['Comprimento da passada', 'Stride length'], ['Comprimento do passo', 'Step length'], ['Largura do passo', 'Step width'], ['Tempo da passada', 'Stride time'], ['Tempo do passo', 'Step time'],
  ['Tempo de apoio', 'Stance time'], ['Tempo de balanço', 'Swing time'], ['Cadência', 'Cadence'], ['Passada', 'Stride'], ['Apoio', 'Stance'],
  // curvas e pontos
  ['Quadril · flexão / extensão', 'Hip · flexion / extension'], ['Joelho · flexão / extensão', 'Knee · flexion / extension'], ['Tornozelo · dorsi / plantiflexão', 'Ankle · dorsi / plantarflexion'],
  ['Quadril · adução / abdução', 'Hip · adduction / abduction'], ['Quadril · rotação', 'Hip · rotation'], ['Pelve · inclinação ântero-posterior (zero do modelo, não o clínico)', 'Pelvis · anterior-posterior tilt (model zero, not the clinical one)'], ['Pelve · inclinação ântero-posterior', 'Pelvis · anterior-posterior tilt'],
  ['Pelve · obliquidade (lado = membro do ciclo)', 'Pelvis · obliquity (side = limb of the cycle)'], ['Pelve · rotação (lado = membro do ciclo)', 'Pelvis · rotation (side = limb of the cycle)'],
  ['Tronco · extensão / flexão (em relação à pelve)', 'Trunk · extension / flexion (relative to pelvis)'], ['Tronco · inclinação lateral (em relação à pelve)', 'Trunk · lateral bending (relative to pelvis)'],
  ['Centro de massa · vertical', 'Center of mass · vertical'], ['Centro de massa · médio-lateral (lado = membro do ciclo)', 'Center of mass · mediolateral (side = limb of the cycle)'], ['Centro de massa · ântero-posterior', 'Center of mass · anteroposterior'],
  ['Joelho · flexão no TD (contato inicial)', 'Knee · flexion at TD (initial contact)'], ['Joelho · pico de flexão no apoio', 'Knee · peak flexion in stance'], ['Joelho · pico de flexão no balanço', 'Knee · peak flexion in swing'],
  ['Quadril · pico de flexão', 'Hip · peak flexion'], ['Quadril · pico de extensão (menor valor)', 'Hip · peak extension (lowest value)'], ['Quadril · pico de adução no apoio', 'Hip · peak adduction in stance'],
  ['Tornozelo · pico de dorsiflexão no apoio', 'Ankle · peak dorsiflexion in stance'], ['Tornozelo · pico de plantiflexão', 'Ankle · peak plantarflexion'],
  ['Pelve · amplitude de obliquidade', 'Pelvis · obliquity range'], ['Pelve · amplitude de rotação', 'Pelvis · rotation range'], ['Pelve · pico de queda do lado oposto no apoio', 'Pelvis · peak contralateral drop in stance'],
  ['Quadril · amplitude sagital', 'Hip · sagittal range'], ['Joelho · amplitude sagital', 'Knee · sagittal range'], ['Tornozelo · amplitude sagital', 'Ankle · sagittal range'],
  ['Dorsiflexão', 'Dorsiflexion'], ['Plantiflexão', 'Plantarflexion'], ['Flexão', 'Flexion'], ['Extensão', 'Extension'], ['Adução', 'Adduction'], ['Abdução', 'Abduction'],
  ['Interna', 'Internal'], ['Externa', 'External'], ['Anteversão', 'Anterior tilt'], ['Retroversão', 'Posterior tilt'], ['Lado desce', 'Side drops'], ['Lado sobe', 'Side rises'],
  ['Lado à frente', 'Side forward'], ['Lado atrás', 'Side back'], ['Para o lado', 'Toward side'], ['Lado oposto', 'Opposite side'], ['Para cima', 'Up'], ['Para baixo', 'Down'], ['Para frente', 'Forward'], ['Para trás', 'Backward'],
  // passo 5
  ['Comparar trials ou sessões', 'Compare trials or sessions'], ['Marque dois ou mais trials já analisados (ex.: antes × depois, ou condições diferentes).', 'Check two or more trials (e.g., before × after, or different conditions).'],
  ['Curvas: linha cheia = direito, tracejada = esquerdo.', 'Curves: solid line = right, dashed = left.'], ['Marque mais um trial para comparar.', 'Check one more trial to compare.'],
  ['Analisado(s) automaticamente, sem conferência dos eventos:', 'Analyzed automatically, events not checked:'], ['Para conferir, escolha o trial no passo 2.', 'To check them, choose the trial in step 2.'],
  ['Sem velocidade da esteira (velocidade e comprimentos ficam em branco):', 'No treadmill speed (speed and lengths left blank):'], ['Informe no passo 2.', 'Enter it in step 2.'],
  ['(automático)', '(automatic)'], ['(salva)', '(saved)'], ['salva em', 'saved on'], ['Analisando', 'Analyzing'], ['Analisando o trial…', 'Analyzing the trial…'],
  // passo 6
  ['Laudo e dados', 'Report and data'], ['Paciente', 'Patient'], ['Data da avaliação', 'Assessment date'], ['Avaliador(a)', 'Assessor'], ['Observações clínicas', 'Clinical notes'],
  ['Incluir a comparação no laudo (se houver)', 'Include the comparison in the report (if any)'], ['Baixar laudo (PDF)', 'Download report (PDF)'], ['Baixar dados (Excel)', 'Download data (Excel)'], ['Salvar análise (.json)', 'Save analysis (.json)'],
  ['“Salvar análise” guarda num arquivo pequeno as marcações (TD/TO), os ajustes e os resultados de todos os trials analisados, e os dados do laudo (inclusive o nome do paciente: guarde em local seguro). Para comparar depois, basta abrir o arquivo no passo 1, mesmo sem o ZIP. Com o ZIP carregado junto, tudo volta a ficar editável.',
   '“Save analysis” stores in a small file the marks (TD/TO), settings and results of all analyzed trials, plus the report data (including the patient’s name: keep it safe). To compare later, just open the file in step 1, even without the ZIP. With the ZIP loaded too, everything becomes editable again.'],
  ['Gerando PDF…', 'Generating PDF…'], ['PDF baixado.', 'PDF downloaded.'], ['Excel baixado.', 'Excel downloaded.'], ['Erro ao gerar PDF: ', 'Error generating PDF: '], ['Erro ao gerar Excel: ', 'Error generating Excel: '],
  ['Nada para salvar ainda.', 'Nothing to save yet.'], ['Análise salva', 'Analysis saved'],
  // rodapé e créditos
  ['Estimativas a partir de vídeo (OpenCap). Use com julgamento clínico. Eventos (TD = touchdown, o pé toca o chão; TO = toe-off, os dedos deixam o chão) detectados automaticamente (marcha: Zeni et al., 2008; corrida: Patoz et al., 2021) e conferidos no vídeo. Altura do pé medida em relação ao plano da esteira/chão.',
   'Video-based estimates (OpenCap). Use with clinical judgment. Events (TD = touchdown, the foot touches the ground; TO = toe-off, the toes leave the ground) detected automatically (walking: Zeni et al., 2008; running: Patoz et al., 2021) and checked on video. Foot height measured relative to the treadmill/floor plane.'],
  ['Desenvolvido por', 'Developed by'], ['repositório', 'repository'],
  // laudo (PDF)
  ['Relatório de análise da corrida', 'Running analysis report'], ['Relatório de análise da marcha', 'Gait analysis report'], ['Condição', 'Condition'], ['Passadas analisadas', 'Strides analyzed'],
  ['Variáveis espaço-temporais', 'Spatiotemporal variables'], ['Observações', 'Notes'], ['Página', 'Page'], ['Comparação · curvas médias (linha cheia = direito; tracejada = esquerdo)', 'Comparison · mean curves (solid = right; dashed = left)'], ['Comparação', 'Comparison'],
  ['Linha = média; faixa = ±1 DP; tracejado = TO (dedos deixam o chão).  Vermelho = direito; azul = esquerdo.', 'Line = mean; band = ±1 SD; dashed = TO (toes leave the ground).  Red = right; blue = left.'],
  ['Simetria = (D - E) / média(D, E) x 100; positivo = maior à direita. CV = variabilidade entre passadas.', 'Symmetry = (R - L) / mean(R, L) x 100; positive = larger on the right. CV = stride-to-stride variability.'],
  ['Valores estimados a partir de vídeo (OpenCap); interpretar com julgamento clínico. TD = touchdown (pé toca o chão); TO = toe-off (dedos deixam o chão). Eventos:', 'Video-based estimates (OpenCap); interpret with clinical judgment. TD = touchdown (foot touches the ground); TO = toe-off (toes leave the ground). Events:'],
  ['Ferramenta desenvolvida por', 'Tool developed by'], ['Faixa cinza = normalidade (média ± 1 DP), adultos saudáveis', 'Gray band = normative (mean ± 1 SD), healthy adults'], ['Dados de laboratório com marcadores.', 'Marker-based laboratory data.'],
  ['Curvas ao longo do ciclo', 'Curves over the cycle'], ['graus', 'degrees'], ['Sessão', 'Session'], ['Esteira', 'Treadmill'],
  // Excel
  ['Velocidade da esteira (km/h)', 'Treadmill speed (km/h)'], ['Velocidade média (km/h)', 'Mean speed (km/h)'], ['Método de eventos', 'Event method'], ['Trecho analisado (s)', 'Analyzed window (s)'], ['Unidade', 'Unit'],
  ['Direito média', 'Right mean'], ['Direito DP', 'Right SD'], ['Direito n', 'Right n'], ['Esquerdo média', 'Left mean'], ['Esquerdo DP', 'Left SD'], ['Esquerdo n', 'Left n'], ['Simetria %', 'Symmetry %'], ['Geral média', 'Overall mean'], ['Geral DP', 'Overall SD'],
  ['Ponto-chave (graus)', 'Key point (degrees)'], ['Lado', 'Side'], ['Usada', 'Used'], ['Suspeita', 'Suspect'], ['Início (s)', 'Start (s)'], ['Duração (s)', 'Duration (s)'], ['Apoio (s)', 'Stance (s)'], ['Apoio %', 'Stance %'], ['Balanço (s)', 'Swing (s)'],
  ['Tempo do passo (s)', 'Step time (s)'], ['Duplo apoio %', 'Double support %'], ['Voo (s)', 'Flight (s)'], ['Passada (m)', 'Stride (m)'], ['Passo (m)', 'Step (m)'], ['Largura (cm)', 'Width (cm)'],
  ['Evento', 'Event'], ['Quadro', 'Frame'], ['Tempo (s)', 'Time (s)'], ['TD (touchdown: pé toca o chão)', 'TD (touchdown: foot touches the ground)'], ['TO (toe-off: dedos deixam o chão)', 'TO (toe-off: toes leave the ground)'],
  ['% ciclo', '% cycle'], ['Normal (média ± DP)', 'Normal (mean ± SD)'], ['Normal: mesma regra aplicada à curva média da referência (ver faixa e fonte na página das curvas).', 'Normal: same rule applied to the reference mean curve (see band and source on the curves page).'], ['Normal', 'Normal'],
  // palavras soltas (por último)
  ['Corrida', 'Running'], ['corrida', 'running'], ['Marcha', 'Walking'], ['marcha', 'walking'], ['Velocidade', 'Speed'], ['Pelve', 'Pelvis'], ['Quadril', 'Hip'], ['Joelho', 'Knee'], ['Tornozelo', 'Ankle'], ['Tronco', 'Trunk'],
];
// Marcha OpenCap (nome da ferramenta) não é traduzido
const PROTEGIDOS = ['Marcha OpenCap', 'Edilson Fernando de Borba'];
const EXATO = new Map([['Data', 'Date'], ['Data da avaliação', 'Assessment date'], ['sim', 'yes'], ['não', 'no'], [' ou ', ' or '], ['ou', 'or'], ['Pasta', 'Folder']]);
const ORDEM = [...D].sort((a, b) => b[0].length - a[0].length);
const LADO = [[/(^|[\s·(/,:|])D(?=$|[\s·)/,:\d|])/g, '$1R'], [/(^|[\s·(/,:|])E(?=$|[\s·)/,:\d|])/g, '$1L'], [/\bD − E\b/g, 'R − L']];

export function tr(s) {
  if (lang === 'pt' || s == null) return s;
  let t = String(s);
  if (EXATO.has(t)) return EXATO.get(t);
  if (!/[A-Za-zÀ-ú]/.test(t)) return t;
  const guardas = [];
  for (const p of PROTEGIDOS) t = t.split(p).join(`\u0001${guardas.push(p) - 1}\u0001`);
  for (const [pt, en] of ORDEM) if (t.includes(pt)) t = t.split(pt).join(en);
  for (const [re, sub] of LADO) t = t.replace(re, sub);
  return t.replace(/\u0001(\d+)\u0001/g, (_, i) => guardas[+i]);
}

// aplica na página: guarda o original em português de cada nó para poder voltar
const ORIG = new WeakMap(), ATTR = ['title', 'placeholder'];
let aplicando = false;
function no(n) {
  if (n.nodeType === 3) {
    const p = n.parentElement; if (!p || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(p.tagName) || p.closest('[data-no-tr]')) return;
    if (!ORIG.has(n)) ORIG.set(n, n.nodeValue);
    const alvo = lang === 'pt' ? ORIG.get(n) : tr(ORIG.get(n));
    if (n.nodeValue !== alvo) n.nodeValue = alvo;
  } else if (n.nodeType === 1) {
    if (n.closest('[data-no-tr]')) return;
    for (const a of ATTR) if (n.hasAttribute(a)) {
      const k = '__orig_' + a; if (!(k in n)) n[k] = n.getAttribute(a);
      const alvo = lang === 'pt' ? n[k] : tr(n[k]); if (n.getAttribute(a) !== alvo) n.setAttribute(a, alvo);
    }
    for (let c = n.firstChild; c; c = c.nextSibling) no(c);
  }
}
export function aplicar(raiz = document.body) { aplicando = true; try { no(raiz); } finally { obs.takeRecords(); aplicando = false; } document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR'; }
const obs = new MutationObserver((ms) => {
  if (aplicando) return;
  aplicando = true;
  try {
    for (const m of ms) {
      if (m.type === 'characterData') { ORIG.set(m.target, m.target.nodeValue); no(m.target); }   // texto mudado pela página: novo original
      else if (m.type === 'attributes') { delete m.target['__orig_' + m.attributeName]; no(m.target); }
      else m.addedNodes.forEach(no);
    }
  } finally { obs.takeRecords(); aplicando = false; }
});
obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });

export function trocarIdioma(novo, aoTrocar) {
  lang = novo; try { localStorage.setItem(CHAVE, lang); } catch {}
  aplicar(); aoTrocar?.();
}
