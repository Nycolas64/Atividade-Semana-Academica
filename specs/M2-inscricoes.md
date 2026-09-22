# Spec — M2: Inscrições e Lista de Espera

## 1. Objetivo
Permitir que participantes se inscrevam nas atividades da Semana Acadêmica 2026 com garantia de vaga por ordem de chegada: quando há vaga a inscrição nasce confirmada; sem vaga, entra numa fila de espera FIFO com convocação por prazo e confirmação. A organização acompanha a ocupação, o participante acompanha suas inscrições e a fila anda sozinha conforme o relógio, sem depender de ninguém acessar o sistema.

## 2. Fora de escopo
- Criação, alteração e cancelamento de atividades (escopo do módulo M1); leitura de salas e grade.
- Regra `INSCRICAO_BLOQUEADA` (422): é integração do módulo M5. Grupo de 2 não tem M5 — o check **não é implementado** e sempre passa; fica documentado na precedência de R13 apenas como ponto de integração futuro.
- Escritas da organização em inscrições: a organização pode consultar (`GET`), mas não cria, confirma nem cancela inscrições em nome de participantes (recusa 403 em R12).
- Gestão de usuários e salas (dados estáticos preexistentes).
- Leitura/marcação de presença (M3), certificados e extrato (M4), painel analítico e bloqueios (M5).

## 3. Modelo

### Inscrição
- `id` (string): Identificador gerado no padrão `ins_xxxxxxxx` (calculado/gerado).
- `atividadeId` (string): Identificador da atividade (informado pela rota).
- `participanteId` (string): Identificador do participante, do cabeçalho `X-Usuario` (informado).
- `status` (string): Estado da inscrição (`"confirmada"`, `"em_espera"`, `"convocada"`, `"cancelada"`, `"expirada"`, derivado/calculado).
- `posicaoNaEspera` (inteiro ou `null`): Posição atual na fila, calculada pela ordem de chegada; número (1, 2, …) somente quando `em_espera`, `null` nos demais status (derivado — nunca guardado).
- `convocadaAte` (string ISO 8601 com fuso ou `null`): Prazo da convocação, calculado em R8; instante somente quando `convocada`, `null` nos demais status (derivado — nunca guardado).
- `criadaEm` (string ISO 8601 com fuso): Instante de criação, marcado pelo relógio da API (calculado).

Os campos derivados da Atividade previstos em M1 — `ocupadas`, `vagasRestantes` e `emEspera` — passam a ser alimentados pelas inscrições conforme R4.

## 4. Endpoints

| Método | Caminho | Permissão | Sucesso | Descrição |
|---|---|---|---|---|
| POST | `/atividades/:id/inscricoes` | participante | 201 `Inscricao` (sem corpo na entrada) | Inscreve o participante na atividade. |
| GET | `/inscricoes` | todos | 200 `[Inscricao]` | Participante recebe só as próprias; organização recebe todas. Filtro opcional `?atividadeId=`. |
| GET | `/inscricoes/:id` | todos | 200 `Inscricao` | Detalhes de uma inscrição (qualquer autenticado lê por id — fato do contrato). |
| POST | `/inscricoes/:id/cancelamento` | participante | 200 `Inscricao` | Cancela uma inscrição ativa. |
| POST | `/inscricoes/:id/confirmacao` | participante | 200 `Inscricao` | Confirma uma convocação. |

Interações com rotas do M1: `POST /atividades/:id/cancelamento` passa a cancelar as inscrições ativas da atividade (R11) e `PATCH /atividades/:id` com aumento de `vagas` dispara convocação (R7).

---

## 5. Regras

- **R1 (P1, RN-202) — Encerramento de inscrições**:
  As inscrições de uma atividade encerram 30 minutos antes do início do seu primeiro encontro. A partir desse instante inclusive, um novo `POST /atividades/:id/inscricoes` retorna status **422** e erro `INSCRICOES_ENCERRADAS`; a atividade permanece fechada para novas inscrições depois disso. Esse mesmo instante é o teto do prazo de convocação (R8).

