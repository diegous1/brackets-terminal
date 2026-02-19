/*eslint strict:0 */
(function () {
    'use strict';

    var os = require('os');
    var pty;
    var domainManager;
    var terminals = {};
    var terminalSequence = 0;

    try {
        pty = require('node-pty');
    } catch (error) {
        pty = null;
    }

    function ensurePtyDependency() {
        if (!pty) {
            throw new Error('Dependência node-pty ausente. Execute npm install na pasta node/ da extensão.');
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

    function emitTerminalEvent(eventName, payload) {
        if (!domainManager) {
            return;
        }

        domainManager.emitEvent('bracketsTerminal', eventName, [payload]);
    }

    function trackTerminal(id, term) {
        terminals[id] = term;

        if (typeof term.onData === 'function') {
            term.onData(function (data) {
                emitTerminalEvent('terminalData', {
                    id: id,
                    data: data
                });
            });
        } else {
            term.on('data', function (data) {
                emitTerminalEvent('terminalData', {
                    id: id,
                    data: data
                });
            });
        }

        if (typeof term.onExit === 'function') {
            term.onExit(function (exit) {
                delete terminals[id];
                emitTerminalEvent('terminalExit', {
                    id: id,
                    exitCode: exit.exitCode,
                    signal: exit.signal
                });
            });
        } else {
            term.on('exit', function (code, signal) {
                delete terminals[id];
                emitTerminalEvent('terminalExit', {
                    id: id,
                    exitCode: code,
                    signal: signal
                });
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
        terminal = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: cols,
            rows: rows,
            cwd: cwd,
            env: process.env
        });

        trackTerminal(terminalId, terminal);

        return {
            id: terminalId,
            cols: cols,
            rows: rows,
            cwd: cwd,
            shell: shell
        };
    }

    function writeTerminal(terminalId, data) {
        if (!terminals[terminalId]) {
            return false;
        }

        terminals[terminalId].write(String(data || ''));
        return true;
    }

    function resizeTerminal(terminalId, cols, rows) {
        if (!terminals[terminalId]) {
            return false;
        }

        terminals[terminalId].resize(normalizeDimension(cols, 80), normalizeDimension(rows, 24));
        return true;
    }

    function killTerminal(terminalId) {
        if (!terminals[terminalId]) {
            return false;
        }

        terminals[terminalId].kill();
        delete terminals[terminalId];
        return true;
    }

    function disposeAll() {
        Object.keys(terminals).forEach(function (terminalId) {
            try {
                terminals[terminalId].kill();
            } catch (error) {
                emitTerminalEvent('terminalError', {
                    id: terminalId,
                    message: error.message
                });
            }
        });

        terminals = {};
        return true;
    }

    function listShells() {
        var shells = [getDefaultShell()];

        if (process.platform !== 'win32') {
            shells.push('/bin/zsh');
            shells.push('/bin/bash');
            shells.push('/bin/sh');
        }

        return shells;
    }

    function healthCheck() {
        return {
            ok: true,
            platform: process.platform,
            arch: process.arch,
            hostname: os.hostname()
        };
    }

    function init(DomainManager) {
        domainManager = DomainManager;

        if (!domainManager.hasDomain('bracketsTerminal')) {
            domainManager.registerDomain('bracketsTerminal', {
                major: 0,
                minor: 1
            });
        }

        domainManager.registerEvent('bracketsTerminal', 'terminalData', [
            {
                name: 'payload',
                type: 'object'
            }
        ]);

        domainManager.registerEvent('bracketsTerminal', 'terminalExit', [
            {
                name: 'payload',
                type: 'object'
            }
        ]);

        domainManager.registerEvent('bracketsTerminal', 'terminalError', [
            {
                name: 'payload',
                type: 'object'
            }
        ]);

        domainManager.registerCommand('bracketsTerminal', 'healthCheck', healthCheck, false);
        domainManager.registerCommand('bracketsTerminal', 'createTerminal', createTerminal, false);
        domainManager.registerCommand('bracketsTerminal', 'writeTerminal', writeTerminal, false);
        domainManager.registerCommand('bracketsTerminal', 'resizeTerminal', resizeTerminal, false);
        domainManager.registerCommand('bracketsTerminal', 'killTerminal', killTerminal, false);
        domainManager.registerCommand('bracketsTerminal', 'disposeAll', disposeAll, false);
        domainManager.registerCommand('bracketsTerminal', 'listShells', listShells, false);
    }

    exports.init = init;
}());
