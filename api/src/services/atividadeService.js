import crypto from 'node:crypto';
import { obterSala } from './salaService.js';
import { cancelarInscricoesDaAtividade } from './inscricaoService.js';

let atividadesStore = [];

export function getEmDataFusoMinus3(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  const localMs = d.getTime() - 3 * 3600 * 1000;
  const localDate = new Date(localMs);
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function gerarIdAtividade() {
  return `atv_${crypto.randomBytes(4).toString('hex')}`;
}

function gerarIdEncontro() {
  return `enc_${crypto.randomBytes(4).toString('hex')}`;
}

export function formatarAtividade(atv, agora) {
  const cargaHorariaMinutos = atv.encontros.reduce((acc, enc) => {
    const duracao = Math.round((new Date(enc.fim) - new Date(enc.inicio)) / 60000);
    return acc + duracao;
  }, 0);

  let situacao = 'prevista';
  if (atv.isCancelada) {
    situacao = 'cancelada';
  } else {
    const agoraMs = new Date(agora).getTime();
    const encontrosOrdenados = [...atv.encontros].sort(
      (a, b) => new Date(a.inicio) - new Date(b.inicio)
    );
    const primeirInicioMs = new Date(encontrosOrdenados[0].inicio).getTime();
    const ultimoFimMs = new Date(encontrosOrdenados[encontrosOrdenados.length - 1].fim).getTime();

    if (agoraMs < primeirInicioMs) {
      situacao = 'prevista';
    } else if (agoraMs >= primeirInicioMs && agoraMs <= ultimoFimMs) {
      situacao = 'em_andamento';
    } else {
      situacao = 'encerrada';
    }
  }

  const ocupadas = atv.ocupadas || 0;
  const vagasRestantes = Math.max(0, atv.vagas - ocupadas);
  const emEspera = atv.emEspera || 0;

  return {
    id: atv.id,
    titulo: atv.titulo,
    tipo: atv.tipo,
    salaId: atv.salaId,
    vagas: atv.vagas,
    encontros: atv.encontros.map((e) => ({
      id: e.id,
      inicio: e.inicio,
      fim: e.fim
    })),
    cargaHorariaMinutos,
    situacao,
    ocupadas,
    vagasRestantes,
    emEspera
  };
}

export function listarAtividades(filtros, agora) {
  let resultado = atividadesStore;

  if (filtros.tipo) {
    resultado = resultado.filter((atv) => atv.tipo === filtros.tipo);
  }

  if (filtros.dia) {
    resultado = resultado.filter((atv) =>
      atv.encontros.some((enc) => getEmDataFusoMinus3(enc.inicio) === filtros.dia)
    );
  }

  return resultado.map((atv) => formatarAtividade(atv, agora));
}

export function obterAtividadePorId(id, agora) {
  const atv = atividadesStore.find((a) => a.id === id);
  if (!atv) return null;
  return formatarAtividade(atv, agora);
}

export function obterAtividadeBrutaPorId(id) {
  return atividadesStore.find((a) => a.id === id) || null;
}

export function criarAtividade(dados, agora) {
  // 1. Validação básica de corpo JSON
  if (
    !dados ||
    typeof dados !== 'object' ||
    typeof dados.titulo !== 'string' ||
    !dados.titulo.trim() ||
    typeof dados.tipo !== 'string' ||
    !['palestra', 'minicurso'].includes(dados.tipo) ||
    typeof dados.salaId !== 'string' ||
    typeof dados.vagas !== 'number' ||
    !Number.isInteger(dados.vagas) ||
    !Array.isArray(dados.encontros) ||
    dados.encontros.length === 0
  ) {
    return {
      erro: 'DADOS_INVALIDOS',
      status: 422,
      mensagem: 'Dados da atividade inválidos ou incompletos.'
    };
  }

  const sala = obterSala(dados.salaId);
  if (!sala) {
    return {
      erro: 'DADOS_INVALIDOS',
      status: 422,
      mensagem: 'Sala informada não existe.'
    };
  }

  // Validação dos encontros estrutural
  for (const enc of dados.encontros) {
    if (!enc || typeof enc !== 'object' || !enc.inicio || !enc.fim) {
      return {
        erro: 'DADOS_INVALIDOS',
        status: 422,
        mensagem: 'Estrutura de encontros inválida.'
      };
    }
    const dInicio = new Date(enc.inicio);
    const dFim = new Date(enc.fim);
    if (isNaN(dInicio.getTime()) || isNaN(dFim.getTime()) || dInicio >= dFim) {
      return {
        erro: 'DADOS_INVALIDOS',
        status: 422,
        mensagem: 'Datas de inicio ou fim inválidas.'
      };
    }
  }

  // R1: Quantidade de encontros por tipo
  if (dados.tipo === 'palestra' && dados.encontros.length !== 1) {
    return {
      erro: 'QUANTIDADE_DE_ENCONTROS',
      status: 422,
      mensagem: 'Palestra deve ter exatamente 1 encontro.'
    };
  }
  if (
    dados.tipo === 'minicurso' &&
    (dados.encontros.length < 2 || dados.encontros.length > 5)
  ) {
    return {
      erro: 'QUANTIDADE_DE_ENCONTROS',
      status: 422,
      mensagem: 'Minicurso deve ter entre 2 e 5 encontros.'
    };
  }

  // R2: Validação dos encontros
  const encontrosProcessados = dados.encontros.map((enc) => {
    const inicioMs = new Date(enc.inicio).getTime();
    const fimMs = new Date(enc.fim).getTime();
    const duracaoMinutos = (fimMs - inicioMs) / 60000;
    const diaInicio = getEmDataFusoMinus3(enc.inicio);
    const diaFim = getEmDataFusoMinus3(enc.fim);
    return {
      inicio: enc.inicio,
      fim: enc.fim,
      inicioMs,
      fimMs,
      duracaoMinutos,
      diaInicio,
      diaFim
    };
  });

  // Ordenar encontros por inicio
  encontrosProcessados.sort((a, b) => a.inicioMs - b.inicioMs);

  for (let i = 0; i < encontrosProcessados.length; i++) {
    const enc = encontrosProcessados[i];
    // Duração entre 60 e 240 min
    if (enc.duracaoMinutos < 60 || enc.duracaoMinutos > 240) {
      return {
        erro: 'ENCONTRO_INVALIDO',
        status: 422,
        mensagem: 'Duração do encontro deve ser entre 1h (60min) e 4h (240min).'
      };
    }
    // Iniciar e terminar no mesmo dia
    if (enc.diaInicio !== enc.diaFim) {
      return {
        erro: 'ENCONTRO_INVALIDO',
        status: 422,
        mensagem: 'Encontro deve iniciar e terminar no mesmo dia.'
      };
    }
    // Período da Semana Acadêmica: 2026-10-19 a 2026-10-23
    if (enc.diaInicio < '2026-10-19' || enc.diaInicio > '2026-10-23') {
      return {
        erro: 'ENCONTRO_INVALIDO',
        status: 422,
        mensagem: 'Encontro fora do período do evento (19/10/2026 a 23/10/2026).'
      };
    }

    // Sobreposição interna entre encontros da mesma atividade
    if (i < encontrosProcessados.length - 1) {
      const proximo = encontrosProcessados[i + 1];
      if (enc.fimMs > proximo.inicioMs) {
        return {
          erro: 'ENCONTRO_INVALIDO',
          status: 422,
          mensagem: 'Encontros da mesma atividade se sobrepõem.'
        };
      }
    }
  }

  // R3: Limite de vagas pela capacidade da sala
  if (dados.vagas < 1 || dados.vagas > sala.capacidade) {
    return {
      erro: 'VAGAS_ACIMA_DA_CAPACIDADE',
      status: 422,
      mensagem: `Vagas devem estar entre 1 e a capacidade da sala (${sala.capacidade}).`
    };
  }

  // R4: Conflito de uso da sala e tempo de limpeza (15 min)
  const atividadesAtivasNaSala = atividadesStore.filter(
    (a) => !a.isCancelada && a.salaId === dados.salaId
  );

  const CLEANUP_MS = 15 * 60 * 1000;

  for (const atvAtiva of atividadesAtivasNaSala) {
    for (const encExist of atvAtiva.encontros) {
      const existStart = new Date(encExist.inicio).getTime();
      const existEnd = new Date(encExist.fim).getTime();

      for (const encNew of encontrosProcessados) {
        if (
          encNew.inicioMs < existEnd + CLEANUP_MS &&
          existStart < encNew.fimMs + CLEANUP_MS
        ) {
          return {
            erro: 'CONFLITO_DE_SALA',
            status: 409,
            mensagem: 'Conflito de sala ou intervalo de limpeza inferior a 15 minutos.'
          };
        }
      }
    }
  }

  // Atividade válida! Salvar
  const novaAtividade = {
    id: gerarIdAtividade(),
    titulo: dados.titulo.trim(),
    tipo: dados.tipo,
    salaId: dados.salaId,
    vagas: dados.vagas,
    encontros: encontrosProcessados.map((e) => ({
      id: gerarIdEncontro(),
      inicio: e.inicio,
      fim: e.fim
    })),
    ocupadas: 0,
    emEspera: 0,
    isCancelada: false
  };

  atividadesStore.push(novaAtividade);

  return {
    sucesso: true,
    status: 201,
    dados: formatarAtividade(novaAtividade, agora)
  };
}

export function atualizarAtividade(id, dados, agora) {
  const atv = obterAtividadeBrutaPorId(id);
  if (!atv) {
    return {
      erro: 'NAO_ENCONTRADO',
      status: 404,
      mensagem: 'Atividade não encontrada.'
    };
  }

  // R9 Precedência de erros para PATCH:
  // 1. ATIVIDADE_CANCELADA (422)
  // 2. CAMPO_NAO_EDITAVEL (422)
  // 3. VAGAS_ACIMA_DA_CAPACIDADE (422)
  // 4. VAGAS_ABAIXO_DOS_INSCRITOS (409)

  // Nível 1: ATIVIDADE_CANCELADA
  if (atv.isCancelada) {
    return {
      erro: 'ATIVIDADE_CANCELADA',
      status: 422,
      mensagem: 'Não é possível alterar uma atividade cancelada.'
    };
  }

  // Nível 2: CAMPO_NAO_EDITAVEL
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return {
      erro: 'DADOS_INVALIDOS',
      status: 422,
      mensagem: 'Corpo da requisição inválido.'
    };
  }

  const chaves = Object.keys(dados);
  const chavesPermitidas = ['titulo', 'vagas'];
  const temChavesProibidas = chaves.some((k) => !chavesPermitidas.includes(k));

  if (temChavesProibidas || chaves.length === 0) {
    return {
      erro: 'CAMPO_NAO_EDITAVEL',
      status: 422,
      mensagem: 'Apenas os campos titulo e vagas podem ser editados.'
    };
  }

  const sala = obterSala(atv.salaId);

  // Nível 3: VAGAS_ACIMA_DA_CAPACIDADE
  if (dados.vagas !== undefined) {
    if (
      typeof dados.vagas !== 'number' ||
      !Number.isInteger(dados.vagas) ||
      dados.vagas > sala.capacidade
    ) {
      return {
        erro: 'VAGAS_ACIMA_DA_CAPACIDADE',
        status: 422,
        mensagem: `Vagas não podem ultrapassar a capacidade da sala (${sala.capacidade}).`
      };
    }
  }

  // Nível 4: VAGAS_ABAIXO_DOS_INSCRITOS
  if (dados.vagas !== undefined) {
    const ocupadas = atv.ocupadas || 0;
    if (dados.vagas < ocupadas) {
      return {
        erro: 'VAGAS_ABAIXO_DOS_INSCRITOS',
        status: 409,
        mensagem: 'Quantidade de vagas não pode ser menor que o número de inscritos.'
      };
    }
  }

  // Aplica alterações
  if (dados.titulo !== undefined) {
    if (typeof dados.titulo !== 'string' || !dados.titulo.trim()) {
      return {
        erro: 'DADOS_INVALIDOS',
        status: 422,
        mensagem: 'Título inválido.'
      };
    }
    atv.titulo = dados.titulo.trim();
  }

  if (dados.vagas !== undefined) {
    atv.vagas = dados.vagas;
  }

  return {
    sucesso: true,
    status: 200,
    dados: formatarAtividade(atv, agora)
  };
}