- **R2 (P2, RN-207) — Limite de minicursos**:
  O limite é de 3 minicursos simultâneos por participante. Contam apenas inscrições com status `confirmada` ou `convocada` em atividades `tipo: "minicurso"`; inscrições `em_espera` e inscrições em palestras não entram na conta. `POST /atividades/:id/inscricoes` e `POST /inscricoes/:id/confirmacao` recusam com status **422** e erro `LIMITE_DE_MINICURSOS` quando a operação resultaria em mais de 3 minicursos contando para o participante (a própria inscrição entra na conta quando nasce `confirmada` ou já é `convocada`). A convocação não aplica este check — é cega (R7); o rechec acontece na confirmação.

- **R3 (P3) — Conflito de horário**:
  Há conflito quando o participante possui outra inscrição que ocupa vaga (`confirmada` ou `convocada`) em atividade não cancelada e algum encontro dessa inscrição se sobrepõe a algum encontro da atividade alvo. Sobreposição é estrita: horários que apenas se encostam (fim de um encontro = início do outro) não contam como conflito. Inscrições `em_espera` não geram conflito. Inscrições de atividade posteriormente cancelada não contam (viram `cancelada` — R11). `POST /atividades/:id/inscricoes` e `POST /inscricoes/:id/confirmacao` recusam com status **409** e erro `CONFLITO_DE_HORARIO`. Na confirmação, o rechec usa os mesmos critérios (R7, R14).

- **R4 (P4) — O que ocupa vaga**:
  `ocupadas` de uma Atividade é a contagem de inscrições `confirmada` + `convocada`; esses status reduzem `vagasRestantes` (`vagas - ocupadas`, com piso 0). Inscrições `em_espera` não ocupam vaga e entram na contagem `emEspera`. Observável em `GET /atividades` e `GET /atividades/:id`.

- **R5 (P5) — `JA_INSCRITO` e re-inscrição**:
  Enquanto houver uma inscrição ativa do participante na mesma atividade — `confirmada`, `em_espera` ou `convocada` — um novo `POST /atividades/:id/inscricoes` retorna status **409** e erro `JA_INSCRITO`. Depois de `cancelada` ou `expirada`, o participante pode se inscrever de novo: nasce um **novo registro** `ins_…` (o antigo não é reativado, histórico preservado) e entra no fim da fila (R6).

- **R6 (P6) — Fila de espera**:
  Se houver vaga (`vagasRestantes > 0`) na hora da inscrição, ela nasce `confirmada` com `posicaoNaEspera: null`; se não houver, entra `em_espera` no final da fila. A fila segue a ordem de chegada das inscrições (FIFO). `posicaoNaEspera` começa em 1 e é sempre renumerada de forma contígua (1, 2, 3…) quando alguém sai da fila. Não existe regra adicional de desempate de `criadaEm` além da ordem de chegada — nenhuma foi decidida e nenhuma deve ser inventada.

- **R7 (P7) — Gatilhos de convocação**:
  Sempre que `vagasRestantes > 0` e houver fila, convoca-se o primeiro da fila, uma vaga por vez. Os gatilhos são: (a) cancelamento de inscrição `confirmada` ou `convocada` que libera a vaga (R10); (b) `PATCH /atividades/:id` que aumenta `vagas` (M1). A convocação é **cega**: não pula nem recheca conflito/limite na promoção — os recheces de R2 e R3 acontecem somente em `POST /inscricoes/:id/confirmacao`. Convocação respeita o teto e a proibição de R8.

- **R8 (P8, RN-211, RN-212) — Prazo da convocação**:
  `convocadaAte = min(instante da convocação + 2 horas, encerramento das inscrições de R1)`, medido pelo relógio da API. Se uma vaga for liberada **depois** do encerramento das inscrições, **não** gera nova convocação (a fila permanece `em_espera`).

