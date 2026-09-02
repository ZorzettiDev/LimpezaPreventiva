/**
 * app.js - Lógica principal da aplicação, controle de visualizações, modais e eventos
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa o armazenamento (carrega dados fictícios no 1º acesso se vazio)
    StorageManager.init();

    // 2. Estado local da aplicação
    const state = {
        currentTab: 'dashboard',
        currentFilter: 'todos',
        searchQuery: '',
        activeSpotlightPc: null
    };

    // 3. Seleção de elementos DOM
    const DOM = {
        // Navegação
        navButtons: document.querySelectorAll('.nav-item'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        btnNovoPcHeader: document.getElementById('btn-novo-pc-header'),
        btnNovoPc: document.getElementById('btn-novo-pc'),
        btnRestaurarDados: document.getElementById('btn-restaurar-dados'),

        // Dashboard KPIs
        kpiTotal: document.getElementById('kpi-total'),
        kpiAtrasados: document.getElementById('kpi-atrasados'),
        kpiProximos: document.getElementById('kpi-proximos'),
        kpiEmDia: document.getElementById('kpi-em-dia'),
        kpiPendentes: document.getElementById('kpi-pendentes'),

        // Card Spotlight
        spotlightCard: document.getElementById('spotlight-card'),
        spotlightBadge: document.getElementById('spotlight-status-badge'),
        spotlightNome: document.getElementById('spotlight-nome'),
        spotlightAtivo: document.getElementById('spotlight-ativo'),
        spotlightSetor: document.getElementById('spotlight-setor'),
        spotlightResponsavel: document.getElementById('spotlight-responsavel'),
        spotlightData: document.getElementById('spotlight-data'),
        spotlightBtnLimpar: document.getElementById('spotlight-btn-limpar'),

        // Filtros & Pesquisa
        inputPesquisa: document.getElementById('input-pesquisa'),
        filterPills: document.querySelectorAll('.pill-btn'),
        countTodos: document.getElementById('count-todos'),
        countAtrasados: document.getElementById('count-atrasados'),
        countProximos: document.getElementById('count-proximos'),
        countEmDia: document.getElementById('count-em-dia'),
        countPendentes: document.getElementById('count-pendentes'),

        // Tabelas
        tbodyComputadores: document.getElementById('tbody-computadores'),
        tbodyHistorico: document.getElementById('tbody-historico'),

        // Modais
        modalPc: document.getElementById('modal-pc'),
        formPc: document.getElementById('form-pc'),
        modalPcTitle: document.getElementById('modal-pc-title'),
        btnExcluirPc: document.getElementById('btn-excluir-pc'),

        modalLimpeza: document.getElementById('modal-limpeza'),
        formLimpeza: document.getElementById('form-limpeza'),
        limpezaPcId: document.getElementById('limpeza-pc-id'),
        limpezaPcNome: document.getElementById('limpeza-pc-nome'),
        limpezaPcAtivo: document.getElementById('limpeza-pc-ativo'),
        limpezaPcSetor: document.getElementById('limpeza-pc-setor'),
        limpezaData: document.getElementById('limpeza-data'),
        limpezaResponsavel: document.getElementById('limpeza-responsavel'),
        limpezaProxima: document.getElementById('limpeza-proxima'),
        limpezaObs: document.getElementById('limpeza-obs'),

        toastContainer: document.getElementById('toast-container')
    };

    // =========================================================================
    // FUNÇÕES UTILITÁRIAS & REGRAS DE NEGÓCIO
    // =========================================================================

    /**
     * Formata data YYYY-MM-DD para DD/MM/YYYY
     */
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    /**
     * Retorna a data de hoje no formato YYYY-MM-DD
     */
    function getTodayIso() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Adiciona meses a uma data base
     */
    function addMonths(baseDateIso, months) {
        const d = baseDateIso ? new Date(baseDateIso + 'T00:00:00') : new Date();
        d.setMonth(d.getMonth() + parseInt(months, 10));
        return d.toISOString().split('T')[0];
    }

    /**
     * Calcula o status de um computador com base na data da próxima limpeza
     * 🟢 EM DIA | 🟡 PRÓXIMO (até 15 dias) | 🔴 ATRASADO (< hoje) | ⚪ PENDENTE (sem data)
     */
    function getComputerStatus(pc) {
        if (!pc.proximaLimpeza) {
            return {
                key: 'pendente',
                label: 'PENDENTE',
                icon: '⚪',
                className: 'status-pendente'
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parts = pc.proximaLimpeza.split('-');
        const proxima = new Date(parts[0], parts[1] - 1, parts[2]);
        proxima.setHours(0, 0, 0, 0);

        const diffTime = proxima.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return {
                key: 'atrasado',
                label: 'ATRASADO',
                icon: '🔴',
                className: 'status-atrasado',
                diffDays
            };
        } else if (diffDays <= 15) {
            return {
                key: 'proximo',
                label: 'PRÓXIMO',
                icon: '🟡',
                className: 'status-proximo',
                diffDays
            };
        } else {
            return {
                key: 'em_dia',
                label: 'EM DIA',
                icon: '🟢',
                className: 'status-em-dia',
                diffDays
            };
        }
    }

    /**
     * Exibe notificação Toast rápida
     */
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'danger') icon = '🗑️';
        if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        DOM.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // =========================================================================
    // RENDERIZAÇÃO
    // =========================================================================

    /**
     * Atualiza o Dashboard e os KPIs
     */
    function renderDashboard() {
        const pcs = StorageManager.getComputers();
        let total = pcs.length;
        let atrasados = 0;
        let proximos = 0;
        let emDia = 0;
        let pendentes = 0;

        // Lista enriquecida com status
        const enrichedList = pcs.map(pc => ({
            ...pc,
            statusObj: getComputerStatus(pc)
        }));

        enrichedList.forEach(item => {
            switch (item.statusObj.key) {
                case 'atrasado': atrasados++; break;
                case 'proximo': proximos++; break;
                case 'em_dia': emDia++; break;
                case 'pendente': pendentes++; break;
            }
        });

        // Atualizar contadores do Dashboard
        DOM.kpiTotal.textContent = total;
        DOM.kpiAtrasados.textContent = atrasados;
        DOM.kpiProximos.textContent = proximos;
        DOM.kpiEmDia.textContent = emDia;
        DOM.kpiPendentes.textContent = pendentes;

        // Atualizar contadores das pílulas de filtro
        DOM.countTodos.textContent = total;
        DOM.countAtrasados.textContent = atrasados;
        DOM.countProximos.textContent = proximos;
        DOM.countEmDia.textContent = emDia;
        DOM.countPendentes.textContent = pendentes;

        // Identificar o "PRÓXIMO PC A LIMPAR" (Mais urgente)
        // Ordem de prioridade: Atrasados (mais antigo primeiro) > Próximos (mais próximo primeiro) > Pendentes > Em Dia
        const sorted = [...enrichedList].sort((a, b) => {
            const priorityWeight = { atrasado: 1, proximo: 2, pendente: 3, em_dia: 4 };
            const weightA = priorityWeight[a.statusObj.key];
            const weightB = priorityWeight[b.statusObj.key];

            if (weightA !== weightB) {
                return weightA - weightB;
            }

            // Se ambos forem atrasados ou próximos, ordenar pela data da próxima limpeza
            if (a.proximaLimpeza && b.proximaLimpeza) {
                return a.proximaLimpeza.localeCompare(b.proximaLimpeza);
            }
            return 0;
        });

        const nextPc = sorted[0] || null;
        state.activeSpotlightPc = nextPc;

        if (nextPc) {
            DOM.spotlightNome.textContent = nextPc.nome;
            DOM.spotlightAtivo.textContent = nextPc.ativo || '-';
            DOM.spotlightSetor.textContent = nextPc.setor || '-';
            DOM.spotlightResponsavel.textContent = nextPc.responsavel || '-';
            DOM.spotlightData.textContent = formatDate(nextPc.proximaLimpeza);

            DOM.spotlightBadge.innerHTML = `
                <span class="status-badge ${nextPc.statusObj.className}">
                    ${nextPc.statusObj.icon} ${nextPc.statusObj.label}
                </span>
            `;

            // Borda colorida de alerta
            DOM.spotlightCard.classList.remove('warning-border', 'danger-border');
            if (nextPc.statusObj.key === 'atrasado') {
                DOM.spotlightCard.classList.add('danger-border');
            } else if (nextPc.statusObj.key === 'proximo') {
                DOM.spotlightCard.classList.add('warning-border');
            }

            DOM.spotlightBtnLimpar.style.display = 'inline-flex';
        } else {
            DOM.spotlightNome.textContent = 'Nenhum ativo cadastrado';
            DOM.spotlightAtivo.textContent = '-';
            DOM.spotlightSetor.textContent = '-';
            DOM.spotlightResponsavel.textContent = '-';
            DOM.spotlightData.textContent = '-';
            DOM.spotlightBadge.innerHTML = '';
            DOM.spotlightBtnLimpar.style.display = 'none';
        }
    }

    /**
     * Renderiza a Tabela de Computadores aplicando busca e filtros
     */
    function renderComputersTable() {
        const pcs = StorageManager.getComputers();
        const query = state.searchQuery.toLowerCase().trim();

        // 1. Filtrar por texto
        let filtered = pcs.filter(pc => {
            if (!query) return true;
            return (
                (pc.nome && pc.nome.toLowerCase().includes(query)) ||
                (pc.ip && pc.ip.toLowerCase().includes(query)) ||
                (pc.mac && pc.mac.toLowerCase().includes(query)) ||
                (pc.ativo && pc.ativo.toLowerCase().includes(query)) ||
                (pc.setor && pc.setor.toLowerCase().includes(query)) ||
                (pc.responsavel && pc.responsavel.toLowerCase().includes(query))
            );
        });

        // 2. Mapear status
        let enriched = filtered.map(pc => ({
            ...pc,
            statusObj: getComputerStatus(pc)
        }));

        // 3. Filtrar por pílula de status
        if (state.currentFilter !== 'todos') {
            enriched = enriched.filter(pc => pc.statusObj.key === state.currentFilter);
        }

        // 4. Renderizar linhas
        DOM.tbodyComputadores.innerHTML = '';

        if (enriched.length === 0) {
            DOM.tbodyComputadores.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <p>Nenhum computador encontrado com os filtros selecionados.</p>
                    </td>
                </tr>
            `;
            return;
        }

        enriched.forEach(pc => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <span class="pc-cell-title">${pc.nome}</span>
                </td>
                <td class="mono">${pc.ip || '-'}</td>
                <td class="mono">${pc.mac || '-'}</td>
                <td><span class="mono" style="font-weight: 600;">${pc.ativo || '-'}</span></td>
                <td>${pc.setor || '-'}</td>
                <td>${pc.responsavel || '-'}</td>
                <td>${formatDate(pc.ultimaLimpeza)}</td>
                <td><strong>${formatDate(pc.proximaLimpeza)}</strong></td>
                <td>
                    <span class="status-badge ${pc.statusObj.className}">
                        ${pc.statusObj.icon} ${pc.statusObj.label}
                    </span>
                </td>
                <td class="text-right">
                    <div class="table-actions" style="justify-content: flex-end;">
                        <button class="btn btn-sm btn-outline btn-editar-pc" data-id="${pc.id}">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-sm btn-success btn-limpar-pc" data-id="${pc.id}">
                            🧹 Limpar
                        </button>
                    </div>
                </td>
            `;
            DOM.tbodyComputadores.appendChild(tr);
        });
    }

    /**
     * Renderiza a Tabela do Histórico
     */
    function renderHistoryTable() {
        const history = StorageManager.getHistory();
        DOM.tbodyHistorico.innerHTML = '';

        if (history.length === 0) {
            DOM.tbodyHistorico.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <p>Nenhum registro de limpeza realizado até o momento.</p>
                    </td>
                </tr>
            `;
            return;
        }

        history.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${formatDate(item.data)}</strong></td>
                <td><span class="pc-cell-title">${item.pcNome || '-'}</span></td>
                <td><span class="mono">${item.ativo || '-'}</span></td>
                <td>${item.responsavel || '-'}</td>
                <td style="color: var(--text-secondary);">${item.observacao || '-'}</td>
            `;
            DOM.tbodyHistorico.appendChild(tr);
        });
    }

    /**
     * Atualiza toda a interface
     */
    function updateAllViews() {
        renderDashboard();
        renderComputersTable();
        renderHistoryTable();
    }

    // =========================================================================
    // GERENCIAMENTO DE ABAS & NAVEGAÇÃO
    // =========================================================================

    function switchTab(tabId) {
        state.currentTab = tabId;

        DOM.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        DOM.tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabId}`);
        });

        updateAllViews();
    }

    DOM.navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // =========================================================================
    // MODAIS: ABERTURA E FECHAMENTO
    // =========================================================================

    function openModal(modalElement) {
        modalElement.classList.add('active');
        modalElement.setAttribute('aria-hidden', 'false');
    }

    function closeModal(modalElement) {
        modalElement.classList.remove('active');
        modalElement.setAttribute('aria-hidden', 'true');
    }

    // Fechar modais ao clicar em botões de fechar ou backdrop
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close-modal');
            const target = document.getElementById(modalId);
            if (target) closeModal(target);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
    });

    // =========================================================================
    // MODAL COMPUTADOR: CADASTRO / EDIÇÃO / EXCLUSÃO
    // =========================================================================

    function openAddComputerModal() {
        DOM.formPc.reset();
        document.getElementById('pc-id').value = '';
        DOM.modalPcTitle.textContent = 'Cadastrar Computador';
        DOM.btnExcluirPc.style.display = 'none';
        openModal(DOM.modalPc);
    }

    function openEditComputerModal(pcId) {
        const pc = StorageManager.getComputerById(pcId);
        if (!pc) return;

        document.getElementById('pc-id').value = pc.id;
        document.getElementById('pc-nome').value = pc.nome || '';
        document.getElementById('pc-ativo').value = pc.ativo || '';
        document.getElementById('pc-ip').value = pc.ip || '';
        document.getElementById('pc-mac').value = pc.mac || '';
        document.getElementById('pc-setor').value = pc.setor || '';
        document.getElementById('pc-responsavel').value = pc.responsavel || '';
        document.getElementById('pc-ultima-limpeza').value = pc.ultimaLimpeza || '';
        document.getElementById('pc-proxima-limpeza').value = pc.proximaLimpeza || '';

        DOM.modalPcTitle.textContent = `Editar Computador: ${pc.nome}`;
        DOM.btnExcluirPc.style.display = 'inline-flex';
        openModal(DOM.modalPc);
    }

    DOM.btnNovoPcHeader.addEventListener('click', () => {
        openAddComputerModal();
    });

    DOM.btnNovoPc.addEventListener('click', () => {
        openAddComputerModal();
    });

    DOM.formPc.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('pc-id').value;
        const pcData = {
            nome: document.getElementById('pc-nome').value.trim(),
            ativo: document.getElementById('pc-ativo').value.trim(),
            ip: document.getElementById('pc-ip').value.trim(),
            mac: document.getElementById('pc-mac').value.trim(),
            setor: document.getElementById('pc-setor').value.trim(),
            responsavel: document.getElementById('pc-responsavel').value.trim(),
            ultimaLimpeza: document.getElementById('pc-ultima-limpeza').value,
            proximaLimpeza: document.getElementById('pc-proxima-limpeza').value
        };

        if (id) {
            StorageManager.updateComputer(id, pcData);
            showToast(`Computador "${pcData.nome}" atualizado com sucesso!`, 'success');
        } else {
            StorageManager.addComputer(pcData);
            showToast(`Computador "${pcData.nome}" cadastrado com sucesso!`, 'success');
        }

        closeModal(DOM.modalPc);
        updateAllViews();
    });

    DOM.btnExcluirPc.addEventListener('click', () => {
        const id = document.getElementById('pc-id').value;
        const pc = StorageManager.getComputerById(id);
        if (!pc) return;

        if (confirm(`Tem certeza que deseja excluir o computador "${pc.nome}" (${pc.ativo})?`)) {
            StorageManager.deleteComputer(id);
            showToast(`Computador "${pc.nome}" excluído.`, 'danger');
            closeModal(DOM.modalPc);
            updateAllViews();
        }
    });

    // =========================================================================
    // MODAL REGISTRAR LIMPEZA
    // =========================================================================

    function openCleaningModal(pcId) {
        const pc = StorageManager.getComputerById(pcId);
        if (!pc) return;

        DOM.limpezaPcId.value = pc.id;
        DOM.limpezaPcNome.textContent = pc.nome;
        DOM.limpezaPcAtivo.textContent = pc.ativo || 'Não informado';
        DOM.limpezaPcSetor.textContent = pc.setor || 'Não informado';

        const today = getTodayIso();
        DOM.limpezaData.value = today;
        DOM.limpezaResponsavel.value = '';
        DOM.limpezaObs.value = 'Limpeza interna, coolers despoeirados e higienização geral.';

        // Próxima limpeza padrão: +6 meses a partir de hoje
        DOM.limpezaProxima.value = addMonths(today, 6);

        openModal(DOM.modalLimpeza);
    }

    // Botões de prazo rápido (+3 meses, +6 meses, +1 ano)
    document.querySelectorAll('[data-add-months]').forEach(btn => {
        btn.addEventListener('click', () => {
            const months = btn.getAttribute('data-add-months');
            const dataBase = DOM.limpezaData.value || getTodayIso();
            DOM.limpezaProxima.value = addMonths(dataBase, months);
        });
    });

    // Atualizar próxima data se o usuário mudar a data da limpeza
    DOM.limpezaData.addEventListener('change', () => {
        const dataBase = DOM.limpezaData.value;
        if (dataBase) {
            DOM.limpezaProxima.value = addMonths(dataBase, 6);
        }
    });

    DOM.formLimpeza.addEventListener('submit', (e) => {
        e.preventDefault();

        const pcId = DOM.limpezaPcId.value;
        const details = {
            dataLimpeza: DOM.limpezaData.value,
            proximaLimpeza: DOM.limpezaProxima.value,
            responsavel: DOM.limpezaResponsavel.value.trim(),
            observacao: DOM.limpezaObs.value.trim()
        };

        const success = StorageManager.registerCleaning(pcId, details);
        if (success) {
            const pc = StorageManager.getComputerById(pcId);
            showToast(`Limpeza registrada para "${pc.nome}"!`, 'success');
            closeModal(DOM.modalLimpeza);
            updateAllViews();
        }
    });

    // Botão de Limpeza do Card Spotlight
    DOM.spotlightBtnLimpar.addEventListener('click', () => {
        if (state.activeSpotlightPc) {
            openCleaningModal(state.activeSpotlightPc.id);
        }
    });

    // Delegação de eventos na tabela de computadores (Editar e Limpar)
    DOM.tbodyComputadores.addEventListener('click', (e) => {
        const btnEditar = e.target.closest('.btn-editar-pc');
        if (btnEditar) {
            const id = btnEditar.getAttribute('data-id');
            openEditComputerModal(id);
            return;
        }

        const btnLimpar = e.target.closest('.btn-limpar-pc');
        if (btnLimpar) {
            const id = btnLimpar.getAttribute('data-id');
            openCleaningModal(id);
            return;
        }
    });

    // =========================================================================
    // FILTROS E PESQUISA
    // =========================================================================

    DOM.inputPesquisa.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderComputersTable();
    });

    DOM.filterPills.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.filterPills.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            state.currentFilter = btn.getAttribute('data-filter');
            renderComputersTable();
        });
    });

    // =========================================================================
    // RESTAURAR DADOS DE EXEMPLO
    // =========================================================================

    DOM.btnRestaurarDados.addEventListener('click', () => {
        if (confirm('Deseja restaurar os dados de exemplo padrão? Todas as alterações atuais serão resetadas.')) {
            StorageManager.resetToDefaultData();
            showToast('Dados de exemplo restaurados!', 'info');
            updateAllViews();
        }
    });

    // 4. Inicialização inicial da interface
    updateAllViews();
});
