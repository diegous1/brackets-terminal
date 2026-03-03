define(function (require, exports, module) {
    'use strict';

    var CommandManager = brackets.getModule('command/CommandManager'),
        Menus = brackets.getModule('command/Menus'),
        AppInit = brackets.getModule('utils/AppInit'),
        ExtensionUtils = brackets.getModule('utils/ExtensionUtils'),

        settings = require('src/settings'),
        panel = require('src/panel')(),
        toolbarManager = require('src/toolbarManager'),
        terminalManager = require('src/terminal')(),
        shortcut = require('src/shortcut')(terminalManager.command.bind(terminalManager));

    var TERMINAL_COMMAND_ID = 'artoale.terminal.open';
    var TERMINAL_SETTINGS_COMMAND_ID = 'artoale.terminal.settings';

    var openTerminalCommand = null;
    var currentTerminal = null;
    var isConnecting = false;

    function isPhoenixNativeApp() {
        return Boolean(window.phoenix && window.phoenix.app && window.phoenix.app.isNativeApp);
    }

    function buildRemoteUrl(host, port) {
        var hasProtocol = /^https?:\/\//i.test(host);
        var protocol = window.location.protocol === 'https:' ? 'https://' : 'http://';

        if (hasProtocol) {
            return host;
        }

        return protocol + host + ':' + port;
    }

    function getConnectionOptions() {
        var backendMode = settings.get('backendMode');
        var host = settings.get('host');
        var port = settings.get('port');

        return {
            backendMode: backendMode,
            webFallbackEnabled: settings.get('webFallbackEnabled'),
            connectTimeoutMs: settings.get('connectTimeoutMs'),
            url: buildRemoteUrl(host, port)
        };
    }

    function createNewTerminal(terminalId) {
        var $terminal = panel.addTab(terminalId);
        terminalManager.open($terminal.get()[0], terminalId);
        $('.terminal').css('font-size', settings.get('fontSize') + 'px');
    }

    function resize() {
        terminalManager.handleResize(panel.$panel, currentTerminal);
    }

    function addToFontSize(amount) {
        var $terminal = $('.terminal');
        var fontSize = parseInt($terminal.css('font-size'), 10);

        fontSize = Math.max(fontSize + amount, 1);
        settings.set('fontSize', fontSize);
        $terminal.css('font-size', fontSize + 'px');
        resize();
    }

    function initializeConnection() {
        if (isConnecting) {
            console.warn('[BracketsTerminal] Já está conectando. Ignorando.');
            return;
        }

        isConnecting = true;
        console.log('[BracketsTerminal] Iniciando conexão...');
        toolbarManager.setStatus(toolbarManager.NOT_CONNECTED);
        terminalManager.clear();

        terminalManager.startConnection(getConnectionOptions())
            .done(function () {
                isConnecting = false;
                console.log('[BracketsTerminal] Conexão bem-sucedida.');
            })
            .fail(function (error) {
                isConnecting = false;
                toolbarManager.setStatus(toolbarManager.ERROR);
                console.error('[BracketsTerminal] Falha ao conectar:', error);

                // show explanatory dialog to end user
                var Dialogs = brackets.getModule('widgets/Dialogs');
                var DefaultDialogs = brackets.getModule('widgets/DefaultDialogs');
                var opts = getConnectionOptions();
                var msg = 'Não foi possível conectar ao backend do terminal.';
                if (!opts.url) {
                    msg += ' Nenhum endereço de servidor remoto especificado.';
                } else {
                    msg += ' Verifique se um servidor tty.js está acessível em ' + opts.url + ' ou se você está executando no Phoenix Desktop.';
                }
                Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR, 'Erro no Terminal', msg);
            });
    }

    function hidePanel() {
        panel.toggle('close');
        openTerminalCommand.setChecked(false);
        terminalManager.blur(currentTerminal);

        if (toolbarManager.status === toolbarManager.ACTIVE || toolbarManager.status === toolbarManager.CONNECTED) {
            toolbarManager.setStatus(toolbarManager.NOT_ACTIVE);
        }
    }

    function showPanel() {
        panel.toggle('show');
        openTerminalCommand.setChecked(true);
        if (currentTerminal) {
            terminalManager.focus(currentTerminal);
        }

        if (toolbarManager.status !== toolbarManager.NOT_RUNNING && toolbarManager.status !== toolbarManager.ERROR) {
            toolbarManager.setStatus(toolbarManager.ACTIVE);
        }
    }

    function handleAction(keepActive) {
        if (toolbarManager.status === toolbarManager.ACTIVE && !keepActive) {
            hidePanel();
            return;
        }

        if (toolbarManager.status === toolbarManager.NOT_ACTIVE) {
            showPanel();
            return;
        }

        if (toolbarManager.status === toolbarManager.NOT_RUNNING ||
                toolbarManager.status === toolbarManager.NOT_CONNECTED ||
                toolbarManager.status === toolbarManager.ERROR) {
            showPanel();
            initializeConnection();
        }

        if (keepActive && currentTerminal) {
            terminalManager.focus(currentTerminal);
        }
    }

    AppInit.htmlReady(function () {
        ExtensionUtils.loadStyleSheet(module, 'terminal.css');
        // load dialogs module early for error reporting
        brackets.getModule('widgets/Dialogs');
        brackets.getModule('widgets/DefaultDialogs');

        openTerminalCommand = CommandManager.register('Show terminal', TERMINAL_COMMAND_ID, function () {
            handleAction(false);
        });

        CommandManager.register('Brackets terminal settings', TERMINAL_SETTINGS_COMMAND_ID, function () {
            settings.showDialog();
        });

        panel.init();

        $(panel).on('resize', resize);

        $(panel).on('active-tab', function (evt, terminalId) {
            currentTerminal = terminalId;
            resize();
            terminalManager.focus(currentTerminal);
        });

        $(panel).on('shown', function () {
            openTerminalCommand.setChecked(true);
            if (!currentTerminal) {
                panel.$panel.find('.tab-header').first().click();
            }
        });

        $(panel).on('hidden', function () {
            openTerminalCommand.setChecked(false);
        });

        $(panel).on('close', function () {
            hidePanel();
        });

        $(panel).on('close-tab', function (evt, terminalId) {
            terminalManager.destroy(terminalId);
        });

        $(panel).on('close-last', function () {
            currentTerminal = null;
            toolbarManager.setStatus(toolbarManager.NOT_RUNNING);
        });

        $(panel).on('command', function (evt, command) {
            if (command && typeof shortcut[command] === 'function' && currentTerminal) {
                shortcut[command](currentTerminal);
                return;
            }

            if (command === 'font-plus') {
                addToFontSize(1);
                return;
            }

            if (command === 'font-minus') {
                addToFontSize(-1);
                return;
            }

            if (command === 'new-terminal') {
                console.log('[BracketsTerminal] Criando novo terminal...');
                console.log('[BracketsTerminal] Estado do terminalManager:', {
                    temTransport: !!terminalManager.transport,
                    transporte: terminalManager.transport ? 'existe' : 'nulo',
                    estáConectado: terminalManager.transport ? terminalManager.transport.isConnected() : 'N/A',
                    terminaisAtivos: Object.keys(terminalManager.terminals || {}).length,
                    estaConectando: isConnecting
                });
                try {
                    terminalManager.createTerminal();
                } catch (error) {
                    console.error('[BracketsTerminal] Erro ao criar terminal:', error);
                    toolbarManager.setStatus(toolbarManager.ERROR);
                }
                return;
            }
        });

        $(terminalManager).on('created', function (evt, id) {
            createNewTerminal(id);
            terminalManager.focus(id);
            toolbarManager.setStatus(toolbarManager.ACTIVE);
        });

        $(terminalManager).on('title', function (evt, terminalId, title) {
            if (terminalId && title) {
                var tabId = String(terminalId).replace(/\//g, '-');
                panel.setTabTitle(tabId, title);
            }
        });

        $(terminalManager).on('connected', function () {
            toolbarManager.setStatus(toolbarManager.CONNECTED);
            if (!Object.keys(terminalManager.terminals).length) {
                terminalManager.createTerminal();
            }
        });

        $(terminalManager).on('disconnected', function () {
            toolbarManager.setStatus(toolbarManager.ERROR);
            console.error('Terminal desconectado inesperadamente.');
        });

        $(terminalManager).on('notConnected', function (evt, message) {
            toolbarManager.setStatus(toolbarManager.ERROR);
            console.error(message || 'Não foi possível conectar ao terminal.');
        });

        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuDivider();
        menu.addMenuItem(TERMINAL_COMMAND_ID, [{key: 'Ctrl-Alt-T', platform: 'win'},
            {key: 'Cmd-Alt-T', platform: 'mac'},
            {key: 'Ctrl-Alt-T', platform: 'linux'}]);
        menu.addMenuItem(TERMINAL_SETTINGS_COMMAND_ID);

        toolbarManager.init($('#main-toolbar .buttons'));
        $(toolbarManager).on('click', function () {
            handleAction(true);
        });

        toolbarManager.setStatus(toolbarManager.NOT_RUNNING);

        if (isPhoenixNativeApp()) {
            console.log('[BracketsTerminal] ✓ Phoenix Desktop detectado - backend local disponível (node-pty).');
        } else {
            console.log('[BracketsTerminal] ⚠ Phoenix Web ou navegador detectado - fallback para tty.js remoto.');
        }
    });
});