- **R9 (P9) — Expiração da convocação e cascata**:
  Quando o relógio ultrapassa `convocadaAte`, a inscrição passa de `convocada` para `expirada` e, em cascata, o próximo da fila é convocado na hora (R7/R8) — mesmo que ninguém tenha acessado o sistema nesse meio-tempo. Qualquer leitura posterior (`GET /atividades`, `GET /inscricoes`, `GET /inscricoes/:id`) reflete esse estado novo e a cascata.

- **R10 (P10, P13b) — Cancelamento de inscrição**:
  `POST /inscricoes/:id/cancelamento` pode cancelar inscrições `confirmada`, `convocada` ou `em_espera`, desde que a atividade ainda não tenha começado (`agora` < início do primeiro encontro — mesmo critério de M1 R7). Entre as recusas, a ordem é: status **422** `ATIVIDADE_JA_INICIADA` (atividade já iniciada) antes de status **422** `INSCRICAO_INATIVA` (inscrição `cancelada` ou `expirada`) — a ordem é decisão externa, não da RN. Sucesso retorna **200** com `status: "cancelada"`. Cancelar `confirmada` ou `convocada` libera a vaga e pode disparar convocação (R7); cancelar `em_espera` só renumera a fila (R6).

- **R11 (P11) — Atividade cancelada**:
  Quando a organização cancela a atividade (`POST /atividades/:id/cancelamento`, M1), todas as inscrições ativas dela — `confirmada`, `em_espera` e `convocada` — passam automaticamente para `cancelada`. Depois disso, a inscrição deixa de ocupar vaga e de gerar conflito (R3, R4) e um novo cancelamento dela retorna **422** `INSCRICAO_INATIVA` (R10).

- **R12 (P12) — Autorização**:
  Organização chamando `POST /atividades/:id/inscricoes`, `POST /inscricoes/:id/confirmacao` ou `POST /inscricoes/:id/cancelamento` retorna status **403** e erro `SOMENTE_PARTICIPANTE`. Participante confirmando ou cancelando inscrição de **outro** participante retorna status **404** e erro `NAO_ENCONTRADO` (não revela existência); id de inscrição ou de atividade inexistente também retorna **404**. Sem `X-Usuario` ou com id que não existe retorna **401** e erro `USUARIO_DESCONHECIDO`. A ordem 401 → 403 → 404 → regras do recurso não vem das RN-201–219: vem da regra geral do contrato (`contrato-api.md` §1), que vale para toda rota identificada. Na leitura: `GET /inscricoes` devolve ao participante só as próprias e à organização todas, com filtro opcional `?atividadeId=`; `GET /inscricoes/:id` responde a qualquer autenticado (fato do contrato).

- **R13 (P13, RN-208) — Precedência em inscrever**:
  Antes das regras do recurso valem 401 → 403 → 404 (atividade inexistente), pela ordem geral do contrato (`contrato-api.md` §1). Quando mais de uma regra do recurso recusa o mesmo `POST /atividades/:id/inscricoes`, a ordem estrita é:
  1. `ATIVIDADE_CANCELADA` (422)
  2. `INSCRICOES_ENCERRADAS` (422)
  3. `INSCRICAO_BLOQUEADA` (422) — **integração de M5, fora do escopo do M2** (grupo sem M5): o check **não é implementado** e sempre passa.
  4. `JA_INSCRITO` (409)
  5. `CONFLITO_DE_HORARIO` (409)
  6. `LIMITE_DE_MINICURSOS` (422)

