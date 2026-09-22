import { isOrganizacao } from '../services/usuarioService.js';
import { getAgora } from '../services/relogioService.js';
import {
  listarAtividades,
  obterAtividadePorId,
  criarAtividade,
  atualizarAtividade,
  cancelarAtividade
} from '../services/atividadeService.js';
import { processarExpiracoes } from '../services/inscricaoService.js';

export function getAtividades(req, res) {
  const agora = getAgora();
  processarExpiracoes(agora);
  const filtros = {
    dia: req.query.dia,
    tipo: req.query.tipo
  };
  const lista = listarAtividades(filtros, agora);
  res.status(200).json(lista);
}

export function getAtividadePorId(req, res) {
  const agora = getAgora();
  processarExpiracoes(agora);
  const atv = obterAtividadePorId(req.params.id, agora);
  if (!atv) {
    return res.status(404).json({
      erro: 'NAO_ENCONTRADO',
      mensagem: 'Atividade não encontrada.'
    });
  }
  res.status(200).json(atv);
}

export function postAtividade(req, res) {
  if (!isOrganizacao(req.usuario)) {
    return res.status(403).json({
      erro: 'SOMENTE_ORGANIZACAO',
      mensagem: 'Apenas membros da organização podem cadastrar atividades.'
    });
  }

  const agora = getAgora();
  const resultado = criarAtividade(req.body, agora);

  if (!resultado.sucesso) {
    return res.status(resultado.status).json({
      erro: resultado.erro,
      mensagem: resultado.mensagem
    });
  }

  res.status(201).json(resultado.dados);
}

export function patchAtividade(req, res) {
  if (!isOrganizacao(req.usuario)) {
    return res.status(403).json({
      erro: 'SOMENTE_ORGANIZACAO',
      mensagem: 'Apenas membros da organização podem alterar atividades.'
    });
  }

  const agora = getAgora();
  const resultado = atualizarAtividade(req.params.id, req.body, agora);

  if (!resultado.sucesso) {
    return res.status(resultado.status).json({
      erro: resultado.erro,
      mensagem: resultado.mensagem
    });
  }

  res.status(200).json(resultado.dados);
}

export function postCancelamento(req, res) {
  if (!isOrganizacao(req.usuario)) {
    return res.status(403).json({
      erro: 'SOMENTE_ORGANIZACAO',
      mensagem: 'Apenas membros da organização podem cancelar atividades.'
    });
  }

  const agora = getAgora();
  const resultado = cancelarAtividade(req.params.id, agora);

  if (!resultado.sucesso) {
    return res.status(resultado.status).json({
      erro: resultado.erro,
      mensagem: resultado.mensagem
    });
  }

  res.status(200).json(resultado.dados);
}
