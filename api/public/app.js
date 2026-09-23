document.addEventListener('DOMContentLoaded', () => {
  const usuarioSelect = document.getElementById('usuario-select');
  const orgSection = document.getElementById('org-section');
  const formCriar = document.getElementById('form-criar-atividade');
  const tipoSelect = document.getElementById('tipo');
  const encontrosLista = document.getElementById('encontros-lista');
  const btnAddEncontro = document.getElementById('btn-add-encontro');
  const apiErrorAlert = document.getElementById('api-error-alert');
  const apiSuccessAlert = document.getElementById('api-success-alert');

  const filtroDia = document.getElementById('filtro-dia');
  const filtroTipo = document.getElementById('filtro-tipo');
  const btnFiltrar = document.getElementById('btn-filtrar');
  const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
  const atividadesGrid = document.getElementById('atividades-grid');

  const minhasInscricoesSec = document.getElementById('minhas-inscricoes');
  const inscricoesLista = document.getElementById('inscricoes-lista');
  const feedbackAlert = document.getElementById('feedback-alert');

  const modal = document.getElementById('modal-detalhe');
  const modalBody = document.getElementById('modal-body');
  const closeModal = document.querySelector('.close-modal');

  let salasMap = {};
  let atividadesCache = [];
  let minhasInscricoes = [];

  const STATUS_ATIVOS = ['confirmada', 'em_espera', 'convocada'];

  // Obter cabeçalhos com o usuário atual
  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Usuario': usuarioSelect.value
    };
  }

  function ehOrganizacao() {
    return usuarioSelect.value.startsWith('org-');
  }

  function mostrarFeedback(mensagem, tipo) {
    feedbackAlert.textContent = mensagem;
    feedbackAlert.className = `alert ${tipo}`;
  }

  function limparFeedback() {
    feedbackAlert.className = 'alert hidden';
  }

  // Verificar se o usuário atual é da organização (simples verificação de prefixo org-)
  function atualizarPermissoesUI() {
    const usuario = usuarioSelect.value;
    if (ehOrganizacao()) {
      orgSection.classList.remove('hidden');
      minhasInscricoesSec.classList.add('hidden');
    } else {
      orgSection.classList.add('hidden');
      minhasInscricoesSec.classList.remove('hidden');
    }
  }

  usuarioSelect.addEventListener('change', () => {
    limparFeedback();
    atualizarPermissoesUI();
    recarregar();
  });

  // Ajustar campos de encontros baseado no tipo (palestra = 1, minicurso = 2-5)
  tipoSelect.addEventListener('change', () => {
    const tipo = tipoSelect.value;
    if (tipo === 'palestra') {
      // Manter apenas 1 encontro
      while (encontrosLista.children.length > 1) {
        encontrosLista.removeChild(encontrosLista.lastChild);
      }
      btnAddEncontro.classList.add('hidden');
    } else {
      btnAddEncontro.classList.remove('hidden');
      if (encontrosLista.children.length < 2) {
        adicionarEncontroInput('2026-10-20T14:00', '2026-10-20T16:00');
      }
    }
  });

  function adicionarEncontroInput(inicioDefault = '2026-10-19T14:00', fimDefault = '2026-10-19T16:00') {
    if (tipoSelect.value === 'palestra' && encontrosLista.children.length >= 1) return;
    if (encontrosLista.children.length >= 5) return;

    const div = document.createElement('div');
    div.className = 'encontro-item';
    div.innerHTML = `
      <div class="form-group">
        <label>Início:</label>
        <input type="datetime-local" class="enc-inicio" value="${inicioDefault}" required>
      </div>
      <div class="form-group">
        <label>Fim:</label>
        <input type="datetime-local" class="enc-fim" value="${fimDefault}" required>
      </div>
      <button type="button" class="btn secondary btn-remover-enc" ${encontrosLista.children.length === 0 ? 'style="display:none"' : ''}>Remover</button>
    `;

    div.querySelector('.btn-remover-enc').addEventListener('click', () => {
      if (encontrosLista.children.length > 1) {
        encontrosLista.removeChild(div);
      }
    });

    encontrosLista.appendChild(div);
  }

  btnAddEncontro.addEventListener('click', () => {
    adicionarEncontroInput();
  });

  // Carregar Salas
  async function carregarSalas() {
    try {
      const res = await fetch('/salas', {
        headers: { 'X-Usuario': 'org-ana' }
      });
      if (res.ok) {
        const salas = await res.json();
        salas.forEach(s => {
          salasMap[s.id] = s;
        });
      }
    } catch (e) {
      console.error('Erro ao carregar salas:', e);
    }
  }

  // Carregar Atividades
  async function carregarAtividades() {
    atividadesGrid.innerHTML = '<p class="loading">Carregando atividades...</p>';
    try {
      let url = '/atividades?';
      const params = new URLSearchParams();
      if (filtroDia.value) params.append('dia', filtroDia.value);
      if (filtroTipo.value) params.append('tipo', filtroTipo.value);
      url += params.toString();

      const res = await fetch(url, {
        headers: { 'X-Usuario': usuarioSelect.value }
      });

      if (!res.ok) {
        throw new Error('Falha ao carregar atividades');
      }

      const atividades = await res.json();
      atividadesCache = atividades;
      renderizarAtividades(atividades);
    } catch (e) {
      atividadesGrid.innerHTML = `<p class="alert error">Erro ao carregar atividades: ${e.message}</p>`;
    }
  }

  // Carregar Minhas Inscrições (R16)
  async function carregarMinhasInscricoes() {
    if (ehOrganizacao()) {
      minhasInscricoes = [];
      return;
    }
    inscricoesLista.innerHTML = '<p class="loading">Carregando inscrições...</p>';
    try {
      const res = await fetch('/inscricoes', { headers: getHeaders() });
      if (!res.ok) throw new Error('Falha ao carregar inscrições');
      minhasInscricoes = await res.json();
      renderizarMinhasInscricoes();
    } catch (e) {
      inscricoesLista.innerHTML = `<p class="alert error">Erro ao carregar inscrições: ${e.message}</p>`;
    }
  }

  function renderizarMinhasInscricoes() {
    if (minhasInscricoes.length === 0) {
      inscricoesLista.innerHTML = '<p>Você ainda não tem inscrições.</p>';
      return;
    }

    inscricoesLista.innerHTML = '';
    minhasInscricoes.forEach((insc) => {
      const atv = atividadesCache.find((a) => a.id === insc.atividadeId);
      const titulo = atv ? atv.titulo : insc.atividadeId;
      const item = document.createElement('div');
      item.className = 'inscricao-item';
      item.innerHTML = `
        <div class="inscricao-info">
          <span class="inscricao-titulo">${escapeHtml(titulo)}</span>
          <span class="badge status-${insc.status}">${insc.status.replace('_', ' ')}</span>
          ${insc.posicaoNaEspera !== null ? `<span class="posicao-espera">Posição na fila: ${insc.posicaoNaEspera}</span>` : ''}
          ${insc.convocadaAte ? `<span class="convocada-ate">Convocada até: ${new Date(insc.convocadaAte).toLocaleString('pt-BR')}</span>` : ''}
        </div>
        <div class="inscricao-acoes">
          ${insc.status === 'convocada' ? `<button class="btn primary btn-mini" data-confirmar="${insc.id}">Confirmar</button>` : ''}
          ${STATUS_ATIVOS.includes(insc.status) ? `<button class="btn secondary btn-mini" data-cancelar="${insc.id}">Cancelar</button>` : ''}
        </div>
      `;

      const btnConfirmar = item.querySelector('[data-confirmar]');
      if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => confirmarInscricao(insc.id));
      }
      const btnCancel = item.querySelector('[data-cancelar]');
      if (btnCancel) {
        btnCancel.addEventListener('click', () => cancelarInscricao(insc.id));
      }

      inscricoesLista.appendChild(item);
    });
  }

  async function recarregar() {
    await Promise.all([carregarAtividades(), carregarMinhasInscricoes()]);
  }

  // Operações de inscrição do participante (R16)
  async function inscreverAtividade(atividadeId) {
    limparFeedback();
    try {
      const res = await fetch(`/atividades/${atividadeId}/inscricoes`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarFeedback(`Erro [${data.erro}]: ${data.mensagem}`, 'error');
      } else {
        mostrarFeedback(
          data.status === 'em_espera'
            ? `Inscrição criada na fila de espera (posição ${data.posicaoNaEspera}).`
            : 'Inscrição realizada com sucesso!',
          'success'
        );
      }
    } catch (err) {
      mostrarFeedback(`Erro de conexão: ${err.message}`, 'error');
    }
    await recarregar();
  }

  async function cancelarInscricao(inscricaoId) {
    limparFeedback();
    try {
      const res = await fetch(`/inscricoes/${inscricaoId}/cancelamento`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarFeedback(`Erro [${data.erro}]: ${data.mensagem}`, 'error');
      } else {
        mostrarFeedback('Inscrição cancelada.', 'success');
      }
    } catch (err) {
      mostrarFeedback(`Erro de conexão: ${err.message}`, 'error');
    }
    await recarregar();
  }

  async function confirmarInscricao(inscricaoId) {
    limparFeedback();
    try {
      const res = await fetch(`/inscricoes/${inscricaoId}/confirmacao`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarFeedback(`Erro [${data.erro}]: ${data.mensagem}`, 'error');
      } else {
        mostrarFeedback('Convocação confirmada!', 'success');
      }
    } catch (err) {
      mostrarFeedback(`Erro de conexão: ${err.message}`, 'error');
    }
    await recarregar();
  }

  function renderizarAtividades(atividades) {
    if (atividades.length === 0) {
      atividadesGrid.innerHTML = '<p>Nenhuma atividade encontrada.</p>';
      return;
    }

    atividadesGrid.innerHTML = '';
    atividades.forEach(atv => {
      const sala = salasMap[atv.salaId] ? salasMap[atv.salaId].nome : atv.salaId;
      const minhaAtiva = minhasInscricoes.find(
        (i) => i.atividadeId === atv.id && STATUS_ATIVOS.includes(i.status)
      );

      let acoesHtml = '';
      if (!ehOrganizacao()) {
        if (!minhaAtiva) {
          acoesHtml = `<button class="btn primary btn-mini btn-inscrever" data-atv="${atv.id}">Inscrever</button>`;
        } else {
          const btns = [];
          if (minhaAtiva.status === 'convocada') {
            btns.push(`<button class="btn primary btn-mini btn-confirmar" data-insc="${minhaAtiva.id}">Confirmar</button>`);
          }
          btns.push(`<button class="btn secondary btn-mini btn-cancelar" data-insc="${minhaAtiva.id}">Cancelar</button>`);
          acoesHtml = btns.join(' ');
        }
      }

      const card = document.createElement('div');
      card.className = 'atividade-card';
      card.innerHTML = `
        <div>
          <div class="atividade-header">
            <span class="atividade-titulo">${escapeHtml(atv.titulo)}</span>
            <span class="badge ${atv.tipo}">${atv.tipo}</span>
          </div>
          <div class="atividade-info">
            <span>📍 Sala: ${escapeHtml(sala)}</span>
            <span>⏱️ Carga Horária: ${atv.cargaHorariaMinutos} min</span>
            <span>👥 Vagas Restantes: ${atv.vagasRestantes} / ${atv.vagas}</span>
            ${minhaAtiva ? `<span>🎫 Minha inscrição: <span class="badge status-${minhaAtiva.status}">${minhaAtiva.status.replace('_', ' ')}</span></span>` : ''}
          </div>
        </div>
        <div class="atividade-footer">
          <span class="badge ${atv.situacao}">${atv.situacao.replace('_', ' ')}</span>
          <span class="atividade-acoes">
            ${acoesHtml}
            <span class="ver-detalhes" style="color: var(--primary);">Ver detalhes →</span>
          </span>
        </div>
      `;

      const btnInscrever = card.querySelector('.btn-inscrever');
      if (btnInscrever) {
        btnInscrever.addEventListener('click', (e) => {
          e.stopPropagation();
          inscreverAtividade(atv.id);
        });
      }
      const btnCancelar = card.querySelector('.btn-cancelar');
      if (btnCancelar) {
        btnCancelar.addEventListener('click', (e) => {
          e.stopPropagation();
          cancelarInscricao(minhaAtiva.id);
        });
      }
      const btnConfirmar = card.querySelector('.btn-confirmar');
      if (btnConfirmar) {
        btnConfirmar.addEventListener('click', (e) => {
          e.stopPropagation();
          confirmarInscricao(minhaAtiva.id);
        });
      }

      card.addEventListener('click', () => abrirDetalhesAtividade(atv.id));
      atividadesGrid.appendChild(card);
    });
  }

  btnFiltrar.addEventListener('click', () => carregarAtividades());
  btnLimparFiltros.addEventListener('click', () => {
    filtroDia.value = '';
    filtroTipo.value = '';
    carregarAtividades();
  });

  // Detalhes da Atividade e Ações (Modal)
  async function abrirDetalhesAtividade(id) {
    try {
      const res = await fetch(`/atividades/${id}`, {
        headers: { 'X-Usuario': usuarioSelect.value }
      });
      if (!res.ok) throw new Error('Atividade não encontrada');
      const atv = await res.json();

      const sala = salasMap[atv.salaId] ? salasMap[atv.salaId].nome : atv.salaId;
      const isOrg = usuarioSelect.value.startsWith('org-');
      const minhaAtiva = minhasInscricoes.find(
        (i) => i.atividadeId === atv.id && STATUS_ATIVOS.includes(i.status)
      );

      let encontrosHtml = '<ul>';
      atv.encontros.forEach((enc, idx) => {
        const inicio = new Date(enc.inicio).toLocaleString('pt-BR');
        const fim = new Date(enc.fim).toLocaleString('pt-BR');
        encontrosHtml += `<li><strong>Encontro ${idx + 1}:</strong> ${inicio} até ${fim}</li>`;
      });
      encontrosHtml += '</ul>';

      modalBody.innerHTML = `
        <div class="modal-details">
          <h3>${escapeHtml(atv.titulo)}</h3>
          <p><strong>Tipo:</strong> <span class="badge ${atv.tipo}">${atv.tipo}</span></p>
          <p><strong>Situação:</strong> <span class="badge ${atv.situacao}">${atv.situacao.replace('_', ' ')}</span></p>
          <p><strong>Sala:</strong> ${escapeHtml(sala)}</p>
          <p><strong>Carga Horária:</strong> ${atv.cargaHorariaMinutos} minutos</p>
          <p><strong>Vagas:</strong> ${atv.vagas} total | ${atv.vagasRestantes} restantes | ${atv.ocupadas} ocupadas | ${atv.emEspera} em espera</p>
          
          <h4 style="margin-top: 1rem;">Encontros</h4>
          ${encontrosHtml}

          ${!isOrg ? `
            <div class="acoes-inscricao" style="margin-top: 1rem;">
              ${!minhaAtiva
                ? `<button class="btn primary btn-mini btn-inscrever" data-atv="${atv.id}">Inscrever</button>`
                : `<button class="btn secondary btn-mini btn-cancelar" data-insc="${minhaAtiva.id}">Cancelar</button>`}
            </div>
          ` : ''}

          ${isOrg && atv.situacao !== 'cancelada' ? `
            <hr style="margin: 1.5rem 0; border:0; border-top:1px solid var(--border-color);">
            <h4>Painel da Organização (Gerenciar)</h4>
            <form id="form-editar-atividade" style="margin-top: 1rem;">
              <div class="form-group">
                <label>Editar Título:</label>
                <input type="text" id="edit-titulo" value="${escapeHtml(atv.titulo)}" required>
              </div>
              <div class="form-group">
                <label>Editar Vagas:</label>
                <input type="number" id="edit-vagas" value="${atv.vagas}" min="1" required>
              </div>
              <div id="modal-error" class="alert error hidden"></div>
              <div id="modal-success" class="alert success hidden"></div>
              <div class="actions-bar">
                <button type="submit" class="btn primary">Salvar Alterações (PATCH)</button>
                <button type="button" id="btn-cancelar-atv" class="btn" style="background: var(--danger); color: white;">Cancelar Atividade</button>
              </div>
            </form>
          ` : ''}
        </div>
      `;

      modal.classList.remove('hidden');

      const btnDetalheInscrever = modalBody.querySelector('.btn-inscrever');
      if (btnDetalheInscrever) {
        btnDetalheInscrever.addEventListener('click', (e) => {
          e.stopPropagation();
          modal.classList.add('hidden');
          inscreverAtividade(atv.id);
        });
      }
      const btnDetalheCancelar = modalBody.querySelector('.btn-cancelar');
      if (btnDetalheCancelar) {
        btnDetalheCancelar.addEventListener('click', (e) => {
          e.stopPropagation();
          modal.classList.add('hidden');
          cancelarInscricao(minhaAtiva.id);
        });
      }

      if (isOrg && atv.situacao !== 'cancelada') {
        const formEditar = document.getElementById('form-editar-atividade');
        const btnCancelarAtv = document.getElementById('btn-cancelar-atv');
        const modalError = document.getElementById('modal-error');
        const modalSuccess = document.getElementById('modal-success');

        formEditar.addEventListener('submit', async (e) => {
          e.preventDefault();
          modalError.classList.add('hidden');
          modalSuccess.classList.add('hidden');

          const novoTitulo = document.getElementById('edit-titulo').value;
          const novasVagas = parseInt(document.getElementById('edit-vagas').value, 10);

          try {
            const patchRes = await fetch(`/atividades/${id}`, {
              method: 'PATCH',
              headers: getHeaders(),
              body: JSON.stringify({ titulo: novoTitulo, vagas: novasVagas })
            });
            const data = await patchRes.json();

            if (!patchRes.ok) {
              modalError.textContent = `[${data.erro}] ${data.mensagem}`;
              modalError.classList.remove('hidden');
            } else {
              modalSuccess.textContent = 'Atividade atualizada com sucesso!';
              modalSuccess.classList.remove('hidden');
              carregarAtividades();
            }
          } catch (err) {
            modalError.textContent = err.message;
            modalError.classList.remove('hidden');
          }
        });

        btnCancelarAtv.addEventListener('click', async () => {
          if (!confirm('Tem certeza que deseja cancelar esta atividade? Esta operação é definitiva.')) return;
          modalError.classList.add('hidden');
          modalSuccess.classList.add('hidden');

          try {
            const cancelRes = await fetch(`/atividades/${id}/cancelamento`, {
              method: 'POST',
              headers: getHeaders()
            });
            const data = await cancelRes.json();

            if (!cancelRes.ok) {
              modalError.textContent = `[${data.erro}] ${data.mensagem}`;
              modalError.classList.remove('hidden');
            } else {
              modalSuccess.textContent = 'Atividade cancelada com sucesso!';
              modalSuccess.classList.remove('hidden');
              setTimeout(() => {
                modal.classList.add('hidden');
                carregarAtividades();
              }, 1500);
            }
          } catch (err) {
            modalError.textContent = err.message;
            modalError.classList.remove('hidden');
          }
        });
      }

    } catch (e) {
      alert(e.message);
    }
  }

  closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  // Criar Atividade (Organização)
  formCriar.addEventListener('submit', async (e) => {
    e.preventDefault();
    apiErrorAlert.classList.add('hidden');
    apiSuccessAlert.classList.add('hidden');

    const titulo = document.getElementById('titulo').value;
    const tipo = tipoSelect.value;
    const salaId = document.getElementById('salaId').value;
    const vagas = parseInt(document.getElementById('vagas').value, 10);

    const encontrosElems = encontrosLista.querySelectorAll('.encontro-item');
    const encontros = [];

    encontrosElems.forEach(el => {
      const inicioLocal = el.querySelector('.enc-inicio').value;
      const fimLocal = el.querySelector('.enc-fim').value;
      if (inicioLocal && fimLocal) {
        // Converter datetime-local para ISO com fuso -03:00 conforme spec
        encontros.push({
          inicio: `${inicioLocal}:00-03:00`,
          fim: `${fimLocal}:00-03:00`
        });
      }
    });

    const payload = { titulo, tipo, salaId, vagas, encontros };

    try {
      const res = await fetch('/atividades', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        apiErrorAlert.textContent = `Erro [${data.erro}]: ${data.mensagem}`;
        apiErrorAlert.classList.remove('hidden');
      } else {
        apiSuccessAlert.textContent = `Atividade "${data.titulo}" cadastrada com sucesso! (ID: ${data.id})`;
        apiSuccessAlert.classList.remove('hidden');
        formCriar.reset();
        tipoSelect.value = 'palestra';
        encontrosLista.innerHTML = '';
        adicionarEncontroInput('2026-10-19T09:00', '2026-10-19T11:00');
        carregarAtividades();
      }
    } catch (err) {
      apiErrorAlert.textContent = `Erro de conexão: ${err.message}`;
      apiErrorAlert.classList.remove('hidden');
    }
  });

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Inicialização
  atualizarPermissoesUI();
  carregarSalas().then(() => {
    recarregar();
  });
});