- **R14 (P13) — Precedência em confirmar**:
  Em `POST /inscricoes/:id/confirmacao`, a ordem é: status **422** `SEM_CONVOCACAO` (inscrição sem convocação ativa: `em_espera`, `confirmada` ou `cancelada`) → status **422** `CONVOCACAO_EXPIRADA` (convocação com prazo vencido, status `expirada` após a expiração de R9) → status **409** `CONFLITO_DE_HORARIO` (R3) → status **422** `LIMITE_DE_MINICURSOS` (R2). Antes delas valem 401 → 403 → 404 (R12). Sucesso retorna **200** com `status: "confirmada"`.

- **R15 (P14) — Efeito da falha na confirmação**:
  Falha em confirmar (`CONFLITO_DE_HORARIO` ou `LIMITE_DE_MINICURSOS`) **não** altera a inscrição: ela permanece `convocada` com `convocadaAte` intacto e o participante pode tentar de novo até o prazo, por exemplo depois de resolver o conflito ou liberar espaço no limite. Ao vencer o prazo, a convocação expira normalmente e a fila anda (R9).

- **R16 (P15) — Interface**:
  A interface web servida em `api/public` deve permitir ao participante, a partir da listagem de atividades: inscrever-se, cancelar a inscrição e confirmar convocação; e visualizar a seção "minhas inscrições" com o `status` de cada inscrição e, quando aplicável, a `posicaoNaEspera`.

---

## 6. Critérios de Aceite

