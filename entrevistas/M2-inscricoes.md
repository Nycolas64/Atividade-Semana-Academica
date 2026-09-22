# Entrevista M2 — Inscrições e lista de espera

Status: Rodada 1 concluída
Dono: Gabriel Augusto Giroto (Girotin)
Documento de requisitos: NÃO consultado (somente na rodada 2)
Baseline: `npm test` verde — 24/24 testes, 0 falhas

## Perguntas da Rodada 1

### P1 — Encerramento de inscrições (`INSCRICOES_ENCERRADAS`)
- **Pergunta**: Quando a inscrição em uma atividade fecha? (a) no início do primeiro encontro; (b) X horas antes do primeiro encontro; (c) outra regra.
- **Recomendação**: Fecha no início do primeiro encontro (mesmo instante em que a atividade "já iniciou") e permanece fechada depois — 422 `INSCRICOES_ENCERRADAS`.
- **Resposta**: Fecha 30 minutos antes do início do primeiro encontro da atividade. A partir desse momento, uma nova inscrição retorna `INSCRICOES_ENCERRADAS`.
- **Fonte**: contrato-api.md §6
- **Status**: Respondido

### P2 — Limite de minicursos (`LIMITE_DE_MINICURSOS`)
- **Pergunta**: Qual o número máximo de minicursos simultâneos por participante e quais status de inscrição contam para esse limite?
- **Recomendação**: Máximo de 2 minicursos ativos; contam `confirmada` e `convocada` (na confirmação, a própria convocação entra na conta); `em_espera` não conta.
- **Resposta**: O limite é de 3 minicursos simultâneos. Contam as inscrições `confirmada` e `convocada`. `em_espera` não conta, e palestras também não entram nesse limite.
- **Fonte**: contrato-api.md §6
- **Status**: Respondido

### P3 — Conflito de horário (`CONFLITO_DE_HORARIO`)
- **Pergunta**: Quais inscrições do participante contam como conflito ao inscrever/confirmar? E inscrições de atividade que foi cancelada depois?
- **Recomendação**: Contam apenas `confirmada` e `convocada` de atividades não canceladas; sobreposição é de qualquer encontro com qualquer encontro de outra atividade; `em_espera` não gera conflito (rechecado na confirmação).
- **Resposta**: Conta como conflito outra inscrição do participante que também ocupa vaga (`confirmada` ou `convocada`) e cujo horário dos encontros se sobrepõe. Horários que apenas encostam não entram como conflito. Inscrições em espera não são verificadas. Se a atividade foi cancelada, as inscrições ativas dela são canceladas, então deixam de ocupar vaga e de gerar conflito.
- **Fonte**: contrato-api.md §6
- **Status**: Respondido

### P4 — O que ocupa vaga (`ocupadas` / `vagasRestantes` / `emEspera`)
- **Pergunta**: Quais status contam em `ocupadas` (e, por consequência, reduzem `vagasRestantes`)? O que conta em `emEspera`?
- **Recomendação**: `ocupadas` = `confirmada` + `convocada` (a convocação segura a vaga durante o prazo); `emEspera` = contagem de `em_espera`; `vagasRestantes` = `vagas - ocupadas` (já é assim em `formatarAtividade`).
- **Resposta**: `ocupadas` considera `confirmada` e `convocada`. Esses status reduzem `vagasRestantes`. `em_espera` não ocupa vaga e entra em `emEspera`.
- **Fonte**: contrato-api.md §5 (Atividade), specs/M1-grade.md
- **Status**: Respondido

### P5 — `JA_INSCRITO` e re-inscrição
- **Pergunta**: Em quais status existe `JA_INSCRITO` (409)? Depois de cancelar/expire, pode se inscrever de novo — e isso gera um novo registro `ins_…` ou reativa o antigo?
- **Recomendação**: `JA_INSCRITO` só para status ativos (`confirmada`, `convocada`, `em_espera`); após `cancelada`/`expirada` permite nova inscrição, gerando novo registro (histórico preservado), entrando no fim da fila.
- **Resposta**: `JA_INSCRITO` existe enquanto houver uma inscrição ativa: `confirmada`, `em_espera` ou `convocada`. Depois de cancelar ou expirar, o participante pode se inscrever novamente, gerando um novo registro `ins_...`, em vez de reativar o antigo.
- **Fonte**: contrato-api.md §5, §6
- **Status**: Respondido

