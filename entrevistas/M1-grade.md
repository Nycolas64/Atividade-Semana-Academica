# Entrevista M1 — Grade de Atividades

Status: Rodada 1 concluída

## Perguntas da Rodada 1

### P1 — Regras de Encontros por Tipo (`QUANTIDADE_DE_ENCONTROS`)
- **Pergunta**: Quantos encontros uma palestra e um minicurso devem ter?
- **Recomendação**: Palestra deve ter exatamente 1 encontro; minicurso pode ter 1 ou mais encontros (mínimo 1).
- **Resposta**: Palestra tem exatamente 1 encontro (RN-102) e minicurso tem de 2 a 5 encontros (RN-103).
- **Fonte**: RN-102, RN-103
- **Status**: Respondido

### P2 — Validação de Encontro (`ENCONTRO_INVALIDO`)
- **Pergunta**: O que torna um encontro inválido ao criar/alterar atividade?
- **Recomendação**: Encontro com `fim <= inicio` ou datas fora da semana do evento (19/10/2026 a 23/10/2026).
- **Resposta**: Encontro é inválido se durar menos de 1h ou mais de 4h (RN-104), se não começar e terminar no mesmo dia entre 19 e 23/10/2026 (RN-105), ou se tiver horário sobreposto na mesma atividade (RN-106).
- **Fonte**: RN-104, RN-105, RN-106
- **Status**: Respondido

### P3 — Capacidade e Limite de Vagas (`VAGAS_ACIMA_DA_CAPACIDADE`)
- **Pergunta**: Como funciona a validação de vagas em relação à capacidade da sala?
- **Recomendação**: Retornar `VAGAS_ACIMA_DA_CAPACIDADE` (422) se `vagas > sala.capacidade`.
- **Resposta**: Vagas ficam entre 1 e a capacidade da sala (RN-107). Se passar da capacidade, devolve 422 `VAGAS_ACIMA_DA_CAPACIDADE`.
- **Fonte**: RN-107
- **Status**: Respondido

### P4 — Conflito de Sala (`CONFLITO_DE_SALA`)
- **Pergunta**: Como se detecta conflito de sala ao agendar/alterar atividades?
- **Recomendação**: Qualquer sobreposição de horário nos encontros na mesma sala entre atividades ativas (não canceladas) retorna 409 `CONFLITO_DE_SALA`.
- **Resposta**: Na mesma sala tem que ter no mínimo 15 min de intervalo entre encontros para limpeza (RN-108). Qualquer sobreposição ou intervalo menor dá 409 `CONFLITO_DE_SALA`, ignorando atividade cancelada.
- **Fonte**: RN-108
- **Status**: Respondido

### P5 — Campos Editáveis no PATCH (`CAMPO_NAO_EDITAVEL`)
- **Pergunta**: Quais campos da atividade podem ser alterados via `PATCH /atividades/:id` e quais geram `CAMPO_NAO_EDITAVEL`?
- **Recomendação**: Permite editar `titulo`, `salaId`, `vagas`. Se o corpo contiver `tipo` ou `encontros`, retorna `CAMPO_NAO_EDITAVEL`.
- **Resposta**: Depois de criar só dá pra mudar título e vagas (RN-110). Se tentar mudar tipo, salaId ou encontros dá 422 `CAMPO_NAO_EDITAVEL`.
- **Fonte**: RN-110
- **Status**: Respondido

### P6 — Redução de Vagas (`VAGAS_ABAIXO_DOS_INSCRITOS`)
- **Pergunta**: Em qual condição a alteração de vagas retorna 409 `VAGAS_ABAIXO_DOS_INSCRITOS`?
- **Recomendação**: Se o número de vagas informado for menor que a quantidade de inscritos atuais (`ocupadas`).
- **Resposta**: Não pode diminuir vagas abaixo dos inscritos confirmados e convocados (RN-111). Se tentar, dá 409 `VAGAS_ABAIXO_DOS_INSCRITOS`.
- **Fonte**: RN-111
- **Status**: Respondido

### P7 — Cancelamento e Atividade Iniciada (`ATIVIDADE_JA_INICIADA`)
- **Pergunta**: Quando uma atividade é considerada "já iniciada" para impedir cancelamento?
- **Recomendação**: Se o relógio da API (`agora`) for igual ou superior ao horário de início do primeiro encontro.
- **Resposta**: Atividade é considerada iniciada no horário do primeiro encontro (RN-112). Tentar cancelar depois dá 422 `ATIVIDADE_JA_INICIADA`.
- **Fonte**: RN-112
- **Status**: Respondido

### P8 — Atividade Cancelada (`ATIVIDADE_CANCELADA`)
- **Pergunta**: Quais rotas/operações em uma atividade cancelada retornam 422 `ATIVIDADE_CANCELADA`?
- **Recomendação**: Tentativas de `PATCH /atividades/:id` e `POST /atividades/:id/cancelamento` em atividades com `situacao: "cancelada"`.
- **Resposta**: Cancelamento é definitivo (RN-113). Tentar alterar ou cancelar de novo uma atividade cancelada dá 422 `ATIVIDADE_CANCELADA`.
- **Fonte**: RN-113
- **Status**: Respondido

### P9 — Precedência entre Regras de Negócio em M1
- **Pergunta**: Quando múltiplas regras do recurso forem violadas ao mesmo tempo, qual a ordem de precedência dos erros?
- **Recomendação**: 1. `ATIVIDADE_CANCELADA` -> 2. `ATIVIDADE_JA_INICIADA` -> 3. `CAMPO_NAO_EDITAVEL` -> 4. `QUANTIDADE_DE_ENCONTROS` / `ENCONTRO_INVALIDO` -> 5. `VAGAS_ACIMA_DA_CAPACIDADE` -> 6. `VAGAS_ABAIXO_DOS_INSCRITOS` -> 7. `CONFLITO_DE_SALA`.
- **Resposta**: A ordem de precedência de erros é `ATIVIDADE_CANCELADA` depois `ATIVIDADE_JA_INICIADA` depois `CAMPO_NAO_EDITAVEL` depois `QUANTIDADE_DE_ENCONTROS` ou `ENCONTRO_INVALIDO` depois `VAGAS_ACIMA_DA_CAPACIDADE` depois `VAGAS_ABAIXO_DOS_INSCRITOS` e por último `CONFLITO_DE_SALA`, conforme `contrato-api.md` e RN-208.
- **Fonte**: RN-208, contrato-api.md
- **Status**: Respondido
