const USUARIOS = new Map([
  ['org-ana', { id: 'org-ana', nome: 'Ana Beatriz Lima', papel: 'organizacao' }],
  ['org-bruno', { id: 'org-bruno', nome: 'Bruno Tavares', papel: 'organizacao' }],
  ['p-carla', { id: 'p-carla', nome: 'Carla Mendes Souza', papel: 'participante' }],
  ['p-diego', { id: 'p-diego', nome: 'Diego Alves', papel: 'participante' }],
  ['p-elisa', { id: 'p-elisa', nome: 'Elisa Fernandes da Rocha', papel: 'participante' }],
  ['p-fabio', { id: 'p-fabio', nome: 'Fábio Nogueira', papel: 'participante' }],
  ['p-gabriela', { id: 'p-gabriela', nome: 'Gabriela Moura Castro', papel: 'participante' }],
  ['p-heitor', { id: 'p-heitor', nome: 'Heitor Campos', papel: 'participante' }],
  ['p-isadora', { id: 'p-isadora', nome: 'Isadora Ribeiro dos Santos', papel: 'participante' }],
  ['p-joao', { id: 'p-joao', nome: 'João Pedro Martins', papel: 'participante' }]
]);

export function isUsuarioValido(id) {
  return USUARIOS.has(id);
}

export function isOrganizacao(id) {
  const usuario = USUARIOS.get(id);
  return usuario ? usuario.papel === 'organizacao' : false;
}

export function obterUsuario(id) {
  return USUARIOS.get(id) || null;
}
