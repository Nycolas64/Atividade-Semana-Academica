# Spec — M1: Grade de Atividades

## 1. Objetivo
Permitir a gestão da programação da Semana Acadêmica 2026, viabilizando a consulta de salas e a criação, alteração, cancelamento e listagem de atividades (palestras e minicursos) por membros da organização e participantes do evento.

## 2. Fora de escopo
- Gestão e criação de usuários ou salas (dados estáticos preexistentes no sistema).
- Realização de inscrições ou controle de fila de espera (escopo do módulo M2).
- Leitura e marcação de presença em encontros via QR code (escopo do módulo M3).
- Emissão de certificados e extrato de horas complementares (escopo do módulo M4).
- Painel analítico e gerenciamento de bloqueios da organização (escopo do módulo M5).

## 3. Modelo

### Sala
- `id` (string): Identificador único da sala (ex: `sala-101`, estático).
- `nome` (string): Nome legível da sala (estático).
- `capacidade` (inteiro): Capacidade máxima de ocupantes da sala (estático).

### Encontro
- `id` (string): Identificador gerado no padrão `enc_xxxxxxxx` (calculado/gerado).
- `inicio` (string ISO 8601 com fuso): Instante de início do encontro (informado pelo cliente).
- `fim` (string ISO 8601 com fuso): Instante de término do encontro (informado pelo cliente).

### Atividade
- `id` (string): Identificador gerado no padrão `atv_xxxxxxxx` (calculado/gerado).
- `titulo` (string): Título da atividade (informado pelo cliente).
- `tipo` (string): Tipo da atividade (`"palestra"` ou `"minicurso"`, informado pelo cliente).
- `salaId` (string): Identificador da sala vinculada (informado pelo cliente).
- `vagas` (inteiro): Quantidade total de vagas oferecidas (informado pelo cliente).
- `encontros` (lista de Encontro): Encontros vinculados à atividade, ordenados por data/hora de início (informado/gerado).
- `cargaHorariaMinutos` (inteiro): Soma da duração em minutos de todos os encontros (derivado/calculado).
- `situacao` (string): Estado da atividade (`"prevista"`, `"em_andamento"`, `"encerrada"`, `"cancelada"`, derivado/calculado).
- `ocupadas` (inteiro): Quantidade de inscritos confirmados e convocados (derivado/calculado).
- `vagasRestantes` (inteiro): Diferença `vagas - ocupadas` (derivado/calculado).
- `emEspera` (inteiro): Quantidade de inscritos na fila de espera (derivado/calculado).

## 4. Endpoints

| Método | Caminho | Permissão | Sucesso | Descrição |
|---|---|---|---|---|
| GET | `/salas` | todos | 200 `[Sala]` | Lista todas as salas cadastradas. |
| GET | `/atividades` | todos | 200 `[Atividade]` | Lista atividades (filtros opcionais `?dia=AAAA-MM-DD` e `?tipo=palestra\|minicurso`). |
| GET | `/atividades/:id` | todos | 200 `Atividade` | Detalhes de uma atividade específica. |
| POST | `/atividades` | organização | 201 `Atividade` | Cria uma nova atividade. |
| PATCH | `/atividades/:id` | organização | 200 `Atividade` | Atualiza título e/ou vagas de uma atividade. |
| POST | `/atividades/:id/cancelamento` | organização | 200 `Atividade` | Cancela uma atividade. |

---

## 5. Regras

- **R1 (P1, RN-102, RN-103) — Quantidade de encontros por tipo**:
  Uma palestra deve possuir exatamente 1 encontro (P1, RN-102). Um minicurso deve possuir de 2 a 5 encontros (P1, RN-103). Qualquer tentativa de criação (`POST /atividades`) que não atenda a essa restrição deve ser recusada com status **422** e erro `QUANTIDADE_DE_ENCONTROS`.

- **R2 (P2, RN-104, RN-105, RN-106) — Validação dos encontros**:
  Cada encontro enviado na criação deve ter duração entre 1 hora (60 minutos) e 4 horas (240 minutos) (P2, RN-104), deve iniciar e terminar no mesmo dia dentro do período do evento (19/10/2026 a 23/10/2026 no fuso -03:00) (P2, RN-105) e não pode ter sobreposição de horários com outro encontro da mesma atividade (P2, RN-106). Encontros que violarem qualquer um desses critérios retornam status **422** e erro `ENCONTRO_INVALIDO`.