1. **(R1)** Atividade cujo primeiro encontro inicia às 12:00, relógio avançado para 11:30 (instante exato do encerramento) → POST inscrição → **422 `INSCRICOES_ENCERRADAS`**.
2. **(R1)** Mesma atividade, relógio em 11:29 (1 minuto antes do encerramento) → POST inscrição → **201**, `status: "confirmada"` (com vaga livre).
3. **(R2)** Participante já com 3 minicursos `confirmada` inscreve-se em um 4º minicurso com vaga livre → **422 `LIMITE_DE_MINICURSOS`**.
4. **(R2)** Participante com 3 minicursos `confirmada` inscreve-se em minicurso sem vaga → **201**, `status: "em_espera"` (em_espera não conta para o limite).
5. **(R2)** Participante com 3 minicursos `confirmada` inscreve-se em uma palestra → **201** (palestras não contam para o limite).
6. **(R2)** Participante com 3 minicursos `confirmada` recebe convocação (cega, R7) para um 4º minicurso e confirma → **422 `LIMITE_DE_MINICURSOS`**.
7. **(R3)** Participante `confirmada` em atividade A (19/10 09:00–11:00) inscreve-se em B (19/10 10:00–12:00) → **409 `CONFLITO_DE_HORARIO`**.
8. **(R3)** Participante `confirmada` em A (termina 11:00) inscreve-se em B (começa 11:00) → **201** (horários que se encostam não conflitam).
9. **(R3)** Participante tem inscrição `em_espera` sobreposta em A e inscreve-se em B → **201** (`em_espera` não gera conflito).
10. **(R3, R11)** Participante era `confirmada` em A; organização cancela A (inscrição vira `cancelada`); participante inscreve-se em B sobreposta ao horário de A → **201**.
11. **(R4)** Atividade `vagas: 1` com uma inscrição `convocada` (após cancelamento da confirmada) e outra `em_espera` → GET /atividades → `ocupadas: 1`, `vagasRestantes: 0`, `emEspera: 1`.
12. **(R5)** Segundo POST de inscrição de quem já está `confirmada` (ou `em_espera`, ou `convocada`) na mesma atividade → **409 `JA_INSCRITO`**.
13. **(R5, R6)** Participante cancela sua inscrição e inscreve-se de novo → **201** com novo id `ins_…` diferente do registro antigo, no fim da fila.
14. **(R6)** Atividade `vagas: 1`: 1º participante → `confirmada` com `posicaoNaEspera: null`; 2º → `em_espera` com `posicaoNaEspera: 1`; 3º → `em_espera` com `posicaoNaEspera: 2`.
15. **(R6)** Com fila na posição 1 e 2, a inscrição de posição 1 é cancelada → a que era posição 2 passa a `posicaoNaEspera: 1` (renumeração contígua).
16. **(R7a)** Fila `em_espera` com `vagasRestantes: 0`; inscrição `confirmada` cancela → primeiro da fila vira `convocada` com `convocadaAte` preenchido.
17. **(R7b)** Organização faz `PATCH /atividades/:id` aumentando `vagas` com fila presente → primeiro da fila vira `convocada`.
18. **(R7, R3, R14)** Participante `em_espera` em Y; depois inscreve-se `confirmada` em X sobreposta a Y; vaga libera em Y → a convocação **não o pula** → vira `convocada`; confirmar em Y → **409 `CONFLITO_DE_HORARIO`** (rechec na confirmação, convocação permanece `convocada` — R15).
19. **(R8)** Convocação ocorre em `2026-10-19T11:00:00-03:00` com encerramento às 11:30 → `convocadaAte: "2026-10-19T11:30:00-03:00"` (teto, não 13:00).
20. **(R8)** Convocação longe do encerramento (ex: 09:00 com encerramento 11:30) → `convocadaAte` = instante da convocação + 2 horas (`11:00`).
21. **(R8)** Relógio já após o encerramento das inscrições; participante cancela `confirmada` e libera vaga → **ninguém é convocado** (fila permanece `em_espera`).
22. **(R9)** Inscrição `convocada` com prazo vencido por `PUT /_teste/relogio`, sem nenhum outro acesso no meio → `GET /inscricoes` → a vencida com `status: "expirada"` e a seguinte da fila com `status: "convocada"`.
23. **(R10)** `POST /inscricoes/:id/cancelamento` em inscrição `confirmada`, `convocada` ou `em_espera` antes do início da atividade → **200**, `status: "cancelada"`.
24. **(R10)** Cancelar inscrição já `cancelada` ou `expirada` → **422 `INSCRICAO_INATIVA`**.
25. **(R10)** Relógio no início (ou depois) do primeiro encontro; cancelar inscrição ainda ativa → **422 `ATIVIDADE_JA_INICIADA`**.
26. **(R10)** Atividade já iniciada **e** inscrição já `cancelada`; cancelar → **422 `ATIVIDADE_JA_INICIADA`** (precedência: estado da atividade antes do recurso).
27. **(R11)** Organização cancela atividade que tinha `confirmada`, `convocada` e `em_espera` → `GET /inscricoes` mostra todas com `status: "cancelada"`; cancelar uma delas → **422 `INSCRICAO_INATIVA`**.
28. **(R12)** `org-ana` chama `POST /atividades/:id/inscricoes`, `POST /inscricoes/:id/confirmacao` ou `POST /inscricoes/:id/cancelamento` → **403 `SOMENTE_PARTICIPANTE`**.
29. **(R12)** `p-diego` tenta confirmar ou cancelar inscrição de `p-carla` → **404 `NAO_ENCONTRADO`** (e não 403).
30. **(R12)** Requisição sem `X-Usuario` em rota de inscrição → **401 `USUARIO_DESCONHECIDO`**; `POST /inscricoes/ins_inexistente/cancelamento` → **404 `NAO_ENCONTRADO`**.
31. **(R12)** `GET /inscricoes` como `p-carla` → só as inscrições dela; como `org-ana` → todas; com `?atividadeId=atv_x` → só daquela atividade.
32. **(R13)** Participante já inscrito (`JA_INSCRITO` valeria), relógio após o encerramento, tenta inscrever de novo → **422 `INSCRICOES_ENCERRADAS`** (não `JA_INSCRITO`).
33. **(R13)** `POST /atividades/:id/inscricoes` com `:id` de atividade inexistente → **404 `NAO_ENCONTRADO`**.
34. **(R13)** Inscrever em atividade cancelada → **422 `ATIVIDADE_CANCELADA`** (mesmo que também houvesse encerradas/conflito/limite potenciais).
35. **(R13)** Participante com 3 minicursos `confirmada` **e** conflito de horário com a nova atividade → inscrever → **409 `CONFLITO_DE_HORARIO`** (não `LIMITE_DE_MINICURSOS`).
36. **(R13, R2)** Participante sem qualquer impedimento inscreve-se em atividade aberta → **201**; nenhum cenário retorna `INSCRICAO_BLOQUEADA` (check fora de escopo, sempre passa).
37. **(R14)** Confirmar inscrição `em_espera` (ou `confirmada`) → **422 `SEM_CONVOCACAO`**.
38. **(R14)** Confirmar após `convocadaAte` vencido → **422 `CONVOCACAO_EXPIRADA`**.
39. **(R14)** Convocação com prazo vencido **e** conflito de horário; confirmar → **422 `CONVOCACAO_EXPIRADA`** (precedência sobre o rechec de conflito).
40. **(R14)** Convocada sem conflito e dentro do limite → confirmar → **200**, `status: "confirmada"`.
41. **(R15)** Convocada tenta confirmar com conflito → **409**; `GET /inscricoes/:id` → continua `convocada` com o mesmo `convocadaAte`; participante resolve o conflito e, antes do prazo, confirma → **200**.
42. **(R16)** A interface servida em `api/public` expõe, na listagem de atividades, as operações inscrever, cancelar e confirmar, e uma seção "minhas inscrições" com `status` e `posicaoNaEspera` (verificado por inspeção dos arquivos estáticos, não por teste HTTP).

