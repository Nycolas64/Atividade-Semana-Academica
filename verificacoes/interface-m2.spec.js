import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { carregarInterface, aguardar } from './interface-harness.js';

const atv = {
  id: 'atv_1',
  titulo: 'Oficina de Testes',
  tipo: 'minicurso',
  salaId: 'sala-101',
  situacao: 'aberta',
  vagas: 10,
  vagasRestantes: 9,
  ocupadas: 1,
  emEspera: 0,
  cargaHorariaMinutos: 120,
  encontros: [
    { id: 'enc_1', inicio: '2026-10-19T14:00:00-03:00', fim: '2026-10-19T16:00:00-03:00' }
  ]
};

describe('Interface M2 — telas com API falsa', () => {
  it('detalhe da atividade mostra o botão Inscrever para participante sem inscrição', async () => {
    const ui = await carregarInterface({ atividades: [atv], inscricoes: [] });

    const card = ui.document.getElementById('atividades-grid').children[0];
    card.click();
    await aguardar();

    const modal = ui.document.getElementById('modal-body');
    assert.ok(
      modal.querySelector('.btn-inscrever'),
      'o detalhe da atividade deve expor o botão Inscrever'
    );
  });

  it('Inscrever no detalhe chama POST /atividades/:id/inscricoes', async () => {
    const ui = await carregarInterface({ atividades: [atv], inscricoes: [] });
    ui.fetch.programar('POST', '/atividades/atv_1/inscricoes', 201, {
      id: 'ins_aa11bb22',
      atividadeId: 'atv_1',
      participanteId: 'p-carla',
      status: 'confirmada',
      posicaoNaEspera: null,
      convocadaAte: null,
      criadaEm: '2026-10-19T09:00:00-03:00'
    });

    const card = ui.document.getElementById('atividades-grid').children[0];
    card.click();
    await aguardar();

    const botao = ui.document.getElementById('modal-body').querySelector('.btn-inscrever');
    botao.click();
    await aguardar();

    const chamada = ui.fetch.chamadas.find(
      (c) => c.metodo === 'POST' && c.caminho === '/atividades/atv_1/inscricoes'
    );
    assert.ok(chamada, 'clicar em Inscrever deve fazer POST /atividades/atv_1/inscricoes');
  });

  it('detalhe da atividade mostra o botão Cancelar para inscrição ativa', async () => {
    const inscricoes = [{
      id: 'ins_1',
      atividadeId: 'atv_1',
      participanteId: 'p-carla',
      status: 'confirmada',
      posicaoNaEspera: null,
      convocadaAte: null,
      criadaEm: '2026-10-19T08:00:00-03:00'
    }];
    const ui = await carregarInterface({ atividades: [atv], inscricoes });

    const card = ui.document.getElementById('atividades-grid').children[0];
    card.click();
    await aguardar();

    const modal = ui.document.getElementById('modal-body');
    assert.ok(
      modal.querySelector('.btn-cancelar'),
      'com inscrição ativa o detalhe deve expor o botão Cancelar'
    );
    assert.equal(
      modal.querySelector('.btn-inscrever'),
      null,
      'com inscrição ativa o detalhe não deve oferecer Inscrever'
    );
  });

  it('Cancelar no detalhe chama POST /inscricoes/:id/cancelamento', async () => {
    const inscricoes = [{
      id: 'ins_1',
      atividadeId: 'atv_1',
      participanteId: 'p-carla',
      status: 'confirmada',
      posicaoNaEspera: null,
      convocadaAte: null,
      criadaEm: '2026-10-19T08:00:00-03:00'
    }];
    const ui = await carregarInterface({ atividades: [atv], inscricoes });
    ui.fetch.programar('POST', '/inscricoes/ins_1/cancelamento', 200, {
      ...inscricoes[0],
      status: 'cancelada'
    });

    const card = ui.document.getElementById('atividades-grid').children[0];
    card.click();
    await aguardar();

    const botao = ui.document.getElementById('modal-body').querySelector('.btn-cancelar');
    botao.click();
    await aguardar();

    const chamada = ui.fetch.chamadas.find(
      (c) => c.metodo === 'POST' && c.caminho === '/inscricoes/ins_1/cancelamento'
    );
    assert.ok(chamada, 'clicar em Cancelar deve fazer POST /inscricoes/ins_1/cancelamento');
  });

  it('minhas inscrições mostra contagem regressiva até convocadaAte', async () => {
    const inscricoes = [{
      id: 'ins_9',
      atividadeId: 'atv_1',
      participanteId: 'p-carla',
      status: 'convocada',
      posicaoNaEspera: null,
      convocadaAte: '2026-10-19T11:00:00-03:00',
      criadaEm: '2026-10-19T08:00:00-03:00'
    }];
    const ui = await carregarInterface({ atividades: [atv], inscricoes });

    const lista = ui.document.getElementById('inscricoes-lista');
    const contagem = lista.querySelector('[data-contagem]');
    assert.ok(contagem, 'a inscrição convocada deve ter um elemento de contagem regressiva');
    assert.equal(
      contagem.textContent,
      'Prazo: 02:00:00',
      'com relógio às 09:00 e convocadaAte às 11:00 a contagem deve indicar 2 horas'
    );
    assert.equal(
      lista.querySelector('.convocada-ate'),
      null,
      'o texto estático "Convocada até" deve ter sido substituído'
    );
  });

  it('contagem regressiva atualiza a cada segundo', async () => {
    const inscricoes = [{
      id: 'ins_9',
      atividadeId: 'atv_1',
      participanteId: 'p-carla',
      status: 'convocada',
      posicaoNaEspera: null,
      convocadaAte: '2026-10-19T11:00:00-03:00',
      criadaEm: '2026-10-19T08:00:00-03:00'
    }];
    const ui = await carregarInterface({ atividades: [atv], inscricoes });

    const contagem = ui.document.getElementById('inscricoes-lista').querySelector('[data-contagem]');
    assert.equal(contagem.textContent, 'Prazo: 02:00:00');

    ui.definirAgora('2026-10-19T09:00:01-03:00');
    ui.rodarIntervalos();

    assert.equal(
      contagem.textContent,
      'Prazo: 01:59:59',
      'ao avançar 1 segundo a contagem deve mostrar 1:59:59'
    );
  });

  it('contagem para quando o prazo vence', async () => {
    const inscricoes = [{
      id: 'ins_9',
      atividadeId: 'atv_1',
      participanteId: 'p-carla',
      status: 'convocada',
      posicaoNaEspera: null,
      convocadaAte: '2026-10-19T11:00:00-03:00',
      criadaEm: '2026-10-19T08:00:00-03:00'
    }];
    const ui = await carregarInterface({ atividades: [atv], inscricoes });

    const contagem = ui.document.getElementById('inscricoes-lista').querySelector('[data-contagem]');
    assert.ok(ui.intervalos.length > 0, 'a contagem deve estar agendada enquanto o prazo corre');

    ui.definirAgora('2026-10-19T11:00:01-03:00');
    ui.rodarIntervalos();

    assert.equal(contagem.textContent, 'Prazo vencido', 'prazo ultrapassado deve indicar vencido');
    assert.equal(ui.intervalos.length, 0, 'vencido o prazo, o relógio da contagem deve parar');
  });
});
