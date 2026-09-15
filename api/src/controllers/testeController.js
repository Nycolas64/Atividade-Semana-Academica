import { resetRelogio, setAgora, getAgora } from '../services/relogioService.js';
import { resetAtividades } from '../services/atividadeService.js';

export function postReset(req, res) {
  resetRelogio();
  resetAtividades();
  res.status(204).end();
}

export function putRelogio(req, res) {
  if (!req.body || !req.body.agora) {
    return res.status(422).json({
      erro: 'DADOS_INVALIDOS',
      mensagem: 'Campo agora é obrigatório.'
    });
  }
  const novaData = setAgora(req.body.agora);
  res.status(200).json({ agora: novaData });
}

export function getRelogio(req, res) {
  res.status(200).json({ agora: getAgora() });
}
