---
name: regra-de-tempo
description: Gerencia e testa regras de tempo, relógio simulado e prazos no modo de teste (MODO_TESTE=1). Use para implementar ou testar rotas dependentes de tempo, expiração, janelas de tolerância ou convocações.
---

# Regras de tempo e relógio

Regras de tempo no projeto usam o relógio simulado do modo de teste (`MODO_TESTE=1`). Nunca se usa a hora do sistema direto.

Serviços e rotas consultam o relógio estático e processam pendências de tempo antes de qualquer ação.

## Onde mora

```
.opencode/skills/regra-de-tempo/SKILL.md
```

## As regras

**1. O relógio é simulado (`MODO_TESTE=1`).**

```javascript
// Ruim: usa hora real do computador
const agora = new Date();

// Bom: lê a hora do relógio de teste
const agora = await obterRelogioSimulado();
```

No modo de teste, a hora fica parada até que alguém chame `PUT /_teste/relogio`. Toda consulta de data/hora deve passar pelo relógio estático do sistema.

**2. Expiração em cascata antes de processar.**

Quando o relógio avança, coisas pendentes vencem em ordem cronológica antes da requisição atual ser executada.

- Se uma convocação venceu (`convocadaAte < agora`), ela vira `expirada`.
- O próximo da fila de espera é convocado na hora com o novo prazo (`convocadaAte = agora + 2h`).
- Se esse novo prazo também já passou no relógio atual, ele expira em cascata.

**3. Fechamento de inscrições.**

Inscrições fecham exatamente 30 minutos antes do início do primeiro encontro.

```javascript
const limiteInscricao = new Date(inicioPrimeiroEncontro.getTime() - 30 * 60 * 1000);
if (agora >= limiteInscricao) {
  throw erro('INSCRICOES_ENCERRADAS', 422);
}
```

**4. Limite de convocação.**

O prazo de convocação é de até 2 horas, mas **nunca** pode ultrapassar o horário de fechamento das inscrições.

```javascript
const duasHorasDepois = new Date(agora.getTime() + 2 * 60 * 60 * 1000);
const convocadaAte = duasHorasDepois < limiteInscricao ? duasHorasDepois : limiteInscricao;
```

**5. Como testar.**

Nos testes automatizados, altere o relógio usando a rota de teste e verifique o efeito imediato na API:

```javascript
await fetch(`${base}/_teste/relogio`, {
  method: 'PUT',
  body: JSON.stringify({ agora: '2026-10-19T18:00:00-03:00' })
});
```
