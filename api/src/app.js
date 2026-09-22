import express from 'express';
import path from 'node:path';
import { isUsuarioValido } from './services/usuarioService.js';
import { getSalas } from './controllers/salaController.js';
import {
  getAtividades,
  getAtividadePorId,
  postAtividade,
  patchAtividade,
  postCancelamento
} from './controllers/atividadeController.js';
import {
  postReset,
  putRelogio,
  getRelogio
} from './controllers/testeController.js';
import {
  postInscricao,
  getInscricoes,
  getInscricaoPorId,
  postCancelamentoInscricao,
  postConfirmacaoInscricao
} from './controllers/inscricaoController.js';

export function criarServidor() {
  const app = express();
  app.use(express.json());

  // Servir arquivos estáticos da interface web
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Middleware de autenticação
  app.use((req, res, next) => {
    // Isentar rotas de teste, certificados públicos e requisições para a interface web (HTML, CSS, JS, etc.)
    if (
      req.path.startsWith('/_teste') ||
      (req.method === 'GET' && req.path.startsWith('/certificados/')) ||
      (!req.path.startsWith('/salas') &&
        !req.path.startsWith('/atividades') &&
        !req.path.startsWith('/inscricoes'))
    ) {
      return next();
    }

    const usuarioHeader = req.headers['x-usuario'];
    if (!usuarioHeader || !isUsuarioValido(usuarioHeader)) {
      return res.status(401).json({
        erro: 'USUARIO_DESCONHECIDO',
        mensagem: 'Usuário não identificado ou inexistente.'
      });
    }

    req.usuario = usuarioHeader;
    next();
  });

  // Rotas M1
  app.get('/salas', getSalas);
  app.get('/atividades', getAtividades);
  app.get('/atividades/:id', getAtividadePorId);
  app.post('/atividades', postAtividade);
  app.patch('/atividades/:id', patchAtividade);
  app.post('/atividades/:id/cancelamento', postCancelamento);

  // Rotas M2
  app.post('/atividades/:id/inscricoes', postInscricao);
  app.get('/inscricoes', getInscricoes);
  app.get('/inscricoes/:id', getInscricaoPorId);
  app.post('/inscricoes/:id/cancelamento', postCancelamentoInscricao);
  app.post('/inscricoes/:id/confirmacao', postConfirmacaoInscricao);

  // Rotas de Teste
  app.post('/_teste/reset', postReset);
  app.put('/_teste/relogio', putRelogio);
  app.get('/_teste/relogio', getRelogio);

  return app;
}
