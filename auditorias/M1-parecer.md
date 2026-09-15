## Matriz de rastreabilidade

| Regra | Origem | Teste que comprova | Veredito |
|---|---|---|---|
| R1 | P1 (RN-102, RN-103) | verificacoes/grade.spec.js:210 «Critério 1: palestra com 2 encontros -> 422 QUANTIDADE_DE_ENCONTROS» | COMPROVADA |
| R1 | P1 (RN-102, RN-103) | verificacoes/grade.spec.js:230 «Critério 2: minicurso com 1 encontro -> 422 QUANTIDADE_DE_ENCONTROS» | COMPROVADA |
| R1 | P1 (RN-102, RN-103) | verificacoes/grade.spec.js:249 «Critério 3: minicurso com 2 encontros válidos -> 201 Atividade criada» | COMPROVADA |
| R2 | P2 (RN-104, RN-105, RN-106) | verificacoes/grade.spec.js:271 «Critério 4: encontro de 45 minutos -> 422 ENCONTRO_INVALIDO» | COMPROVADA |
| R2 | P2 (RN-104, RN-105, RN-106) | verificacoes/grade.spec.js:290 «Critério 5: encontro com data fora da Semana Acadêmica -> 422 ENCONTRO_INVALIDO» | COMPROVADA |
| R2 | P2 (RN-104, RN-105, RN-106) | verificacoes/grade.spec.js:309 «Critério 6: sobreposição de encontros na mesma atividade -> 422 ENCONTRO_INVALIDO» | COMPROVADA |
| R3 | P3 (RN-107) | verificacoes/grade.spec.js:329 «Critério 7: vagas (25) acima da capacidade da sala lab-3 (20) -> 422 VAGAS_ACIMA_DA_CAPACIDADE» | COMPROVADA |
| R3 | P3 (RN-107) | verificacoes/grade.spec.js:425 «Critério 8: PATCH vagas (30) acima da capacidade da sala lab-3 (20) -> 422 VAGAS_ACIMA_DA_CAPACIDADE» | COMPROVADA |
| R4 | P4 (RN-108) | verificacoes/grade.spec.js:348 «Critério 9: conflito de sala com intervalo de limpeza de 10 min (< 15 min) -> 409 CONFLITO_DE_SALA» | COMPROVADA |
| R4 | P4 (RN-108) | verificacoes/grade.spec.js:383 «Critério 10: conflito apenas com atividade cancelada -> 201 cadastrado com sucesso» | COMPROVADA |
| R5 | P5 (RN-110) | verificacoes/grade.spec.js:451 «Critério 11: PATCH com campo não editável (salaId) -> 422 CAMPO_NAO_EDITAVEL» | COMPROVADA |
| R5 | P5 (RN-110) | verificacoes/grade.spec.js:477 «Critério 12: PATCH com titulo e vagas válidos -> 200 atualizado» | COMPROVADA |
| R6 | P6 (RN-111) | verificacoes/grade.spec.js:504 «Critério 13: PATCH com vagas (5) menor que ocupadas (8) -> 409 VAGAS_ABAIXO_DOS_INSCRITOS» | COMPROVADA |
| R7 | P7 (RN-112) | verificacoes/grade.spec.js:572 «Critério 14: cancelamento após ou no instante de início -> 422 ATIVIDADE_JA_INICIADA» | COMPROVADA |
| R8 | P8 (RN-113) | verificacoes/grade.spec.js:537 «Critério 15: PATCH em atividade cancelada -> 422 ATIVIDADE_CANCELADA» | COMPROVADA |
| R8 | P8 (RN-113) | verificacoes/grade.spec.js:604 «Critério 16: cancelamento em atividade já cancelada -> 422 ATIVIDADE_CANCELADA» | COMPROVADA |
| R9 | P9 (RN-208) | verificacoes/grade.spec.js:639 «Critério 17: PATCH em atividade cancelada enviando salaId e vagas excessivas -> 422 ATIVIDADE_CANCELADA» | COMPROVADA |

## Suíte

npm test ? 
> semana-academica-root@1.0.0 test
> node --test verificacoes/*.spec.js

? API M1 — Grade de Atividades
  ? Autenticação e Permissões
    ? recusa requisição sem X-Usuario com 401 USUARIO_DESCONHECIDO
    ? recusa requisição com X-Usuario inexistente com 401 USUARIO_DESCONHECIDO
    ? recusa criação de atividade enviada por participante com 403 SOMENTE_ORGANIZACAO
  ? Fatia 1 — Consulta de Salas e Atividades
    ? GET /salas retorna 200 e lista de salas estáticas
    ? GET /atividades retorna 200 com lista de atividades e campos calculados
    ? GET /atividades filtra por dia e por tipo
    ? GET /atividades/:id retorna 404 se inexistente e 200 com detalhes se existir
  ? Fatia 2 — Criação de Atividades (POST /atividades)
    ? Critério 1: palestra com 2 encontros -> 422 QUANTIDADE_DE_ENCONTROS
    ? Critério 2: minicurso com 1 encontro -> 422 QUANTIDADE_DE_ENCONTROS
    ? Critério 3: minicurso com 2 encontros válidos -> 201 Atividade criada
    ? Critério 4: encontro de 45 minutos -> 422 ENCONTRO_INVALIDO
    ? Critério 5: encontro com data fora da Semana Acadêmica -> 422 ENCONTRO_INVALIDO
    ? Critério 6: sobreposição de encontros na mesma atividade -> 422 ENCONTRO_INVALIDO
    ? Critério 7: vagas (25) acima da capacidade da sala lab-3 (20) -> 422 VAGAS_ACIMA_DA_CAPACIDADE
    ? Critério 9: conflito de sala com intervalo de limpeza de 10 min (< 15 min) -> 409 CONFLITO_DE_SALA
    ? Critério 10: conflito apenas com atividade cancelada -> 201 cadastrado com sucesso
  ? Fatia 3 — Alteração de Atividades (PATCH /atividades/:id)
    ? Critério 8: PATCH vagas (30) acima da capacidade da sala lab-3 (20) -> 422 VAGAS_ACIMA_DA_CAPACIDADE
    ? Critério 11: PATCH com campo não editável (salaId) -> 422 CAMPO_NAO_EDITAVEL
    ? Critério 12: PATCH com titulo e vagas válidos -> 200 atualizado
    ? Critério 13: PATCH com vagas (5) menor que ocupadas (8) -> 409 VAGAS_ABAIXO_DOS_INSCRITOS
    ? Critério 15: PATCH em atividade cancelada -> 422 ATIVIDADE_CANCELADA
  ? Fatia 4 — Cancelamento de Atividades (POST /atividades/:id/cancelamento)
    ? Critério 14: cancelamento após ou no instante de início -> 422 ATIVIDADE_JA_INICIADA
    ? Critério 16: cancelamento em atividade já cancelada -> 422 ATIVIDADE_CANCELADA
  ? Fatia 5 — Precedência e Ajustes Finos (R9)
    ? Critério 17: PATCH em atividade cancelada enviando salaId e vagas excessivas -> 422 ATIVIDADE_CANCELADA
? API M1 — Grade de Atividades (1007.6343ms)
? tests 24
? suites 7
? pass 24
? fail 0
? cancelled 0
? skipped 0
? todo 0
? duration_ms 1680.8003

## Achados

Nenhum achado relevante. Todas as 9 regras da spec (R1 a R9) possuem origem rastreada na entrevista (P1 a P9) e testes robustos correspondentes que cobrem integralmente os critérios de aceite.

## Veredito

O módulo M1 está completo, com todas as regras comprovadas por testes de integração e pode ser aceito.
