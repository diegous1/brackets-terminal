/*eslint strict:0 */
(function () {
    'use strict';

    var os = require('os');
    var pty;
    var nodeConnector;
    var terminals = {};
    var terminalSequence = 0;

    // Phoenix Code NodeConnector ID
    var TERMINAL_NODE_CONNECTOR_ID = 'brackets-terminal';

    try {
        pty = require('node-pty');
    } catch (error) {
        pty = null;
        console.error('[Terminal Backend] Warning: node-pty dependency not found. Run npm install in node/ folder.');
    }

    function ensurePtyDependency() {
        if (!pty) {
            throw new Error('[Terminal Backend] Dependência node-pty ausente. Execute npm install na pasta node/ da extensão.');
        }
    }

    function normalizeDimension(value, fallback) {
        var parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue) || parsedValue <= 0) {
            return fallback;
        }
        return parsedValue;
    }

    function getDefaultShell() {
        if (process.platform === 'win32') {
            return process.env.ComSpec || 'powershell.exe';
        }

        return process.env.SHELL || '/bin/bash';
    }

    function triggerTerminalEvent(eventName, payload) {
        if (!nodeConnector) {
            console.error('[Terminal Backend] NodeConnector não inicializado. Evento perdido:', eventName);
            return;
        }

        console.debug('[Terminal Backend Event]', eventName, payload);
        nodeConnector.triggerPeer('terminal' + eventName.charAt(0).toUpperCase() + eventName.slice(1), payload);
    }

    function trackTerminal(id, term) {
        terminals[id] = term;
        console.log('[Terminal Backend] Terminal criado:', id);

        if (typeof term.onData === 'function') {
            term.onData(function (data) {
                triggerTerminalEvent('Data', {
                    id: id,
                    data: data
                });
            });
        } else {
            term.on('data', function (data) {
                triggerTerminalEvent('Data', {
                    id: id,
                    data: data
                });
            });
        }

        if (typeof term.onExit === 'function') {
            term.onExit(function (exit) {
                delete terminals[id];
                triggerTerminalEvent('Exit', {
                    id: id,
                    exitCode: exit.exitCode,
                    signal: exit.signal
                });
                console.log('[Terminal Backend] Terminal finalizado:', id);
            });
        } else {
            term.on('exit', function (code, signal) {
                delete terminals[id];
                triggerTerminalEvent('Exit', {
                    id: id,
                    exitCode: code,
                    signal: signal
                });
                console.log('[Terminal Backend] Terminal finalizado:', id);
            });
        }
    }

    function createTerminal(cols, rows, cwd, shell) {
        var terminal;
        var terminalId;

        ensurePtyDependency();

        cols = normalizeDimension(cols, 80);
        rows = normalizeDimension(rows, 24);
        cwd = (typeof cwd === 'string' && cwd) ? cwd : process.cwd();
        shell = (typeof shell === 'string' && shell) ? shell : getDefaultShell();

        terminalId = 'local-' + (++terminalSequence);
        
        try {
            terminal = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: cols,
                rows: rows,
                cwd: cwd,
                env: process.env
            });
        } catch (error) {
            console.error('[Terminal Backend] Erro ao spawnear terminal:', error);
            throw error;
        }

        trackTerminal(terminalId, terminal);

        return {
            id: terminalId,
            cols: cols,
            rows: rows,
            cwd: cwd,
            shell: shell
        };
    }

    async function writeTerminal(payload) {
        var terminalId = payload.id;
        var data = payload.data;
        
        if (!terminals[terminalId]) {
            console.warn('[Terminal Backend] Terminal não encontrado:', terminalId);
            return false;
        }

        try {
            terminals[terminalId].write(String(data || ''));
            return true;
        } catch (error) {
            console.error('[Terminal Backend] Erro ao escrever no terminal:', error);
            return false;
        }
    }

    async function resizeTerminal(payload) {
        var terminalId = payload.id;
        var cols = payload.cols;
        var rows = payload.rows;
        
        if (!terminals[terminalId]) {
            console.warn('[Terminal Backend] Terminal não encontrado:', terminalId);
            return false;
        }

        try {
            terminals[terminalId].resize(normalizeDimension(cols, 80), normalizeDimension(rows, 24));
            return true;
        } catch (error) {
            console.error('[Terminal Backend] Erro ao redimensionar terminal:', error);
            return false;
        }
    }

    async function killTerminal(payload) {
        var terminalId = payload.id;
        
        if (!terminals[terminalId]) {
            console.warn('[Terminal Backend] Terminal não encontrado:', terminalId);
            return false;
        }

        try {
            terminals[terminalId].kill();
            delete terminals[terminalId];
            console.log('[Terminal Backend] Terminal finalizado:', terminalId);
            return true;
        } catch (error) {
            console.error('[Terminal Backend] Erro ao finalizar terminal:', error);
            return false;
        }
    }

    async function disposeAll() {
        console.log('[Terminal Backend] Finalizando todos os terminais...');
        
        Object.keys(terminals).forEach(function (terminalId) {
            try {
                terminals[terminalId].kill();
            } catch (error) {
                console.error('[Terminal Backend] Erro ao finalizar terminal:', terminalId, error.message);
                triggerTerminalEvent('Error', {
                    id: terminalId,
                    message: error.message
                });
            }
        });

        terminals = {};
        console.log('[Terminal Backend] Todos os terminais finalizados.');
        return true;
    }

    async function listShells() {
        var shells = [getDefaultShell()];

        if (process.platform !== 'win32') {
            shells.push('/bin/zsh');
            shells.push('/bin/bash');
            shells.push('/bin/sh');
        }

        return shells;
    }

    async function healthCheck() {
        console.log('[Terminal Backend] Health check realizado.');
        return {
            ok: true,
            platform: process.platform,
            arch: process.arch,
            hostname: os.hostname()
        };
    }

    // Exportar para Phoenix Code
    // Estas funções serão chamadas por el frontend via NodeConnector.execPeer()
    module.exports = {
        healthCheck: healthCheck,
        createTerminal: createTerminal,
        writeTerminal: writeTerminal,
        resizeTerminal: resizeTerminal,
        killTerminal: killTerminal,
        disposeAll: disposeAll,
        listShells: listShells
    };

    // Inicializar NodeConnector quando disponível, com retry caso ainda não esteja pronto
    function initNodeConnector() {
        try {
            console.log('[Terminal Backend] Inicializando NodeConnector com ID:', TERMINAL_NODE_CONNECTOR_ID);
            nodeConnector = global.createNodeConnector(TERMINAL_NODE_CONNECTOR_ID, module.exports);
            console.log('[Terminal Backend] NodeConnector inicializado com sucesso.');
        } catch (error) {
            console.error('[Terminal Backend] Erro ao inicializar NodeConnector:', error);
        }
    }

    if (global && typeof global.createNodeConnector === 'function') {
        initNodeConnector();
    } else {
        var _initAttempts = 0;
        var _retryInterval = setInterval(function () {
            _initAttempts++;
            if (global && typeof global.createNodeConnector === 'function') {
                clearInterval(_retryInterval);
                initNodeConnector();
            } else if (_initAttempts >= 20) {
                clearInterval(_retryInterval);
                console.error('[Terminal Backend] global.createNodeConnector não ficou disponível após 10s. Backend não iniciado.');
            }
        }, 500);
    }
}());
