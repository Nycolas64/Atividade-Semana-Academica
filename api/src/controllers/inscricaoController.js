import { getAgora } from '../services/relogioService.js';
import { isOrganizacao } from '../services/usuarioService.js';
import { criarInscricao, listarInscricoes, obterInscricaoPorId } from '../services/inscricaoService.js';

export function getInscricaoPorId(req, res) {
  const insc = obterInscricaoPorId(req.params.id);
  if (!insc) {
    return res.status(404).json({
      erro: 'NAO_ENCONTRADO',
      mensagem: 'Inscrição não encontrada.'
    });
  }
  res.status(200).json(insc);
}

export function getInscricoes(req, res) {
  const lista = listarInscricoes({
    participanteId: req.usuario,
    ehOrganizacao: isOrganizacao(req.usuario),
    atividadeId: req.query.atividadeId
  });
  res.status(200).json(lista);
}

export function postInscricao(req, res) {
  if (isOrganizacao(req.usuario)) {
    return res.status(403).json({
      erro: 'SOMENTE_PARTICIPANTE',
      mensagem: 'Apenas participantes podem se inscrever em atividades.'
    });
  }

  const agora = getAgora();
  const resultado = criarInscricao(req.params.id, req.usuario, agora);

  if (!resultado.sucesso) {
    return res.status(resultado.status).json({
      erro: resultado.erro,
      mensagem: resultado.mensagem
    });
  }

  res.status(201).json(resultado.dados);
}
