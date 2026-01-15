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
    var serverCheckAttempts = 0;
    var MAX_SERVER_CHECK_ATTEMPTS = 3;

    // Detect if running in Phoenix Code
    function isPhoenixCode() {
        return (typeof Phoenix !== 'undefined' || window.Phoenix);
    }

    var createNewTerminal = function (terminalId) {
        var $terminal = panel.addTab(terminalId);
        terminalManager.open($terminal.get()[0], terminalId);
        $('.terminal').css('font-size', settings.get('fontSize') + 'px');
    };

    function resize() {
        terminalManager.handleResize(panel.$panel, currentTerminal);
    }

    function addToFontSize(amount) {
        var $terminal = $('.terminal'),
            fontsize = parseInt($terminal.css('font-size'), 10);
        fontsize = Math.max(fontsize + amount, 1);
        settings.set('fontSize', fontsize);
        $terminal.css('font-size', fontsize + 'px');
        resize();
    }

    function checkTtyServer(callback) {
        var serverUrl = 'http://localhost:' + settings.get('port');
        
        $.ajax({
            url: serverUrl + '/terminals',
            type: 'GET',
            timeout: 3000,
            success: function() {
                serverCheckAttempts = 0;
                if (callback) callback(true);
            },
            error: function(xhr, status, error) {
                serverCheckAttempts++;
                console.error('Terminal server connection error:', error);
                
                if (serverCheckAttempts >= MAX_SERVER_CHECK_ATTEMPTS) {
                    toolbarManager.setStatus(toolbarManager.ERROR);
                    var message = isPhoenixCode() ? 
                        'Terminal server não está rodando. Instale o tty.js globalmente com: npm install -g tty.js' :
                        'Terminal server is not running. Install tty.js globally: npm install -g tty.js';
                    console.error(message);
                    if (callback) callback(false);
                } else {
                    setTimeout(function() {
                        checkTtyServer(callback);
                    }, 2000);
                }
            }
        });
    }

    function init() {
        toolbarManager.setStatus(toolbarManager.NOT_RUNNING);
        terminalManager.clear();
        
        // Check if server is available before attempting connection
        checkTtyServer(function(success) {
            if (success) {
                terminalManager.startConnection('http://localhost:' + settings.get('port'));
                toolbarManager.setStatus(toolbarManager.ACTIVE);
            } else {
                console.error('Failed to connect to terminal server after ' + MAX_SERVER_CHECK_ATTEMPTS + ' attempts');
            }
        });

        $(panel).on('close', function () {
            handleAction();
        });

        $(panel).on('command', function (evt, command) {
            if (command && typeof shortcut[command] === 'function' && currentTerminal) {
                shortcut[command](currentTerminal);
                return;
            }

            var action = command;
            if (action && action === 'font-plus') {
                addToFontSize(1);
            } else if (action && action === 'font-minus') {
                addToFontSize(-1);
            } else if (action && action === 'new-terminal') {
                // Fix for issue #43: Check if terminal is already being created
                if (!terminalManager.isCreating) {
                    terminalManager.createTerminal();
                }
            }
        });
    }

    function handleAction(keepActive) {
        if (toolbarManager.status === toolbarManager.NOT_RUNNING) {
            panel.toggle();
            toolbarManager.setStatus(toolbarManager.NOT_ACTIVE);
            terminalManager.blur(currentTerminal);
        } else if (toolbarManager.status === toolbarManager.NOT_ACTIVE) {
            panel.toggle();
            //  resize(currentTerminal);
            terminalManager.focus(currentTerminal);
            toolbarManager.setStatus(toolbarManager.ACTIVE);
        } else if (toolbarManager.status === toolbarManager.NOT_CONNECTED || toolbarManager.status === toolbarManager.NOT_RUNNING) {
            init();
        } else if (toolbarManager.status === toolbarManager.CONNECTED) {
            //          console.log('CONNECTED ACTION');
            terminalManager.createTerminal();
        } else if (toolbarManager.status === toolbarManager.ERROR) {
            //          console.log('ERROR ACTION');
            //Nulla da fare, siamo nella cacca
        }

        if (keepActive) {
            terminalManager.focus(currentTerminal);
        }
    }

    var first = true;
    var killed = false;

    AppInit.htmlReady(function () {
        ExtensionUtils.loadStyleSheet(module, 'terminal.css');

        openTerminalCommand = CommandManager.register('Show terminal', TERMINAL_COMMAND_ID, function () {
            handleAction();
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

        $(panel).on('close-tab', function (evt, terminalId) {
            terminalManager.destroy(terminalId);
        });

        $(panel).on('close-last', function () {
            currentTerminal = null;
            toolbarManager.setStatus(toolbarManager.NOT_RUNNING);
        });

        $(terminalManager).on('new', function (evt, id) {
            createNewTerminal(id);
            terminalManager.focus(id);
        });

        $(terminalManager).on('connected', function () {
            toolbarManager.setStatus(toolbarManager.CONNECTED);
            terminalManager.createTerminal();
            first = false;
        });

        $(terminalManager).on('disconnected', function () {
            if (killed) {
                return;
            }
            toolbarManager.setStatus(toolbarManager.ERROR);
            console.error('Terminal disconnected unexpectedly');
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

        // Display Phoenix Code compatibility message
        if (isPhoenixCode()) {
            console.log('Brackets Terminal running on Phoenix Code - fully compatible');
        }
    });

    AppInit.appReady(function () {
        // Auto-init removed to prevent premature connection attempts
    });
});
