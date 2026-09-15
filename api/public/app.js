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

  const modal = document.getElementById('modal-detalhe');
  const modalBody = document.getElementById('modal-body');
  const closeModal = document.querySelector('.close-modal');

  let salasMap = {};

  // Obter cabeçalhos com o usuário atual
  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Usuario': usuarioSelect.value
    };
  }

  // Verificar se o usuário atual é da organização (simples verificação de prefixo org-)
  function atualizarPermissoesUI() {
    const usuario = usuarioSelect.value;
    if (usuario.startsWith('org-')) {
      orgSection.classList.remove('hidden');
    } else {
      orgSection.classList.add('hidden');
    }
  }

  usuarioSelect.addEventListener('change', () => {
    atualizarPermissoesUI();
    carregarAtividades();
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
      renderizarAtividades(atividades);
    } catch (e) {
      atividadesGrid.innerHTML = `<p class="alert error">Erro ao carregar atividades: ${e.message}</p>`;
    }
  }

  function renderizarAtividades(atividades) {
    if (atividades.length === 0) {
      atividadesGrid.innerHTML = '<p>Nenhuma atividade encontrada.</p>';
      return;
    }

    atividadesGrid.innerHTML = '';
    atividades.forEach(atv => {
      const sala = salasMap[atv.salaId] ? salasMap[atv.salaId].nome : atv.salaId;
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
          </div>
        </div>
        <div class="atividade-footer">
          <span class="badge ${atv.situacao}">${atv.situacao.replace('_', ' ')}</span>
          <span style="color: var(--primary);">Ver detalhes →</span>
        </div>
      `;

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
    carregarAtividades();
  });
});
