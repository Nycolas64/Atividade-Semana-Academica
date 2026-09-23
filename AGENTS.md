# AGENTS — Semana Acadêmica

## Stack

- API: Node.js 22 + Express, módulos ES (`"type": "module"`).
- Dados: em memória (arrays/Maps nos services; sem banco externo). `POST /_teste/reset` zera e recarrega os dados iniciais.
- Interface: HTML/CSS/JS estáticos em `api/public`, servidos pelo Express.
- Testes: `node --test` + `node:assert/strict` na raiz, arquivos em `verificacoes/*.spec.js`.

## Equipe

- M1 — Grade de atividades: Nycolas Rozisca Moreno (Nycolas64) — concluído.
- M2 — Inscrições e lista de espera: Gabriel Augusto Giroto (Girotin) — concluído.
- Grupo de 2: apenas M1 e M2.

## Regras do projeto

- Contrato: seguir `contrato-api.md` à risca (rotas, campos e códigos não se negociam). Erro sempre no formato `{"erro": "CODIGO", "mensagem": "..."}`.
- Arquitetura: controllers tratam apenas HTTP; regras de negócio e dados ficam em `api/src/services/`.
- Identificação: validar o cabeçalho `X-Usuario` em toda rota identificada (401 `USUARIO_DESCONHECIDO` se ausente ou id inexistente). Ordem de checagem: 401 → 403 → 404 → 422 → regras do recurso.
- Tempo: com `MODO_TESTE=1`, usar o relógio de `/_teste/relogio` (nunca `new Date()` direto).
- Documento de requisitos: fica FORA do repositório; só se consulta na rodada 2 da entrevista. Nunca commitar, anexar ou pedir ao agente para lê-lo.

## Fluxo por módulo

1. Entrevista rodada 1 (skill `grilling`) → rodada 2 (consulta o documento de requisitos).
2. Spec com a skill `to-spec` em `specs/`.
3. Implementação com a skill `tdd` (ciclo vermelho→verde, uma fatia por vez).
4. Auditoria: `@auditor audite o módulo Mn contra specs/Mn-*.md` → salvar o parecer inteiro em `auditorias/`.
5. Evidências: `node evidencias/exportar-evidencias.cjs` (toda semana).

## Comandos

- Instalar API: `npm install` (em `api/`)
- Subir API: `npm start` (em `api/`, com `MODO_TESTE=1` e `PORT=3000` quando o juiz rodar)
- Testes: `npm test` (na raiz)