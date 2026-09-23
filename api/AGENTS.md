# AGENTS — API e interface

Subprojeto único do repositório: a API Express e a interface web estática.

## Stack

- Node.js 22 + Express 4, módulos ES (`"type": "module"`).
- Dados em memória (sem SQLite, sem banco externo). Estado zera a cada `POST /_teste/reset`.
- Interface: `public/` (HTML, CSS, JS puro), servida por `express.static`.

## Estrutura

```
api/
  src/
    index.js            # sobe o servidor na porta PORT (padrão 3000)
    app.js              # criarServidor(): middleware de X-Usuario + rotas
    controllers/        # só HTTP: ler corpo/cabeçalho, chamar service, responder
    services/           # regras de negócio e dados (stores em memória)
  public/               # interface web
  package.json          # start: node src/index.js
```

## Convenções

- Controller nunca guarda estado nem decide regra de negócio; isso é do service.
- Service nunca escreve em `res` nem lê `req`.
- Erro: `res.status(<codigo>).json({ erro: 'CODIGO', mensagem: '...' })` — mensagem é livre, o `erro` e o status não.
- Identificação: middleware em `app.js` valida `X-Usuario` para rotas identificadas; rotas `/_teste/*` e `GET /certificados/:codigo` ficam de fora.
- Tempo (`MODO_TESTE=1`): usar `relogioService` / `PUT /_teste/relogio`; nunca `new Date()` direto em regra de negócio.
- IDs gerados: prefixo + 8 hex minúsculos (`atv_…`, `enc_…`, `ins_…`, `pre_…`).

## Rotas por módulo

- M1 (feito): `/salas`, `/atividades` (GET/POST/PATCH/cancelamento).
- M2 (feito): `/atividades/:id/inscricoes`, `/inscricoes`, `/inscricoes/:id` (+ cancelamento, confirmacao).
- `/_teste/*` (feito): reset e relógio.

## Testes

- Testam pela interface HTTP: importam `criarServidor()` de `src/app.js`, sobem em porta efêmera e usam `fetch`.
- Arquivo do módulo em `../verificacoes/<recurso>.spec.js`.
- Rodar: `npm test` na raiz ou em `api/` (ambos apontam para `verificacoes/*.spec.js`).
- Antes de cada teste: `POST /_teste/reset`.