---

## 7. Como isto será verificado
A verificação das R1–R15 será realizada por testes de integração de ponta a ponta executando requisições HTTP na aplicação iniciada via `criarServidor()` / Express, em `verificacoes/inscricoes.spec.js`. Cada teste sobe o servidor em porta efêmera, usa `fetch` com o cabeçalho `X-Usuario` apropriado, chama `POST /_teste/reset` antes de cada cenário e controla o tempo exclusivamente via `PUT /_teste/relogio` (relógio congelado, nunca `new Date()`), validando status HTTP, o campo `erro` e os campos da `Inscricao`/`Atividade` no corpo. A R16 (interface) é verificada por inspeção dos arquivos estáticos de `api/public` servidos pelo `express.static`.

---

## 8. Fatias de Entrega

1. **Fatia 1 — Inscrever e consultar (`POST /atividades/:id/inscricoes`, `GET /inscricoes`, `GET /inscricoes/:id`)**:
   Autorização e leitura (R12), encerramento (R1), nascimento na fila com vaga/sem vaga (R6), contadores da atividade (R4) e `JA_INSCRITO` com re-inscrição (R5).

2. **Fatia 2 — Recheces de inscrição e precedência (R3, R2, R13)**:
   Conflito de horário, limite de minicursos e ordem estrita de erros no inscrever, incluindo a nota de `INSCRICAO_BLOQUEADA` como integração fora de escopo (check não implementado).

3. **Fatia 3 — Cancelamento (`POST /inscricoes/:id/cancelamento`)**:
   Cancelamento por status com precedência `ATIVIDADE_JA_INICIADA` → `INSCRICAO_INATIVA` (R10), renumeração da fila (R6) e propagação do cancelamento da atividade do M1 para as inscrições (R11). A convocação disparada pelo cancelamento fica completa na fatia seguinte.

4. **Fatia 4 — Convocação e confirmação**:
   Gatilhos de convocação, inclusive aumento de vagas via `PATCH` do M1 (R7), teto/proibição pelo encerramento (R8), expiração em cascata (R9), precedência na confirmação (R14) e efeito da falha na confirmação (R15).

5. **Fatia 5 — Interface (R16)**:
   Botões inscrever/cancelar/confirmar na listagem de atividades e seção "minhas inscrições" com `status` e `posicaoNaEspera`.