### P6 — Fila de espera (ordem e `posicaoNaEspera`)
- **Pergunta**: Qual a ordem da fila? O que acontece na inscrição quando há vaga livre? Como desempatar `criadaEm` (o relógio de teste é congelado e empates são possíveis)? As posições são renumeradas quando alguém sai do meio da fila?
- **Recomendação**: Com vaga → `confirmada` (com `posicaoNaEspera: null`); sem vaga → `em_espera` no fim da fila; ordem FIFO por `criadaEm`, desempate por ordem de chegada (inserção no store); posições sempre renumeradas 1, 2, 3… contíguas.
- **Resposta**: A fila segue a ordem de chegada das inscrições. Se houver vaga, a inscrição já nasce `confirmada`; se não houver, entra como `em_espera` no final da fila. O requisito não define um desempate adicional para `criadaEm` quando houver empate, então não devemos inventar uma regra. A `posicaoNaEspera` começa em 1 e é calculada pela posição atual na fila, portanto é renumerada quando alguém sai.
- **Fonte**: contrato-api.md §5
- **Status**: Respondido

### P7 — Gatilhos de convocação (`em_espera` → `convocada`)
- **Pergunta**: O que dispara a convocação? (a) cancelamento de inscrição ativa; (b) aumento de `vagas` via `PATCH /atividades/:id`; (c) ambos. A convocação é "cega" (sem rechecar conflito/limite na promoção, só em `confirmacao`) ou pula candidatos que falhariam?
- **Recomendação**: Ambos (a)+(b): sempre que `vagasRestantes > 0` e houver fila, convocar os N primeiros; convocação cega — recheces acontecem só em `POST /inscricoes/:id/confirmacao`.
- **Resposta**: Os dois casos disparam convocação: cancelamento que libera vaga e aumento de vagas pelo `PATCH /atividades/:id`. Cada vaga liberada convoca o primeiro participante da fila. A convocação não pula previamente quem teria conflito ou limite; essas regras são verificadas na hora da confirmação.
- **Fonte**: contrato-api.md §5, §6
- **Status**: Respondido

### P8 — Prazo da convocação (`convocadaAte`)
- **Pergunta**: Qual a duração do prazo para confirmar uma convocação?
- **Recomendação**: 24 horas a partir da convocação, medida pelo relógio da API (`PUT /_teste/relogio`); `convocadaAte` = instante da convocação + 24h.
- **Resposta**: O prazo é de 2 horas a partir da convocação, limitado pelo encerramento das inscrições.
- **Fonte**: contrato-api.md §5
- **Status**: Respondido

### P9 — Expiração de convocação (`CONVOCACAO_EXPIRADA` / status `expirada`)
- **Pergunta**: Quando o tempo passa e ninguém acessa, quem muda `convocada` → `expirada` e promove o próximo da fila? O que uma leitura comum (ex.: `GET /atividades`) deve mostrar depois do prazo?
- **Recomendação**: Avaliação preguiçosa: uma varredura de expirações roda antes de qualquer leitura/escrita de inscrição e no cálculo dos campos derivados da atividade; encadeia enquanto houver prazo vencido, convocando o próximo na hora; qualquer GET já reflete o estado novo.
- **Resposta**: A convocação vencida passa para `expirada` e o próximo da fila é convocado, mesmo que ninguém acesse o sistema naquele momento. Uma leitura posterior, como `GET /atividades`, deve refletir esse estado atualizado e a cascata de convocações.
- **Fonte**: contrato-api.md §5, §7
- **Status**: Respondido

### P10 — Cancelamento de inscrição
- **Pergunta**: De quais status dá para cancelar? Quando dá `INSCRICAO_INATIVA`? Quando dá `ATIVIDADE_JA_INICIADA`? Cancelar `confirmada`/`convocada` libera vaga (gatilho do P7)?
- **Recomendação**: Pode cancelar `confirmada`, `convocada` e `em_espera`; `cancelada`/`expirada` → 422 `INSCRICAO_INATIVA`; `agora ≥ início do 1º encontro` → 422 `ATIVIDADE_JA_INICIADA` (mesmo gatilho do M1); cancelar `confirmada`/`convocada` libera vaga e dispara convocação (P7); cancelar `em_espera` só renumera a fila.
- **Resposta**: É possível cancelar uma inscrição `confirmada`, `convocada` ou `em_espera`, desde que a atividade ainda não tenha começado. Se a inscrição já estiver `cancelada` ou `expirada`, retorna `INSCRICAO_INATIVA`. Se a atividade já começou, retorna `ATIVIDADE_JA_INICIADA`. Cancelar uma `confirmada` ou `convocada` libera a vaga e pode disparar uma nova convocação.
- **Fonte**: contrato-api.md §6
- **Status**: Respondido

### P11 — Atividade cancelada depois: destino das inscrições
- **Pergunta**: Quando a organização cancela a atividade, o que acontece com as inscrições existentes?
- **Recomendação**: Todas passam a `cancelada` automaticamente (atividade morta não mantém vaga nem fila); depois disso cancelar de novo → `INSCRICAO_INATIVA`.
- **Resposta**: Quando a organização cancela a atividade, todas as inscrições ativas daquela atividade passam para `cancelada`.
- **Fonte**: contrato-api.md §5, §6
- **Status**: Respondido