- **R3 (P3, RN-107) — Limite de vagas pela capacidade da sala**:
  A quantidade de vagas de uma atividade deve ser um valor entre 1 e a capacidade total da sala atribuída (`vagas <= sala.capacidade`) (P3, RN-107). Tentar definir `vagas` acima da capacidade da sala na criação ou alteração retorna status **422** e erro `VAGAS_ACIMA_DA_CAPACIDADE`.

- **R4 (P4, RN-108) — Conflito de uso da sala e tempo de limpeza**:
  Na mesma sala, deve existir um intervalo livre mínimo de 15 minutos entre o término de um encontro e o início do próximo encontro de outra atividade (P4, RN-108). Qualquer sobreposição ou intervalo inferior a 15 minutos em relação a atividades ativas (não canceladas) resulta em recusa com status **409** e erro `CONFLITO_DE_SALA`. Atividades canceladas são ignoradas nesta validação (P4, RN-108).

- **R5 (P5, RN-110) — Restrição de campos editáveis via PATCH**:
  Após a criação da atividade, apenas os campos `titulo` e `vagas` podem ser alterados via `PATCH /atividades/:id` (P5, RN-110). Se a requisição contiver os campos `tipo`, `salaId` ou `encontros`, a operação deve ser recusada com status **422** e erro `CAMPO_NAO_EDITAVEL`.

- **R6 (P6, RN-111) — Limite mínimo de vagas baseado em inscritos**:
  Não é permitido alterar a quantidade de vagas de uma atividade para um número menor do que a quantidade de inscritos atuais confirmados e convocados (`ocupadas`) (P6, RN-111). Caso `vagas < ocupadas`, a requisição deve retornar status **409** e erro `VAGAS_ABAIXO_DOS_INSCRITOS`.

- **R7 (P7, RN-112) — Impedimento de cancelamento de atividade iniciada**:
  Uma atividade é considerada iniciada se o horário atual do relógio do sistema (`agora`) for maior ou igual ao horário de início do seu primeiro encontro (P7, RN-112). Tentativas de cancelar via `POST /atividades/:id/cancelamento` uma atividade já iniciada retornam status **422** e erro `ATIVIDADE_JA_INICIADA`.

- **R8 (P8, RN-113) — Definitividade do cancelamento**:
  O cancelamento de uma atividade é uma operação definitiva (P8, RN-113). Tentativas de alterar (via `PATCH /atividades/:id`) ou cancelar novamente (via `POST /atividades/:id/cancelamento`) uma atividade com `situacao: "cancelada"` devem retornar status **422** e erro `ATIVIDADE_CANCELADA`.

- **R9 (P9, RN-208) — Precedência entre erros do recurso**:
  Quando múltiplos erros de negócio do recurso forem disparados pela mesma requisição, a API deve responder com o erro de maior prioridade segundo a ordem estrita (P9, RN-208):
  1. `ATIVIDADE_CANCELADA` (422)
  2. `ATIVIDADE_JA_INICIADA` (422)
  3. `CAMPO_NAO_EDITAVEL` (422)
  4. `QUANTIDADE_DE_ENCONTROS` (422) / `ENCONTRO_INVALIDO` (422)
  5. `VAGAS_ACIMA_DA_CAPACIDADE` (422)
  6. `VAGAS_ABAIXO_DOS_INSCRITOS` (409)
  7. `CONFLITO_DE_SALA` (409)

---

## 6. Critérios de Aceite

