/**
 * storage.js
 * Gerenciamento dos dados usando localStorage
 */

const STORAGE_KEYS = {
    COMPUTERS: 'limpeza_preventiva_pcs',
    HISTORY: 'limpeza_preventiva_historico'
};

const StorageManager = {

    // =========================================================
    // INICIALIZAÇÃO
    // =========================================================

    init() {
        /*
         * Se já existirem dados antigos no navegador,
         * eles serão substituídos pelos dados do data.js.
         *
         * Isso é importante agora porque estamos trocando
         * os dados fictícios pelos dados reais da planilha.
         */

        this.saveComputers(initialComputers);
        this.saveHistory(initialHistory);
    },


    // =========================================================
    // COMPUTADORES
    // =========================================================

    getComputers() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.COMPUTERS);

            return data ? JSON.parse(data) : [];

        } catch (error) {
            console.error(
                'Erro ao ler computadores do localStorage:',
                error
            );

            return [];
        }
    },


    saveComputers(computers) {
        try {
            localStorage.setItem(
                STORAGE_KEYS.COMPUTERS,
                JSON.stringify(computers)
            );

        } catch (error) {
            console.error(
                'Erro ao salvar computadores:',
                error
            );
        }
    },


    getComputerById(id) {
        const computers = this.getComputers();

        return computers.find(
            computer => computer.id === id
        ) || null;
    },


    addComputer(computerData) {

        const computers = this.getComputers();

        const newComputer = {
            ...computerData,
            id: 'pc-' + Date.now()
        };

        computers.push(newComputer);

        this.saveComputers(computers);

        return newComputer;
    },


    updateComputer(id, updatedData) {

        const computers = this.getComputers();

        const index = computers.findIndex(
            computer => computer.id === id
        );

        if (index === -1) {
            return false;
        }

        computers[index] = {
            ...computers[index],
            ...updatedData,
            id: id
        };

        this.saveComputers(computers);

        return true;
    },


    deleteComputer(id) {

        const computers = this.getComputers();

        const filteredComputers = computers.filter(
            computer => computer.id !== id
        );

        this.saveComputers(filteredComputers);

        return true;
    },


    // =========================================================
    // HISTÓRICO
    // =========================================================

    getHistory() {

        try {

            const data = localStorage.getItem(
                STORAGE_KEYS.HISTORY
            );

            return data ? JSON.parse(data) : [];

        } catch (error) {

            console.error(
                'Erro ao ler histórico:',
                error
            );

            return [];
        }
    },


    saveHistory(history) {

        try {

            localStorage.setItem(
                STORAGE_KEYS.HISTORY,
                JSON.stringify(history)
            );

        } catch (error) {

            console.error(
                'Erro ao salvar histórico:',
                error
            );
        }
    },


    addHistoryRecord(record) {

        const history = this.getHistory();

        const newRecord = {
            ...record,
            id: 'hist-' + Date.now()
        };

        history.unshift(newRecord);

        this.saveHistory(history);

        return newRecord;
    },


    // =========================================================
    // REGISTRAR LIMPEZA
    // =========================================================

    registerCleaning(pcId, details) {

        const pc = this.getComputerById(pcId);

        if (!pc) {
            return false;
        }

        // Atualiza as datas do computador
        this.updateComputer(pcId, {

            ultimaLimpeza: details.dataLimpeza,

            proximaLimpeza: details.proximaLimpeza

        });


        // Registra no histórico
        this.addHistoryRecord({

            pcId: pc.id,

            pcNome: pc.nome,

            ativo: pc.ativo,

            data: details.dataLimpeza,

            responsavel:
                details.responsavel || 'Não informado',

            observacao:
                details.observacao ||
                'Limpeza preventiva periódica.'

        });


        return true;
    },


    // =========================================================
    // RESTAURAR DADOS DO DATA.JS
    // =========================================================

    resetToDefaultData() {

        localStorage.removeItem(
            STORAGE_KEYS.COMPUTERS
        );

        localStorage.removeItem(
            STORAGE_KEYS.HISTORY
        );

        this.init();
    }

};