export function cancelarAtividade(id, agora) {
  const atv = obterAtividadeBrutaPorId(id);
  if (!atv) {
    return {
      erro: 'NAO_ENCONTRADO',
      status: 404,
      mensagem: 'Atividade não encontrada.'
    };
  }

  // R9 Precedência para Cancelamento:
  // 1. ATIVIDADE_CANCELADA (422)
  // 2. ATIVIDADE_JA_INICIADA (422)

  // Nível 1: ATIVIDADE_CANCELADA
  if (atv.isCancelada) {
    return {
      erro: 'ATIVIDADE_CANCELADA',
      status: 422,
      mensagem: 'Atividade já está cancelada.'
    };
  }

  // Nível 2: ATIVIDADE_JA_INICIADA
  const agoraMs = new Date(agora).getTime();
  const encontrosOrdenados = [...atv.encontros].sort(
    (a, b) => new Date(a.inicio) - new Date(b.inicio)
  );
  const primeiroInicioMs = new Date(encontrosOrdenados[0].inicio).getTime();

  if (agoraMs >= primeiroInicioMs) {
    return {
      erro: 'ATIVIDADE_JA_INICIADA',
      status: 422,
      mensagem: 'Não é possível cancelar uma atividade que já foi iniciada.'
    };
  }

  atv.isCancelada = true;
  cancelarInscricoesDaAtividade(id);

  return {
    sucesso: true,
    status: 200,
    dados: formatarAtividade(atv, agora)
  };
}

export function resetAtividades() {
  atividadesStore = [];
}
