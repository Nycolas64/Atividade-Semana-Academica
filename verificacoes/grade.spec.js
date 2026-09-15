import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from '../api/src/app.js';

process.env.MODO_TESTE = '1';

describe('API M1 — Grade de Atividades', () => {
  let server;
  let url;

  const headersOrg = {
    'Content-Type': 'application/json',
    'X-Usuario': 'org-ana'
  };

  const headersPart = {
    'Content-Type': 'application/json',
    'X-Usuario': 'p-carla'
  };

  before(async () => {
    const app = criarServidor();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        url = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(async () => {
    await fetch(`${url}/_teste/reset`, { method: 'POST' });
  });

  describe('Autenticação e Permissões', () => {
    it('recusa requisição sem X-Usuario com 401 USUARIO_DESCONHECIDO', async () => {
      const res = await fetch(`${url}/salas`);
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.erro, 'USUARIO_DESCONHECIDO');
    });

    it('recusa requisição com X-Usuario inexistente com 401 USUARIO_DESCONHECIDO', async () => {
      const res = await fetch(`${url}/salas`, {
        headers: { 'X-Usuario': 'usuario-fake' }
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.erro, 'USUARIO_DESCONHECIDO');
    });

    it('recusa criação de atividade enviada por participante com 403 SOMENTE_ORGANIZACAO', async () => {
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersPart,
        body: JSON.stringify({
          titulo: 'Palestra Teste',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            {
              inicio: '2026-10-19T09:00:00-03:00',
              fim: '2026-10-19T10:30:00-03:00'
            }
          ]
        })
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.erro, 'SOMENTE_ORGANIZACAO');
    });
  });

  describe('Fatia 1 — Consulta de Salas e Atividades', () => {
    it('GET /salas retorna 200 e lista de salas estáticas', async () => {
      const res = await fetch(`${url}/salas`, { headers: headersPart });
      assert.equal(res.status, 200);
      const salas = await res.json();
      assert.equal(Array.isArray(salas), true);
      assert.equal(salas.length, 4);
      assert.deepEqual(
        salas.map((s) => s.id),
        ['auditorio', 'sala-101', 'sala-102', 'lab-3']
      );
    });

    it('GET /atividades retorna 200 com lista de atividades e campos calculados', async () => {
      // Criar 1 atividade primeiro
      const postRes = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Introdução ao Node.js',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 30,
          encontros: [
            {
              inicio: '2026-10-19T10:00:00-03:00',
              fim: '2026-10-19T12:00:00-03:00'
            }
          ]
        })
      });
      assert.equal(postRes.status, 201);

      const res = await fetch(`${url}/atividades`, { headers: headersPart });
      assert.equal(res.status, 200);
      const atividades = await res.json();
      assert.equal(atividades.length, 1);
      assert.equal(atividades[0].titulo, 'Introdução ao Node.js');
      assert.equal(atividades[0].cargaHorariaMinutos, 120);
      assert.equal(atividades[0].situacao, 'prevista');
      assert.equal(atividades[0].vagasRestantes, 30);
    });

    it('GET /atividades filtra por dia e por tipo', async () => {
      // Criar palestra dia 19
      await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Palestra A',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            {
              inicio: '2026-10-19T09:00:00-03:00',
              fim: '2026-10-19T10:30:00-03:00'
            }
          ]
        })
      });

      // Criar minicurso dia 20 e 21
      await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Minicurso B',
          tipo: 'minicurso',
          salaId: 'sala-102',
          vagas: 15,
          encontros: [
            {
              inicio: '2026-10-20T14:00:00-03:00',
              fim: '2026-10-20T16:00:00-03:00'
            },
            {
              inicio: '2026-10-21T14:00:00-03:00',
              fim: '2026-10-21T16:00:00-03:00'
            }
          ]
        })
      });

      // Filtrar tipo palestra
      const resTipo = await fetch(`${url}/atividades?tipo=palestra`, { headers: headersPart });
      const listaTipo = await resTipo.json();
      assert.equal(listaTipo.length, 1);
      assert.equal(listaTipo[0].titulo, 'Palestra A');

      // Filtrar dia 20
      const resDia = await fetch(`${url}/atividades?dia=2026-10-20`, { headers: headersPart });
      const listaDia = await resDia.json();
      assert.equal(listaDia.length, 1);
      assert.equal(listaDia[0].titulo, 'Minicurso B');
    });

    it('GET /atividades/:id retorna 404 se inexistente e 200 com detalhes se existir', async () => {
      const res404 = await fetch(`${url}/atividades/atv_inexistente`, { headers: headersPart });
      assert.equal(res404.status, 404);

      const postRes = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Palestra C',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 10,
          encontros: [
            {
              inicio: '2026-10-19T14:00:00-03:00',
              fim: '2026-10-19T15:30:00-03:00'
            }
          ]
        })
      });
      const criada = await postRes.json();

      const res200 = await fetch(`${url}/atividades/${criada.id}`, { headers: headersPart });
      assert.equal(res200.status, 200);
      const detalhe = await res200.json();
      assert.equal(detalhe.id, criada.id);
      assert.equal(detalhe.titulo, 'Palestra C');
    });
  });

  describe('Fatia 2 — Criação de Atividades (POST /atividades)', () => {
    it('Critério 1: palestra com 2 encontros -> 422 QUANTIDADE_DE_ENCONTROS', async () => {
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Palestra Dupla',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T10:30:00-03:00' },
            { inicio: '2026-10-20T09:00:00-03:00', fim: '2026-10-20T10:30:00-03:00' }
          ]
        })
      });
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.erro, 'QUANTIDADE_DE_ENCONTROS');
    });

    it('Critério 2: minicurso com 1 encontro -> 422 QUANTIDADE_DE_ENCONTROS', async () => {
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Minicurso Curto',
          tipo: 'minicurso',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.erro, 'QUANTIDADE_DE_ENCONTROS');
    });

    it('Critério 3: minicurso com 2 encontros válidos -> 201 Atividade criada', async () => {
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Minicurso Python',
          tipo: 'minicurso',
          salaId: 'sala-101',
          vagas: 25,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' },
            { inicio: '2026-10-20T09:00:00-03:00', fim: '2026-10-20T11:00:00-03:00' }
          ]
        })
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.ok(body.id.startsWith('atv_'));
      assert.equal(body.titulo, 'Minicurso Python');
      assert.equal(body.encontros.length, 2);
    });

    it('Critério 4: encontro de 45 minutos -> 422 ENCONTRO_INVALIDO', async () => {
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Palestra Relâmpago',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T09:45:00-03:00' }
          ]
        })
      });
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.erro, 'ENCONTRO_INVALIDO');
    });

    it('Critério 5: encontro com data fora da Semana Acadêmica -> 422 ENCONTRO_INVALIDO', async () => {
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Palestra Domingo',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-18T09:00:00-03:00', fim: '2026-10-18T10:30:00-03:00' }
          ]
        })
      });
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.erro, 'ENCONTRO_INVALIDO');
    });

    it('Critério 6: sobreposição de encontros na mesma atividade -> 422 ENCONTRO_INVALIDO', async () => {
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Minicurso Sobreposto',
          tipo: 'minicurso',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' },
            { inicio: '2026-10-19T10:00:00-03:00', fim: '2026-10-19T12:00:00-03:00' }
          ]
        })
      });
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.erro, 'ENCONTRO_INVALIDO');
    });

    it('Critério 7: vagas (25) acima da capacidade da sala lab-3 (20) -> 422 VAGAS_ACIMA_DA_CAPACIDADE', async () => {
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Oficina Lab',
          tipo: 'palestra',
          salaId: 'lab-3',
          vagas: 25,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.erro, 'VAGAS_ACIMA_DA_CAPACIDADE');
    });

    it('Critério 9: conflito de sala com intervalo de limpeza de 10 min (< 15 min) -> 409 CONFLITO_DE_SALA', async () => {
      // Primeira atividade: 14:00 às 16:00
      await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Atividade 1',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T14:00:00-03:00', fim: '2026-10-19T16:00:00-03:00' }
          ]
        })
      });

      // Segunda atividade: 16:10 às 18:00 (10 min intervalo < 15 min)
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Atividade 2',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T16:10:00-03:00', fim: '2026-10-19T18:00:00-03:00' }
          ]
        })
      });
      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.erro, 'CONFLITO_DE_SALA');
    });

    it('Critério 10: conflito apenas com atividade cancelada -> 201 cadastrado com sucesso', async () => {
      // Criar atividade
      const post1 = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Atividade Cancelanda',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T14:00:00-03:00', fim: '2026-10-19T16:00:00-03:00' }
          ]
        })
      });
      const atv1 = await post1.json();

      // Cancelar atividade
      await fetch(`${url}/atividades/${atv1.id}/cancelamento`, {
        method: 'POST',
        headers: headersOrg
      });

      // Tentar criar nova no mesmo horário exato
      const res = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Nova Atividade no Mesmo Horário',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T14:00:00-03:00', fim: '2026-10-19T16:00:00-03:00' }
          ]
        })
      });
      assert.equal(res.status, 201);
    });
  });

  describe('Fatia 3 — Alteração de Atividades (PATCH /atividades/:id)', () => {
    it('Critério 8: PATCH vagas (30) acima da capacidade da sala lab-3 (20) -> 422 VAGAS_ACIMA_DA_CAPACIDADE', async () => {
      const post = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Oficina 1',
          tipo: 'palestra',
          salaId: 'lab-3',
          vagas: 15,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      const atv = await post.json();

      const patchRes = await fetch(`${url}/atividades/${atv.id}`, {
        method: 'PATCH',
        headers: headersOrg,
        body: JSON.stringify({ vagas: 30 })
      });
      assert.equal(patchRes.status, 422);
      const body = await patchRes.json();
      assert.equal(body.erro, 'VAGAS_ACIMA_DA_CAPACIDADE');
    });

    it('Critério 11: PATCH com campo não editável (salaId) -> 422 CAMPO_NAO_EDITAVEL', async () => {
      const post = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Palestra Editavel',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      const atv = await post.json();

      const patchRes = await fetch(`${url}/atividades/${atv.id}`, {
        method: 'PATCH',
        headers: headersOrg,
        body: JSON.stringify({ salaId: 'sala-102' })
      });
      assert.equal(patchRes.status, 422);
      const body = await patchRes.json();
      assert.equal(body.erro, 'CAMPO_NAO_EDITAVEL');
    });

    it('Critério 12: PATCH com titulo e vagas válidos -> 200 atualizado', async () => {
      const post = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Titulo Antigo',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      const atv = await post.json();

      const patchRes = await fetch(`${url}/atividades/${atv.id}`, {
        method: 'PATCH',
        headers: headersOrg,
        body: JSON.stringify({ titulo: 'Novo Título', vagas: 15 })
      });
      assert.equal(patchRes.status, 200);
      const body = await patchRes.json();
      assert.equal(body.titulo, 'Novo Título');
      assert.equal(body.vagas, 15);
    });

    it('Critério 13: PATCH com vagas (5) menor que ocupadas (8) -> 409 VAGAS_ABAIXO_DOS_INSCRITOS', async () => {
      // Criar atividade
      const post = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Atividade Com Inscritos',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      const atv = await post.json();

      // Simular ocupadas = 8 alterando internamente ou via mock se necessário
      // (a função obterAtividadeBrutaPorId permite alterar no atv.ocupadas para o teste)
      const { obterAtividadeBrutaPorId } = await import('../api/src/services/atividadeService.js');
      const atvBruta = obterAtividadeBrutaPorId(atv.id);
      atvBruta.ocupadas = 8;

      const patchRes = await fetch(`${url}/atividades/${atv.id}`, {
        method: 'PATCH',
        headers: headersOrg,
        body: JSON.stringify({ vagas: 5 })
      });
      assert.equal(patchRes.status, 409);
      const body = await patchRes.json();
      assert.equal(body.erro, 'VAGAS_ABAIXO_DOS_INSCRITOS');
    });

    it('Critério 15: PATCH em atividade cancelada -> 422 ATIVIDADE_CANCELADA', async () => {
      const post = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Atividade Para Cancelar',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      const atv = await post.json();

      // Cancelar
      await fetch(`${url}/atividades/${atv.id}/cancelamento`, {
        method: 'POST',
        headers: headersOrg
      });

      // Tentar PATCH
      const patchRes = await fetch(`${url}/atividades/${atv.id}`, {
        method: 'PATCH',
        headers: headersOrg,
        body: JSON.stringify({ titulo: 'Tentativa' })
      });
      assert.equal(patchRes.status, 422);
      const body = await patchRes.json();
      assert.equal(body.erro, 'ATIVIDADE_CANCELADA');
    });
  });

  describe('Fatia 4 — Cancelamento de Atividades (POST /atividades/:id/cancelamento)', () => {
    it('Critério 14: cancelamento após ou no instante de início -> 422 ATIVIDADE_JA_INICIADA', async () => {
      const post = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Atividade Que Já Iniciou',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      const atv = await post.json();

      // Avançar relógio para o horário de início (09:00)
      await fetch(`${url}/_teste/relogio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agora: '2026-10-19T09:00:00-03:00' })
      });

      const res = await fetch(`${url}/atividades/${atv.id}/cancelamento`, {
        method: 'POST',
        headers: headersOrg
      });
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.erro, 'ATIVIDADE_JA_INICIADA');
    });

    it('Critério 16: cancelamento em atividade já cancelada -> 422 ATIVIDADE_CANCELADA', async () => {
      const post = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Atividade Duplo Cancelamento',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      const atv = await post.json();

      // Primeiro cancelamento -> 200
      const cancel1 = await fetch(`${url}/atividades/${atv.id}/cancelamento`, {
        method: 'POST',
        headers: headersOrg
      });
      assert.equal(cancel1.status, 200);

      // Segundo cancelamento -> 422
      const cancel2 = await fetch(`${url}/atividades/${atv.id}/cancelamento`, {
        method: 'POST',
        headers: headersOrg
      });
      assert.equal(cancel2.status, 422);
      const body = await cancel2.json();
      assert.equal(body.erro, 'ATIVIDADE_CANCELADA');
    });
  });

  describe('Fatia 5 — Precedência e Ajustes Finos (R9)', () => {
    it('Critério 17: PATCH em atividade cancelada enviando salaId e vagas excessivas -> 422 ATIVIDADE_CANCELADA', async () => {
      const post = await fetch(`${url}/atividades`, {
        method: 'POST',
        headers: headersOrg,
        body: JSON.stringify({
          titulo: 'Atividade Precedencia',
          tipo: 'palestra',
          salaId: 'sala-101',
          vagas: 20,
          encontros: [
            { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
          ]
        })
      });
      const atv = await post.json();

      // Cancelar
      await fetch(`${url}/atividades/${atv.id}/cancelamento`, {
        method: 'POST',
        headers: headersOrg
      });

      // PATCH com salaId (proibido) e vagas: 999 (acima da capacidade) em atividade cancelada
      const patchRes = await fetch(`${url}/atividades/${atv.id}`, {
        method: 'PATCH',
        headers: headersOrg,
        body: JSON.stringify({ salaId: 'sala-102', vagas: 999 })
      });
      assert.equal(patchRes.status, 422);
      const body = await patchRes.json();
      assert.equal(body.erro, 'ATIVIDADE_CANCELADA');
    });
  });
});
