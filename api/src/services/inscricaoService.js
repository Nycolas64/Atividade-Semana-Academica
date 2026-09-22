import crypto from 'node:crypto';
import { obterAtividadeBrutaPorId } from './atividadeService.js';

let inscricoesStore = [];

const STATUS_ATIVOS = ['confirmada', 'em_espera', 'convocada'];

function gerarIdInscricao() {
  return `ins_${crypto.randomBytes(4).toString('hex')}`;
}

function contarOcupadas(atividadeId) {
  return inscricoesStore.filter(
    (i) =>
      i.atividadeId === atividadeId &&
      (i.status === 'confirmada' || i.status === 'convocada')
  ).length;
}

function contarEmEspera(atividadeId) {
  return inscricoesStore.filter(
    (i) => i.atividadeId === atividadeId && i.status === 'em_espera'
  ).length;
}

// R4: ocupadas = confirmada + convocada; emEspera = fila de espera
function sincronizarContadores(atv) {
  atv.ocupadas = contarOcupadas(atv.id);
  atv.emEspera = contarEmEspera(atv.id);
}

function primeiroInicioMs(atv) {
  return Math.min(...atv.encontros.map((e) => new Date(e.inicio).getTime()));
}

function encerramentoMs(atv) {
  return primeiroInicioMs(atv) - 30 * 60 * 1000;
}

export function formatarInscricao(insc) {
  let posicaoNaEspera = null;
  if (insc.status === 'em_espera') {
    const fila = inscricoesStore.filter(
      (i) => i.atividadeId === insc.atividadeId && i.status === 'em_espera'
    );
    posicaoNaEspera = fila.indexOf(insc) + 1;
  }

  return {
    id: insc.id,
    atividadeId: insc.atividadeId,
    participanteId: insc.participanteId,
    status: insc.status,
    posicaoNaEspera,
    convocadaAte: null,
    criadaEm: insc.criadaEm
  };
}

export function criarInscricao(atividadeId, participanteId, agora) {
  const atv = obterAtividadeBrutaPorId(atividadeId);
  if (!atv) {
    return {
      erro: 'NAO_ENCONTRADO',
      status: 404,
      mensagem: 'Atividade não encontrada.'
    };
  }

  // R1: inscrições encerram 30 min antes do primeiro encontro (inclusive)
  if (new Date(agora).getTime() >= encerramentoMs(atv)) {
    return {
      erro: 'INSCRICOES_ENCERRADAS',
      status: 422,
      mensagem: 'Período de inscrições encerrado para esta atividade.'
    };
  }

  // R5: inscrição ativa na mesma atividade impede nova inscrição
  const ativa = inscricoesStore.find(
    (i) =>
      i.atividadeId === atividadeId &&
      i.participanteId === participanteId &&
      STATUS_ATIVOS.includes(i.status)
  );
  if (ativa) {
    return {
      erro: 'JA_INSCRITO',
      status: 409,
      mensagem: 'Participante já possui inscrição ativa nesta atividade.'
    };
  }

  // R6: com vaga nasce confirmada; sem vaga entra no fim da fila (FIFO)
  const vagasLivres = Math.max(0, atv.vagas - contarOcupadas(atv.id));
  const status = vagasLivres > 0 ? 'confirmada' : 'em_espera';

  const inscricao = {
    id: gerarIdInscricao(),
    atividadeId,
    participanteId,
    status,
    criadaEm: agora
  };
  inscricoesStore.push(inscricao);

  sincronizarContadores(atv);

  return {
    sucesso: true,
    status: 201,
    dados: formatarInscricao(inscricao)
  };
}

export function resetInscricoes() {
  inscricoesStore = [];
}

// R12: participante vê só as próprias; organização vê todas; filtro opcional por atividade
export function listarInscricoes({ participanteId, ehOrganizacao, atividadeId }) {
  let resultado = inscricoesStore;
  if (!ehOrganizacao) {
    resultado = resultado.filter((i) => i.participanteId === participanteId);
  }
  if (atividadeId) {
    resultado = resultado.filter((i) => i.atividadeId === atividadeId);
  }
  return resultado.map(formatarInscricao);
}

// R12: qualquer autenticado lê uma inscrição por id (fato do contrato)
export function obterInscricaoPorId(id) {
  const insc = inscricoesStore.find((i) => i.id === id);
  if (!insc) return null;
  return formatarInscricao(insc);
}
