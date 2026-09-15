import { listarSalas } from '../services/salaService.js';

export function getSalas(req, res) {
  const salas = listarSalas();
  res.status(200).json(salas);
}
