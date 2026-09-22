import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from '../api/src/app.js';

process.env.MODO_TESTE = '1';

describe('API M2 — Inscrições e Lista de Espera', () => {
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

  async function semHeader(caminho, metodo = 'GET') {
    const res = await fetch(`${url}${caminho}`, { method: metodo });
    assert.equal(res.status, 401);
    const corpo = await res.json();
    assert.equal(corpo.erro, 'USUARIO_DESCONHECIDO');
  }

  async function criarAtividade(payload) {
    const res = await fetch(`${url}/atividades`, {
      method: 'POST',
      headers: headersOrg,
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 201);
    return res.json();
  }

  async function inscrever(atividadeId, headers) {
    return fetch(`${url}/atividades/${atividadeId}/inscricoes`, {
      method: 'POST',
      headers
    });
  }

  describe('Fatia 1 — Inscrever e consultar', () => {
    it('Critério 30 (R12): rotas de inscrição sem X-Usuario → 401 USUARIO_DESCONHECIDO', async () => {
      await semHeader('/atividades/atv_qualquer/inscricoes', 'POST');
      await semHeader('/inscricoes');
      await semHeader('/inscricoes/ins_qualquer');
      await semHeader('/inscricoes/ins_qualquer/cancelamento', 'POST');
      await semHeader('/inscricoes/ins_qualquer/confirmacao', 'POST');
    });

    it('Critério 33 (R13): POST /atividades/:id/inscricoes com atividade inexistente → 404 NAO_ENCONTRADO', async () => {
      const res = await fetch(`${url}/atividades/atv_inexistente/inscricoes`, {
        method: 'POST',
        headers: headersPart
      });
      assert.equal(res.status, 404);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'NAO_ENCONTRADO');
    });

    it('Critério 28 (R12): organização chamando POST /atividades/:id/inscricoes → 403 SOMENTE_PARTICIPANTE', async () => {
      const res = await fetch(`${url}/atividades/atv_qualquer/inscricoes`, {
        method: 'POST',
        headers: headersOrg
      });
      assert.equal(res.status, 403);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'SOMENTE_PARTICIPANTE');
    });

    it('Critério 14 (R6): com vaga nasce confirmada; sem vaga entra em_espera com posição contígua', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Lotada',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-19T15:00:00-03:00', fim: '2026-10-19T17:00:00-03:00' }
        ]
      });

      const res1 = await inscrever(atv.id, headersPart);
      assert.equal(res1.status, 201);
      const insc1 = await res1.json();
      assert.match(insc1.id, /^ins_[0-9a-f]{8}$/);
      assert.equal(insc1.atividadeId, atv.id);
      assert.equal(insc1.participanteId, 'p-carla');
      assert.equal(insc1.status, 'confirmada');
      assert.equal(insc1.posicaoNaEspera, null);
      assert.equal(insc1.convocadaAte, null);
      assert.equal(insc1.criadaEm, '2026-10-13T09:00:00-03:00');

      const res2 = await inscrever(atv.id, {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      });
      assert.equal(res2.status, 201);
      const insc2 = await res2.json();
      assert.equal(insc2.status, 'em_espera');
      assert.equal(insc2.posicaoNaEspera, 1);

      const res3 = await inscrever(atv.id, {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-elisa'
      });
      assert.equal(res3.status, 201);
      const insc3 = await res3.json();
      assert.equal(insc3.status, 'em_espera');
      assert.equal(insc3.posicaoNaEspera, 2);
    });

    it('Critério 12 (R5): segundo POST de quem já está confirmada ou em_espera → 409 JA_INSCRITO', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Repetida',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-19T15:00:00-03:00', fim: '2026-10-19T17:00:00-03:00' }
        ]
      });

      const primeira = await inscrever(atv.id, headersPart);
      assert.equal(primeira.status, 201);

      const segunda = await inscrever(atv.id, headersPart);
      assert.equal(segunda.status, 409);
      const corpoConfirmada = await segunda.json();
      assert.equal(corpoConfirmada.erro, 'JA_INSCRITO');

      const headersDiego = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      };
      const diegoPrimeira = await inscrever(atv.id, headersDiego);
      assert.equal(diegoPrimeira.status, 201);

      const diegoSegunda = await inscrever(atv.id, headersDiego);
      assert.equal(diegoSegunda.status, 409);
      const corpoEspera = await diegoSegunda.json();
      assert.equal(corpoEspera.erro, 'JA_INSCRITO');
    });

    it('Critério 1 (R1): relógio no encerramento exato (30 min antes do 1º encontro) → 422 INSCRICOES_ENCERRADAS', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Meio-dia',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T12:00:00-03:00', fim: '2026-10-19T14:00:00-03:00' }
        ]
      });

      await fetch(`${url}/_teste/relogio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agora: '2026-10-19T11:30:00-03:00' })
      });

      const res = await inscrever(atv.id, headersPart);
      assert.equal(res.status, 422);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'INSCRICOES_ENCERRADAS');
    });

    it('Critério 2 (R1): 1 minuto antes do encerramento → 201 confirmada', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Quase Fechando',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T12:00:00-03:00', fim: '2026-10-19T14:00:00-03:00' }
        ]
      });

      await fetch(`${url}/_teste/relogio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agora: '2026-10-19T11:29:00-03:00' })
      });

      const res = await inscrever(atv.id, headersPart);
      assert.equal(res.status, 201);
      const corpo = await res.json();
      assert.equal(corpo.status, 'confirmada');
      assert.equal(corpo.posicaoNaEspera, null);
    });

    it('Critério 11 (R4): confirmada ocupa vaga e em_espera conta fila — GET /atividades reflete', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Uma Vaga',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-19T15:00:00-03:00', fim: '2026-10-19T17:00:00-03:00' }
        ]
      });

      const res1 = await inscrever(atv.id, headersPart);
      assert.equal(res1.status, 201);

      const res2 = await inscrever(atv.id, {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      });
      assert.equal(res2.status, 201);

      const lista = await fetch(`${url}/atividades`, { headers: headersPart });
      const atividades = await lista.json();
      const alvo = atividades.find((a) => a.id === atv.id);
      assert.equal(alvo.ocupadas, 1);
      assert.equal(alvo.vagasRestantes, 0);
      assert.equal(alvo.emEspera, 1);
    });

    it('Critério 31 (R12): GET /inscricoes — participante vê só as suas, organização vê todas, filtro ?atividadeId=', async () => {
      const atvA = await criarAtividade({
        titulo: 'Atividade A',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T08:00:00-03:00', fim: '2026-10-19T10:00:00-03:00' }
        ]
      });
      const atvB = await criarAtividade({
        titulo: 'Atividade B',
        tipo: 'palestra',
        salaId: 'sala-102',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-20T08:00:00-03:00', fim: '2026-10-20T10:00:00-03:00' }
        ]
      });

      assert.equal((await inscrever(atvA.id, headersPart)).status, 201);
      const headersDiego = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      };
      assert.equal((await inscrever(atvA.id, headersDiego)).status, 201);
      assert.equal((await inscrever(atvB.id, headersDiego)).status, 201);

      const resCarla = await fetch(`${url}/inscricoes`, { headers: headersPart });
      assert.equal(resCarla.status, 200);
      const listaCarla = await resCarla.json();
      assert.equal(listaCarla.length, 1);
      assert.equal(listaCarla[0].participanteId, 'p-carla');
      assert.equal(listaCarla[0].atividadeId, atvA.id);

      const resOrg = await fetch(`${url}/inscricoes`, { headers: headersOrg });
      assert.equal(resOrg.status, 200);
      const listaOrg = await resOrg.json();
      assert.equal(listaOrg.length, 3);

      const resFiltro = await fetch(`${url}/inscricoes?atividadeId=${atvA.id}`, {
        headers: headersOrg
      });
      assert.equal(resFiltro.status, 200);
      const listaFiltro = await resFiltro.json();
      assert.equal(listaFiltro.length, 2);
      assert.equal(listaFiltro.every((i) => i.atividadeId === atvA.id), true);
    });

    it('Critério 30 (R12): GET /inscricoes/:id — qualquer autenticado lê por id; inexistente → 404', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Leitura',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T15:00:00-03:00', fim: '2026-10-19T17:00:00-03:00' }
        ]
      });
      const criada = await inscrever(atv.id, headersPart);
      assert.equal(criada.status, 201);
      const insc = await criada.json();

      const resDiego = await fetch(`${url}/inscricoes/${insc.id}`, {
        headers: { 'Content-Type': 'application/json', 'X-Usuario': 'p-diego' }
      });
      assert.equal(resDiego.status, 200);
      const lida = await resDiego.json();
      assert.equal(lida.id, insc.id);
      assert.equal(lida.participanteId, 'p-carla');

      const resOrg = await fetch(`${url}/inscricoes/${insc.id}`, { headers: headersOrg });
      assert.equal(resOrg.status, 200);

      const res404 = await fetch(`${url}/inscricoes/ins_inexistente`, { headers: headersPart });
      assert.equal(res404.status, 404);
      const corpo = await res404.json();
      assert.equal(corpo.erro, 'NAO_ENCONTRADO');
    });
  });

  describe('Fatia 2 — Recheces de inscrição e precedência', () => {
    it('Critério 34 (R13): inscrever em atividade cancelada → 422 ATIVIDADE_CANCELADA, mesmo com encerradas e conflito potenciais', async () => {
      const atvA = await criarAtividade({
        titulo: 'Atividade Ocupada',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T12:00:00-03:00', fim: '2026-10-19T14:00:00-03:00' }
        ]
      });
      const atvB = await criarAtividade({
        titulo: 'Atividade Cancelada',
        tipo: 'palestra',
        salaId: 'sala-102',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T12:00:00-03:00', fim: '2026-10-19T14:00:00-03:00' }
        ]
      });

      assert.equal((await inscrever(atvA.id, headersPart)).status, 201);

      await fetch(`${url}/_teste/relogio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agora: '2026-10-19T11:30:00-03:00' })
      });

      const cancelRes = await fetch(`${url}/atividades/${atvB.id}/cancelamento`, {
        method: 'POST',
        headers: headersOrg
      });
      assert.equal(cancelRes.status, 200);

      const res = await inscrever(atvB.id, headersPart);
      assert.equal(res.status, 422);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'ATIVIDADE_CANCELADA');
    });

    it('Critério 32 (R13): já inscrito e relógio após o encerramento → 422 INSCRICOES_ENCERRADAS (não JA_INSCRITO)', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Precedência',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T12:00:00-03:00', fim: '2026-10-19T14:00:00-03:00' }
        ]
      });

      assert.equal((await inscrever(atv.id, headersPart)).status, 201);

      await fetch(`${url}/_teste/relogio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agora: '2026-10-19T11:35:00-03:00' })
      });

      const res = await inscrever(atv.id, headersPart);
      assert.equal(res.status, 422);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'INSCRICOES_ENCERRADAS');
    });

    it('Critério 7 (R3): confirmada em A (09:00–11:00) e inscrição em B (10:00–12:00) → 409 CONFLITO_DE_HORARIO', async () => {
      const atvA = await criarAtividade({
        titulo: 'Palestra Manhã',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
        ]
      });
      const atvB = await criarAtividade({
        titulo: 'Palestra Sobreposta',
        tipo: 'palestra',
        salaId: 'sala-102',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T10:00:00-03:00', fim: '2026-10-19T12:00:00-03:00' }
        ]
      });

      assert.equal((await inscrever(atvA.id, headersPart)).status, 201);

      const res = await inscrever(atvB.id, headersPart);
      assert.equal(res.status, 409);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'CONFLITO_DE_HORARIO');
    });

    it('Critério 8 (R3): A termina 11:00 e B começa 11:00 → 201 (encostar não é conflito)', async () => {
      const atvA = await criarAtividade({
        titulo: 'Palestra Encaixe A',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
        ]
      });
      const atvB = await criarAtividade({
        titulo: 'Palestra Encaixe B',
        tipo: 'palestra',
        salaId: 'sala-102',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T11:00:00-03:00', fim: '2026-10-19T13:00:00-03:00' }
        ]
      });

      assert.equal((await inscrever(atvA.id, headersPart)).status, 201);

      const res = await inscrever(atvB.id, headersPart);
      assert.equal(res.status, 201);
      const corpo = await res.json();
      assert.equal(corpo.status, 'confirmada');
    });

    it('Critério 9 (R3): inscrição em_espera sobreposta não gera conflito → 201', async () => {
      const atvA = await criarAtividade({
        titulo: 'Palestra Cheia',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' }
        ]
      });
      const atvB = await criarAtividade({
        titulo: 'Palestra Depois',
        tipo: 'palestra',
        salaId: 'sala-102',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-19T10:00:00-03:00', fim: '2026-10-19T12:00:00-03:00' }
        ]
      });

      assert.equal((await inscrever(atvA.id, headersPart)).status, 201);

      const headersDiego = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      };
      const espera = await inscrever(atvA.id, headersDiego);
      assert.equal(espera.status, 201);
      const inscEspera = await espera.json();
      assert.equal(inscEspera.status, 'em_espera');

      const res = await inscrever(atvB.id, headersDiego);
      assert.equal(res.status, 201);
      const corpo = await res.json();
      assert.equal(corpo.status, 'confirmada');
    });

    it('Critério 3 (R2): 3 minicursos confirmadas e inscrição em um 4º com vaga → 422 LIMITE_DE_MINICURSOS', async () => {
      const minicurso = async (titulo, salaId, encontros) => {
        return criarAtividade({
          titulo,
          tipo: 'minicurso',
          salaId,
          vagas: 10,
          encontros
        });
      };

      const m1 = await minicurso('Minicurso 1', 'sala-101', [
        { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' },
        { inicio: '2026-10-20T09:00:00-03:00', fim: '2026-10-20T11:00:00-03:00' }
      ]);
      const m2 = await minicurso('Minicurso 2', 'sala-102', [
        { inicio: '2026-10-19T13:00:00-03:00', fim: '2026-10-19T15:00:00-03:00' },
        { inicio: '2026-10-20T13:00:00-03:00', fim: '2026-10-20T15:00:00-03:00' }
      ]);
      const m3 = await minicurso('Minicurso 3', 'sala-101', [
        { inicio: '2026-10-19T16:00:00-03:00', fim: '2026-10-19T18:00:00-03:00' },
        { inicio: '2026-10-20T16:00:00-03:00', fim: '2026-10-20T18:00:00-03:00' }
      ]);
      const m4 = await minicurso('Minicurso 4', 'sala-102', [
        { inicio: '2026-10-21T09:00:00-03:00', fim: '2026-10-21T11:00:00-03:00' },
        { inicio: '2026-10-22T09:00:00-03:00', fim: '2026-10-22T11:00:00-03:00' }
      ]);

      assert.equal((await inscrever(m1.id, headersPart)).status, 201);
      assert.equal((await inscrever(m2.id, headersPart)).status, 201);
      assert.equal((await inscrever(m3.id, headersPart)).status, 201);

      const res = await inscrever(m4.id, headersPart);
      assert.equal(res.status, 422);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'LIMITE_DE_MINICURSOS');
    });

    it('Critério 4 (R2): 3 minicursos confirmadas e inscrição em minicurso sem vaga → 201 em_espera (não conta no limite)', async () => {
      const minicurso = async (titulo, salaId, encontros, vagas = 10) => {
        return criarAtividade({
          titulo,
          tipo: 'minicurso',
          salaId,
          vagas,
          encontros
        });
      };

      const m1 = await minicurso('Mini A', 'sala-101', [
        { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' },
        { inicio: '2026-10-20T09:00:00-03:00', fim: '2026-10-20T11:00:00-03:00' }
      ]);
      const m2 = await minicurso('Mini B', 'sala-102', [
        { inicio: '2026-10-19T13:00:00-03:00', fim: '2026-10-19T15:00:00-03:00' },
        { inicio: '2026-10-20T13:00:00-03:00', fim: '2026-10-20T15:00:00-03:00' }
      ]);
      const m3 = await minicurso('Mini C', 'sala-101', [
        { inicio: '2026-10-19T16:00:00-03:00', fim: '2026-10-19T18:00:00-03:00' },
        { inicio: '2026-10-20T16:00:00-03:00', fim: '2026-10-20T18:00:00-03:00' }
      ]);
      const mLotado = await minicurso('Mini Lotado', 'sala-102', [
        { inicio: '2026-10-21T09:00:00-03:00', fim: '2026-10-21T11:00:00-03:00' },
        { inicio: '2026-10-22T09:00:00-03:00', fim: '2026-10-22T11:00:00-03:00' }
      ], 1);

      assert.equal((await inscrever(m1.id, headersPart)).status, 201);
      assert.equal((await inscrever(m2.id, headersPart)).status, 201);
      assert.equal((await inscrever(m3.id, headersPart)).status, 201);

      const headersDiego = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      };
      assert.equal((await inscrever(mLotado.id, headersDiego)).status, 201);

      const res = await inscrever(mLotado.id, headersPart);
      assert.equal(res.status, 201);
      const corpo = await res.json();
      assert.equal(corpo.status, 'em_espera');
    });

    it('Critério 5 (R2): 3 minicursos confirmadas e inscrição em uma palestra → 201 (palestras não contam)', async () => {
      const minicurso = async (titulo, salaId, encontros) => {
        return criarAtividade({
          titulo,
          tipo: 'minicurso',
          salaId,
          vagas: 10,
          encontros
        });
      };

      const m1 = await minicurso('Mini X', 'sala-101', [
        { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' },
        { inicio: '2026-10-20T09:00:00-03:00', fim: '2026-10-20T11:00:00-03:00' }
      ]);
      const m2 = await minicurso('Mini Y', 'sala-102', [
        { inicio: '2026-10-19T13:00:00-03:00', fim: '2026-10-19T15:00:00-03:00' },
        { inicio: '2026-10-20T13:00:00-03:00', fim: '2026-10-20T15:00:00-03:00' }
      ]);
      const m3 = await minicurso('Mini Z', 'sala-101', [
        { inicio: '2026-10-19T16:00:00-03:00', fim: '2026-10-19T18:00:00-03:00' },
        { inicio: '2026-10-20T16:00:00-03:00', fim: '2026-10-20T18:00:00-03:00' }
      ]);

      assert.equal((await inscrever(m1.id, headersPart)).status, 201);
      assert.equal((await inscrever(m2.id, headersPart)).status, 201);
      assert.equal((await inscrever(m3.id, headersPart)).status, 201);

      const palestra = await criarAtividade({
        titulo: 'Palestra Complementar',
        tipo: 'palestra',
        salaId: 'auditorio',
        vagas: 100,
        encontros: [
          { inicio: '2026-10-21T14:00:00-03:00', fim: '2026-10-21T16:00:00-03:00' }
        ]
      });

      const res = await inscrever(palestra.id, headersPart);
      assert.equal(res.status, 201);
      const corpo = await res.json();
      assert.equal(corpo.status, 'confirmada');
    });

    it('Critério 35 (R13): 3 minicursos E conflito de horário na nova atividade → 409 CONFLITO_DE_HORARIO (não LIMITE)', async () => {
      const minicurso = async (titulo, salaId, encontros) => {
        return criarAtividade({
          titulo,
          tipo: 'minicurso',
          salaId,
          vagas: 10,
          encontros
        });
      };

      const m1 = await minicurso('Mini Base 1', 'sala-101', [
        { inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' },
        { inicio: '2026-10-20T09:00:00-03:00', fim: '2026-10-20T11:00:00-03:00' }
      ]);
      const m2 = await minicurso('Mini Base 2', 'sala-102', [
        { inicio: '2026-10-19T13:00:00-03:00', fim: '2026-10-19T15:00:00-03:00' },
        { inicio: '2026-10-20T13:00:00-03:00', fim: '2026-10-20T15:00:00-03:00' }
      ]);
      const m3 = await minicurso('Mini Base 3', 'sala-101', [
        { inicio: '2026-10-19T16:00:00-03:00', fim: '2026-10-19T18:00:00-03:00' },
        { inicio: '2026-10-20T16:00:00-03:00', fim: '2026-10-20T18:00:00-03:00' }
      ]);

      assert.equal((await inscrever(m1.id, headersPart)).status, 201);
      assert.equal((await inscrever(m2.id, headersPart)).status, 201);
      assert.equal((await inscrever(m3.id, headersPart)).status, 201);

      const mConflitante = await minicurso('Mini Conflitante', 'sala-102', [
        { inicio: '2026-10-19T10:00:00-03:00', fim: '2026-10-19T12:00:00-03:00' },
        { inicio: '2026-10-21T09:00:00-03:00', fim: '2026-10-21T11:00:00-03:00' }
      ]);

      const res = await inscrever(mConflitante.id, headersPart);
      assert.equal(res.status, 409);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'CONFLITO_DE_HORARIO');
    });

    it('Critério 36 (R13): participante sem impedimento em atividade aberta → 201; INSCRICAO_BLOQUEADA nunca retorna', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Livre',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-21T15:00:00-03:00', fim: '2026-10-21T17:00:00-03:00' }
        ]
      });

      const res = await inscrever(atv.id, headersPart);
      assert.equal(res.status, 201);
      const corpo = await res.json();
      assert.equal(corpo.status, 'confirmada');
      assert.equal(JSON.stringify(corpo).includes('INSCRICAO_BLOQUEADA'), false);
    });
  });

  describe('Fatia 3 — Cancelamento', () => {
    it('Critério 23 (R10): cancelar inscrição confirmada ou em_espera antes do início → 200 status cancelada', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Cancelável',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-21T15:00:00-03:00', fim: '2026-10-21T17:00:00-03:00' }
        ]
      });

      const criada = await inscrever(atv.id, headersPart);
      assert.equal(criada.status, 201);
      const inscConfirmada = await criada.json();

      const headersDiego = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      };
      const espera = await inscrever(atv.id, headersDiego);
      assert.equal(espera.status, 201);
      const inscEspera = await espera.json();
      assert.equal(inscEspera.status, 'em_espera');

      const resConfirmada = await fetch(
        `${url}/inscricoes/${inscConfirmada.id}/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(resConfirmada.status, 200);
      const corpoConfirmada = await resConfirmada.json();
      assert.equal(corpoConfirmada.status, 'cancelada');
      assert.equal(corpoConfirmada.id, inscConfirmada.id);
      assert.equal(corpoConfirmada.posicaoNaEspera, null);

      const resEspera = await fetch(
        `${url}/inscricoes/${inscEspera.id}/cancelamento`,
        { method: 'POST', headers: headersDiego }
      );
      assert.equal(resEspera.status, 200);
      const corpoEspera = await resEspera.json();
      assert.equal(corpoEspera.status, 'cancelada');
      assert.equal(corpoEspera.posicaoNaEspera, null);
    });

    it('Critério 24 (R10): cancelar inscrição já cancelada → 422 INSCRICAO_INATIVA', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Duplo Cancel',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-21T15:00:00-03:00', fim: '2026-10-21T17:00:00-03:00' }
        ]
      });

      const criada = await inscrever(atv.id, headersPart);
      assert.equal(criada.status, 201);
      const insc = await criada.json();

      const primeira = await fetch(
        `${url}/inscricoes/${insc.id}/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(primeira.status, 200);

      const segunda = await fetch(
        `${url}/inscricoes/${insc.id}/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(segunda.status, 422);
      const corpo = await segunda.json();
      assert.equal(corpo.erro, 'INSCRICAO_INATIVA');
    });

    it('Critério 25 (R10): relógio no início da atividade e inscrição ainda ativa → 422 ATIVIDADE_JA_INICIADA', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Já Começou',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-21T15:00:00-03:00', fim: '2026-10-21T17:00:00-03:00' }
        ]
      });

      const criada = await inscrever(atv.id, headersPart);
      assert.equal(criada.status, 201);
      const insc = await criada.json();

      await fetch(`${url}/_teste/relogio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agora: '2026-10-21T15:00:00-03:00' })
      });

      const res = await fetch(
        `${url}/inscricoes/${insc.id}/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(res.status, 422);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'ATIVIDADE_JA_INICIADA');
    });

    it('Critério 26 (R10): atividade já iniciada E inscrição já cancelada → 422 ATIVIDADE_JA_INICIADA (precedência)', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Iniciada e Cancelada',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-21T15:00:00-03:00', fim: '2026-10-21T17:00:00-03:00' }
        ]
      });

      const criada = await inscrever(atv.id, headersPart);
      assert.equal(criada.status, 201);
      const insc = await criada.json();

      const cancelada = await fetch(
        `${url}/inscricoes/${insc.id}/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(cancelada.status, 200);

      await fetch(`${url}/_teste/relogio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agora: '2026-10-21T16:00:00-03:00' })
      });

      const res = await fetch(
        `${url}/inscricoes/${insc.id}/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(res.status, 422);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'ATIVIDADE_JA_INICIADA');
    });

    it('Critério 27 (R11): organização cancela atividade → inscrições ativas viram cancelada; cancelar uma delas → 422 INSCRICAO_INATIVA', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Será Cancelada',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-22T15:00:00-03:00', fim: '2026-10-22T17:00:00-03:00' }
        ]
      });

      const criada = await inscrever(atv.id, headersPart);
      assert.equal(criada.status, 201);
      const inscConfirmada = await criada.json();

      const headersDiego = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      };
      const espera = await inscrever(atv.id, headersDiego);
      assert.equal(espera.status, 201);
      const inscEspera = await espera.json();
      assert.equal(inscEspera.status, 'em_espera');

      const cancelAtv = await fetch(`${url}/atividades/${atv.id}/cancelamento`, {
        method: 'POST',
        headers: headersOrg
      });
      assert.equal(cancelAtv.status, 200);

      const lista = await fetch(`${url}/inscricoes`, { headers: headersOrg });
      const inscricoes = await lista.json();
      const daAtividade = inscricoes.filter((i) => i.atividadeId === atv.id);
      assert.equal(daAtividade.length, 2);
      assert.equal(
        daAtividade.every((i) => i.status === 'cancelada'),
        true
      );

      const res = await fetch(
        `${url}/inscricoes/${inscConfirmada.id}/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(res.status, 422);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'INSCRICAO_INATIVA');
    });

    it('Critério 15 (R6): cancelar a inscrição de posição 1 → a que era posição 2 passa a posicaoNaEspera 1', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Fila',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-22T09:00:00-03:00', fim: '2026-10-22T11:00:00-03:00' }
        ]
      });

      const headersDiego = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      };
      const headersElisa = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-elisa'
      };

      const conf = await inscrever(atv.id, headersPart);
      assert.equal(conf.status, 201);

      const pos1 = await inscrever(atv.id, headersDiego);
      assert.equal(pos1.status, 201);
      const inscPos1 = await pos1.json();
      assert.equal(inscPos1.posicaoNaEspera, 1);

      const pos2 = await inscrever(atv.id, headersElisa);
      assert.equal(pos2.status, 201);
      const inscPos2 = await pos2.json();
      assert.equal(inscPos2.posicaoNaEspera, 2);

      const cancel = await fetch(
        `${url}/inscricoes/${inscPos1.id}/cancelamento`,
        { method: 'POST', headers: headersDiego }
      );
      assert.equal(cancel.status, 200);

      const lida = await fetch(`${url}/inscricoes/${inscPos2.id}`, {
        headers: headersElisa
      });
      assert.equal(lida.status, 200);
      const corpo = await lida.json();
      assert.equal(corpo.status, 'em_espera');
      assert.equal(corpo.posicaoNaEspera, 1);
    });

    it('Critério 28 (R12): organização chama POST /inscricoes/:id/cancelamento → 403 SOMENTE_PARTICIPANTE', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Cancel Org',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-22T09:00:00-03:00', fim: '2026-10-22T11:00:00-03:00' }
        ]
      });

      const criada = await inscrever(atv.id, headersPart);
      assert.equal(criada.status, 201);
      const insc = await criada.json();

      const res = await fetch(
        `${url}/inscricoes/${insc.id}/cancelamento`,
        { method: 'POST', headers: headersOrg }
      );
      assert.equal(res.status, 403);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'SOMENTE_PARTICIPANTE');
    });

    it('Critério 29 (R12): p-diego tenta cancelar inscrição de p-carla → 404 NAO_ENCONTRADO', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Alheia',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 30,
        encontros: [
          { inicio: '2026-10-22T09:00:00-03:00', fim: '2026-10-22T11:00:00-03:00' }
        ]
      });

      const criada = await inscrever(atv.id, headersPart);
      assert.equal(criada.status, 201);
      const insc = await criada.json();

      const res = await fetch(
        `${url}/inscricoes/${insc.id}/cancelamento`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Usuario': 'p-diego' }
        }
      );
      assert.equal(res.status, 404);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'NAO_ENCONTRADO');
    });

    it('Critério 30 (R12): POST /inscricoes/ins_inexistente/cancelamento → 404 NAO_ENCONTRADO', async () => {
      const res = await fetch(
        `${url}/inscricoes/ins_inexistente/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(res.status, 404);
      const corpo = await res.json();
      assert.equal(corpo.erro, 'NAO_ENCONTRADO');
    });

    it('Critério 13 (R5, R6): cancela e inscreve de novo → novo id ins_…, no fim da fila', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Reinício',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-23T09:00:00-03:00', fim: '2026-10-23T11:00:00-03:00' }
        ]
      });

      const headersDiego = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      };
      const headersElisa = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-elisa'
      };

      assert.equal((await inscrever(atv.id, headersDiego)).status, 201);
      assert.equal((await inscrever(atv.id, headersElisa)).status, 201);

      const primeira = await inscrever(atv.id, headersPart);
      assert.equal(primeira.status, 201);
      const inscAntiga = await primeira.json();
      assert.equal(inscAntiga.status, 'em_espera');
      assert.equal(inscAntiga.posicaoNaEspera, 2);

      const cancel = await fetch(
        `${url}/inscricoes/${inscAntiga.id}/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(cancel.status, 200);

      const nova = await inscrever(atv.id, headersPart);
      assert.equal(nova.status, 201);
      const inscNova = await nova.json();
      assert.notEqual(inscNova.id, inscAntiga.id);
      assert.match(inscNova.id, /^ins_[0-9a-f]{8}$/);
      assert.equal(inscNova.status, 'em_espera');
      assert.equal(inscNova.posicaoNaEspera, 2);

      const lidaAntiga = await fetch(`${url}/inscricoes/${inscAntiga.id}`, {
        headers: headersPart
      });
      const antiga = await lidaAntiga.json();
      assert.equal(antiga.status, 'cancelada');
    });

    it('Critério 11 parcial (R4, R10): cancelar confirmada libera a vaga — ocupadas/vagasRestantes/emEspera refletem', async () => {
      const atv = await criarAtividade({
        titulo: 'Palestra Libera Vaga',
        tipo: 'palestra',
        salaId: 'sala-101',
        vagas: 1,
        encontros: [
          { inicio: '2026-10-23T14:00:00-03:00', fim: '2026-10-23T16:00:00-03:00' }
        ]
      });

      const criada = await inscrever(atv.id, headersPart);
      assert.equal(criada.status, 201);
      const insc = await criada.json();

      const headersDiego = {
        'Content-Type': 'application/json',
        'X-Usuario': 'p-diego'
      };
      const espera = await inscrever(atv.id, headersDiego);
      assert.equal(espera.status, 201);

      const cancel = await fetch(
        `${url}/inscricoes/${insc.id}/cancelamento`,
        { method: 'POST', headers: headersPart }
      );
      assert.equal(cancel.status, 200);

      const lista = await fetch(`${url}/atividades`, { headers: headersPart });
      const atividades = await lista.json();
      const alvo = atividades.find((a) => a.id === atv.id);
      assert.equal(alvo.ocupadas, 0);
      assert.equal(alvo.vagasRestantes, 1);
      assert.equal(alvo.emEspera, 1);
    });
  });
});