### P12 — Autorização em rotas de participante
- **Pergunta**: Organização chamando `confirmacao`/`cancelamento`/`POST …/inscricoes` → qual erro? Participante chamando `confirmacao`/`cancelamento` na inscrição de OUTRO participante → qual erro? (Contrato: `GET /inscricoes` e `GET /inscricoes/:id` são "todos" — participante lê a alheia por id, isso é fato do contrato.)
- **Recomendação**: Organização → 403 `SOMENTE_PARTICIPANTE`; participante em inscrição alheia → 404 `NAO_ENCONTRADO` (não revela existência); id inexistente → 404 (ordem 401 → 403 → 404).
- **Resposta**: Se a organização tentar usar `POST …/inscricoes`, confirmação ou cancelamento, retorna 403 `SOMENTE_PARTICIPANTE`. Se um participante tentar confirmar ou cancelar a inscrição de outro participante, retorna 404, e não 403.
- **Fonte**: contrato-api.md §1, §5
- **Status**: Respondido

### P13 — Precedência de erros em M2
- **Pergunta**: Quando mais de uma regra recusa a mesma operação, qual a ordem em cada rota?
- **Recomendação**:
  - **Inscriver**: `ATIVIDADE_CANCELADA` → `INSCRICOES_ENCERRADAS` → `JA_INSCRITO` → `CONFLITO_DE_HORARIO` → `LIMITE_DE_MINICURSOS`.
  - **Confirmar convocação**: `SEM_CONVOCACAO` → `CONVOCACAO_EXPIRADA` → `CONFLITO_DE_HORARIO` → `LIMITE_DE_MINICURSOS`.
  - **Cancelar inscrição**: `ATIVIDADE_JA_INICIADA` → `INSCRICAO_INATIVA`.
  - (Antes disso, sempre: 401 → 403 → 404 → 422 `DADOS_INVALIDOS`, por convenção do projeto.)
- **Resposta**: Na inscrição, a precedência documentada é: atividade inexistente (404) → atividade cancelada → inscrições encerradas → inscrição bloqueada, quando aplicável → já inscrito → conflito de horário → limite de minicursos. Para confirmação, primeiro deve ser verificado se existe uma convocação válida: sem convocação → `SEM_CONVOCACAO`; convocação vencida → `CONVOCACAO_EXPIRADA`; estando válida, são refeitos conflito de horário e limite de minicursos. Para cancelamento, atividade já iniciada gera `ATIVIDADE_JA_INICIADA` e inscrição já cancelada/expirada gera `INSCRICAO_INATIVA`. O documento não estabelece uma precedência adicional entre essas duas últimas situações.
- **Fonte**: contrato-api.md §1, §6
- **Status**: Respondido

### P14 — Efeito da falha na confirmação
- **Pergunta**: Convocada tenta confirmar e leva `CONFLITO_DE_HORARIO` ou `LIMITE_DE_MINICURSOS` — o que acontece com a convocação dela?
- **Recomendação**: Permanece `convocada` até `convocadaAte` (dá para resolver o conflito e tentar de novo); ao vencer o prazo, expira normalmente (P9) e a fila anda.
- **Resposta**: A inscrição continua `convocada` e válida até o prazo dela. Se o participante resolver o conflito ou liberar espaço no limite de minicursos antes do prazo, pode tentar confirmar novamente. Se o prazo vencer, aí a convocação passa para `expirada` e a fila avança.
- **Fonte**: contrato-api.md §6
- **Status**: Respondido

### P15 — Fronteira do escopo de M2
- **Pergunta**: Confirmar o que M2 NÃO faz: (a) `INSCRICAO_BLOQUEADA` (só existe em grupos com M5 — nosso grupo é de 2, sem M5); (b) organização sem nenhuma rota de escrita em inscrições (só leitura via `GET`); (c) telas: o que a interface precisa ter?
- **Recomendação**: (a) Fora do escopo — código nunca deve aparecer; (b) confirmado — sem rotas de escrita para organização; (c) interface: botões inscrever/cancelar/confirmar na listagem de atividades + seção "minhas inscrições" com `status` e `posicaoNaEspera`.
- **Resposta**: M2 não implementa a regra `INSCRICAO_BLOQUEADA`; ela só entra como ponto de integração quando o grupo possui M5. A organização pode consultar as inscrições, mas não pode criar, confirmar ou cancelar inscrições em nome dos participantes. Na interface, M2 precisa contemplar as operações de inscrição, cancelamento e confirmação, além da visualização das inscrições do participante com o status e a posição na fila quando aplicável.
- **Fonte**: contrato-api.md §5, §6; api/public/app.js
- **Status**: Respondido

## Nota de verificação

Toda regra acima é observável pela costura HTTP existente (`criarServidor()` + `fetch`) com relógio congelado via `POST /_teste/reset` e `PUT /_teste/relogio` — cenários de aceite serão escritos na spec (skill `to-spec`).