1. **(R1)** POST `/atividades` com `tipo: "palestra"` e 2 encontros enviado por `org-ana` → **422 `QUANTIDADE_DE_ENCONTROS`**.
2. **(R1)** POST `/atividades` com `tipo: "minicurso"` e 1 encontro enviado por `org-ana` → **422 `QUANTIDADE_DE_ENCONTROS`**.
3. **(R1)** POST `/atividades` com `tipo: "minicurso"` e 2 encontros válidos enviado por `org-ana` → **201**, retorna objeto `Atividade` criada.
4. **(R2)** POST `/atividades` com encontro de duração 45 minutos (menor que 1h) → **422 `ENCONTRO_INVALIDO`**.
5. **(R2)** POST `/atividades` com encontro com data fora da Semana Acadêmica (ex: 18/10/2026 ou 24/10/2026) → **422 `ENCONTRO_INVALIDO`**.
6. **(R2)** POST `/atividades` com dois encontros cujos horários se sobrepõem na mesma atividade → **422 `ENCONTRO_INVALIDO`**.
7. **(R3)** POST `/atividades` na sala `lab-3` (capacidade 20) com `vagas: 25` → **422 `VAGAS_ACIMA_DA_CAPACIDADE`**.
8. **(R3)** PATCH `/atividades/atv_1` na sala `lab-3` com `vagas: 30` → **422 `VAGAS_ACIMA_DA_CAPACIDADE`**.
9. **(R4)** POST `/atividades` na sala `sala-101` com encontro das 14:00 às 16:00, tendo outra atividade ativa na mesma sala das 16:10 às 18:00 (intervalo de 10 min < 15 min) → **409 `CONFLITO_DE_SALA`**.
10. **(R4)** POST `/atividades` em horário que conflita apenas com uma atividade cancelada → **201**, cadastrado com sucesso.
11. **(R5)** PATCH `/atividades/atv_1` com corpo `{"salaId": "sala-102"}` enviado por `org-ana` → **422 `CAMPO_NAO_EDITAVEL`**.
12. **(R5)** PATCH `/atividades/atv_1` com corpo `{"titulo": "Novo Título", "vagas": 15}` enviado por `org-ana` → **200**, atualiza os campos com sucesso.
13. **(R6)** PATCH `/atividades/atv_1` com `vagas: 5` em atividade que já possui 8 inscritos ocupados (`ocupadas: 8`) → **409 `VAGAS_ABAIXO_DOS_INSCRITOS`**.
14. **(R7)** POST `/atividades/atv_1/cancelamento` enviado após ou exatamente no instante de início do primeiro encontro de `atv_1` → **422 `ATIVIDADE_JA_INICIADA`**.
15. **(R8)** PATCH `/atividades/atv_cancelada` em atividade cancelada → **422 `ATIVIDADE_CANCELADA`**.
16. **(R8)** POST `/atividades/atv_cancelada/cancelamento` em atividade cancelada → **422 `ATIVIDADE_CANCELADA`**.
17. **(R9)** PATCH `/atividades/atv_cancelada` enviando `{"salaId": "sala-102", "vagas": 999}` → **422 `ATIVIDADE_CANCELADA`** (precedência nível 1 sobre níveis 3 e 5).

---

## 7. Como isto será verificado
A verificação será realizada por testes de integração de ponta a ponta executando requisições HTTP na aplicação iniciada via `criarServidor()` / Express.
Cada teste enviará requisições com os cabeçalhos apropriados (ex: `X-Usuario: org-ana`) e dados no corpo, validando os códigos de status HTTP e as estruturas JSON de erro/resposta retornadas.

---

## 8. Fatias de Entrega

1. **Fatia 1 — Consulta de Salas e Atividades (`GET /salas`, `GET /atividades`, `GET /atividades/:id`)**:
   Implementação da leitura de dados estáticos e cálculo dos campos derivados (`situacao`, `cargaHorariaMinutos`, `ocupadas`, `vagasRestantes`, `emEspera`).

2. **Fatia 2 — Criação de Atividades (`POST /atividades`)**:
   Validação de autenticação/autorização da organização, aplicação das regras de tipo/encontros (R1), qualidade dos encontros (R2), vagas/capacidade (R3) e conflito de sala/limpeza (R4).

3. **Fatia 3 — Alteração de Atividades (`PATCH /atividades/:id`)**:
   Validação dos campos permitidos (R5), checagem contra inscritos atuais (R6), vagas vs capacidade (R3) e restrições de atividade cancelada (R8).

4. **Fatia 4 — Cancelamento de Atividades (`POST /atividades/:id/cancelamento`)**:
   Validação de horário de início (R7) e definitividade do cancelamento (R8).

5. **Fatia 5 — Precedência e Ajustes Finos (R9)**:
   Garantia da ordem de precedência de erros em múltiplos cenários simultâneos.
