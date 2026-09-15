# Entrevista M1 — Grade de Atividades

Status: Rodada 1 em andamento

## Perguntas da Rodada 1

### P1 — Regras de Encontros por Tipo (`QUANTIDADE_DE_ENCONTROS`)
- **Pergunta**: Quantos encontros uma palestra e um minicurso devem ter?
- **Recomendação**: Palestra deve ter exatamente 1 encontro; minicurso pode ter 1 ou mais encontros (mínimo 1).
- **Status**: Pendente

### P2 — Validação de Encontro (`ENCONTRO_INVALIDO`)
- **Pergunta**: O que torna um encontro inválido ao criar/alterar atividade?
- **Recomendação**: Encontro com `fim <= inicio` ou datas fora da semana do evento (19/10/2026 a 23/10/2026).
- **Status**: Pendente

### P3 — Capacidade e Limite de Vagas (`VAGAS_ACIMA_DA_CAPACIDADE`)
- **Pergunta**: Como funciona a validação de vagas em relação à capacidade da sala?
- **Recomendação**: Retornar `VAGAS_ACIMA_DA_CAPACIDADE` (422) se `vagas > sala.capacidade`.
- **Status**: Pendente

### P4 — Conflito de Sala (`CONFLITO_DE_SALA`)
- **Pergunta**: Como se detecta conflito de sala ao agendar/alterar atividades?
- **Recomendação**: Qualquer sobreposição de horário nos encontros na mesma sala entre atividades ativas (não canceladas) retorna 409 `CONFLITO_DE_SALA`.
- **Status**: Pendente

### P5 — Campos Editáveis no PATCH (`CAMPO_NAO_EDITAVEL`)
- **Pergunta**: Quais campos da atividade podem ser alterados via `PATCH /atividades/:id` e quais geram `CAMPO_NAO_EDITAVEL`?
- **Recomendação**: Permite editar `titulo`, `salaId`, `vagas`. Se o corpo contiver `tipo` ou `encontros`, retorna `CAMPO_NAO_EDITAVEL`.
- **Status**: Pendente

### P6 — Redução de Vagas (`VAGAS_ABAIXO_DOS_INSCRITOS`)
- **Pergunta**: Em qual condição a alteração de vagas retorna 409 `VAGAS_ABAIXO_DOS_INSCRITOS`?
- **Recomendação**: Se o número de vagas informado for menor que a quantidade de inscritos atuais (`ocupadas`).
- **Status**: Pendente

### P7 — Cancelamento e Atividade Iniciada (`ATIVIDADE_JA_INICIADA`)
- **Pergunta**: Quando uma atividade é considerada "já iniciada" para impedir cancelamento?
- **Recomendação**: Se o relógio da API (`agora`) for igual ou superior ao horário de início do primeiro encontro.
- **Status**: Pendente

### P8 — Atividade Cancelada (`ATIVIDADE_CANCELADA`)
- **Pergunta**: Quais rotas/operações em uma atividade cancelada retornam 422 `ATIVIDADE_CANCELADA`?
- **Recomendação**: Tentativas de `PATCH /atividades/:id` e `POST /atividades/:id/cancelamento` em atividades com `situacao: "cancelada"`.
- **Status**: Pendente

### P9 — Precedência entre Regras de Negócio em M1
- **Pergunta**: Quando múltiplas regras do recurso forem violadas ao mesmo tempo, qual a ordem de precedência dos erros?
- **Recomendação**: 1. `ATIVIDADE_CANCELADA` -> 2. `ATIVIDADE_JA_INICIADA` -> 3. `CAMPO_NAO_EDITAVEL` -> 4. `QUANTIDADE_DE_ENCONTROS` / `ENCONTRO_INVALIDO` -> 5. `VAGAS_ACIMA_DA_CAPACIDADE` -> 6. `VAGAS_ABAIXO_DOS_INSCRITOS` -> 7. `CONFLITO_DE_SALA`.
- **Status**: Pendente
