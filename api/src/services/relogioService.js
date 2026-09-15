let agoraState = '2026-10-13T09:00:00-03:00';

export function getAgora() {
  if (process.env.MODO_TESTE === '1') {
    return agoraState;
  }
  // Se não estiver em MODO_TESTE, retorna a hora atual real (ou a definida se MODO_TESTE não setado mas relogio alterado)
  return agoraState || new Date().toISOString();
}

export function setAgora(novaDataIso) {
  agoraState = novaDataIso;
  return agoraState;
}

export function resetRelogio() {
  agoraState = '2026-10-13T09:00:00-03:00';
  return agoraState;
}
