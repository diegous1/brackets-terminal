/*jshint devel:true */
define(function (require, exports, module) {
    'use strict';

    var Terminal = require('vendor/tty'),
        createLocalNodeTransport = require('src/transports/localNodeTransport'),
        createRemoteTtyTransport = require('src/transports/remoteTtyTransport');

    function getProjectRootPath() {
        try {
            var ProjectManager = brackets.getModule('project/ProjectManager');
            var root = ProjectManager.getProjectRoot();
            return root && root.fullPath ? root.fullPath : '';
        } catch (e) {
            return '';
        }
    }

    var terminalProto = {};

    var DANGEROUS_PATTERNS = [
        /rm\s+-rf\s+\//,
        /rm\s+-rf\s+~/,
        /:\(\)\{\s*:\|:\&\s*\};:/,
        />\/dev\/sda/,
        /dd\s+if=\/dev\/zero\s+of=\/dev\/sda/,
        /mkfs/,
        /chmod\s+-R\s+777\s+\//,
        /wget.*\|.*sh/,
        /curl.*\|.*sh/,
        /eval\s*\(/,
        /`.*`/
    ];

    function sanitizeCommand(command) {
        var i;

        if (!command || typeof command !== 'string') {
            return '';
        }

        command = command.trim().substring(0, 10000);

        for (i = 0; i < DANGEROUS_PATTERNS.length; i++) {
            if (DANGEROUS_PATTERNS[i].test(command)) {
                console.warn('[Terminal Security] Comando potencialmente perigoso detectado:', command.substring(0, 100));
                break;
            }
        }

        return command;
    }

    function hasNodeSupport() {
        return window.phoenix && window.phoenix.app && window.phoenix.app.isNativeApp;
    }

    terminalProto._bindTransportEvents = function _bindTransportEvents() {
        var self = this;

        if (!this.transport) {
            return;
        }

        $(this.transport).on('connected', function () {
            $(self).trigger('connected');
        });

        $(this.transport).on('created', function (event, data) {
            self.isCreating = false;
            self._createTerminalInstance(data);
        });

        $(this.transport).on('data', function (event, payload) {
            if (payload && self.terminals[payload.id]) {
                self.terminals[payload.id].write(payload.data);
            }
        });

        $(this.transport).on('terminalExit', function (event, payload) {
            if (payload && payload.id && self.terminals[payload.id]) {
                self.terminals[payload.id].destroy();
                delete self.terminals[payload.id];
            }
        });

        $(this.transport).on('disconnect', function () {
            self.clear();
            $(self).trigger('disconnected');
        });

        $(this.transport).on('error', function (event, message) {
            self.isCreating = false;
            console.error('[Terminal] ' + message);
            $(self).trigger('notConnected', message);
        });
    };

    terminalProto._clearTransportEvents = function _clearTransportEvents() {
        if (this.transport) {
            $(this.transport).off();
        }
    };

    terminalProto._createTerminalInstance = function _createTerminalInstance(data) {
        var terminalId = data.id;
        var term = new Terminal(data.cols, data.rows);

        this.terminals[terminalId] = term;
        term.on('title', function (title) {
            $(this).trigger('title', [terminalId, title]);
        }.bind(this));

        term.on('data', function (outputData) {
            if (this.transport) {
                this.transport.write(terminalId, outputData);
            }
        }.bind(this));

        this.blurAll();
        $(this).trigger('created', terminalId);
    };

    terminalProto.command = function command(terminalId, commandLine) {
        var sanitizedCommand = sanitizeCommand(commandLine);

        if (!sanitizedCommand || !this.transport) {
            return;
        }

        this.transport.write(terminalId, sanitizedCommand + '\n');
        this.focus(terminalId);
    };

    terminalProto.handleResize = function handleResize($bashPanel, terminalId) {
        var height;
        var width;
        var rows;
        var cols;
        var lineHeight;
        var fontSize;
        var $span;

        if (!this.terminals[terminalId] || !this.transport) {
            return;
        }

        height = $bashPanel.height();
        width = $bashPanel.width();
        height -= $bashPanel.find('.toolbar').height() + 10;
        width -= 10;

        var $termEl = $bashPanel.find('.terminal.active');
        if (!$termEl.length) {
            $termEl = $bashPanel.find('.terminal[data-id="' + terminalId + '"]');
        }
        if (!$termEl.length) {
            return;
        }
        $span = $('<span>X</span>');
        $span.css({
            position: 'absolute',
            left: -500
        });
        $span.appendTo($termEl.get(0));
        fontSize = $span.width();
        lineHeight = $span.outerHeight(true);
        $span.remove();

        rows = Math.floor(height / parseInt(lineHeight, 10));
        cols = Math.floor(width / parseInt(fontSize, 10));

        this.transport.resize(terminalId, cols, rows);
        this.terminals[terminalId].resize(cols, rows);
        this.terminals[terminalId].showCursor(this.terminals[terminalId].x, this.terminals[terminalId].y);
    };

    terminalProto.focus = function focus(terminalId) {
        if (this.terminals[terminalId]) {
            this.terminals[terminalId].focus();
        }
    };

    terminalProto.blurAll = function blurAll() {
        var termId;
        for (termId in this.terminals) {
            if (this.terminals.hasOwnProperty(termId)) {
                this.terminals[termId].blur();
            }
        }
    };

    terminalProto.blur = function blur(terminalId) {
        if (this.terminals[terminalId]) {
            this.terminals[terminalId].blur();
        }
    };

    terminalProto.destroy = function destroy(terminalId) {
        if (this.terminals[terminalId]) {
            if (this.transport) {
                this.transport.kill(terminalId);
            }
            this.terminals[terminalId].destroy();
            delete this.terminals[terminalId];
        }
    };

    terminalProto.open = function open(element, termId) {
        if (this.terminals[termId]) {
            this.terminals[termId].open(element);
        }
    };

    terminalProto.clear = function clear() {
        var self = this;
        Object.keys(this.terminals || {}).forEach(function (terminalId) {
            if (self.terminals[terminalId]) {
                self.terminals[terminalId].destroy();
            }
        });
        this.terminals = {};
        this.isCreating = false;
    };

    terminalProto.startConnection = function startConnection(options) {
        var selectedMode;
        var previousTransport = this.transport;
        var self = this;
        var deferred = $.Deferred();
        var mode = (options && options.backendMode) || 'auto';

        options = options || {};

        if (mode === 'auto') {
            selectedMode = hasNodeSupport() ? 'local-node' : 'remote-tty';
        } else {
            selectedMode = mode;
        }

        if (selectedMode === 'local-node') {
            this.transport = createLocalNodeTransport();
        } else {
            this.transport = createRemoteTtyTransport();
        }

        if (previousTransport) {
            $(previousTransport).off();
            if (typeof previousTransport.disconnect === 'function') {
                previousTransport.disconnect();
            }
        }

        this._bindTransportEvents();

        this.transport.connect(options)
            .done(function () {
                deferred.resolve();
            })
            .fail(function (error) {
                if (selectedMode === 'local-node' && options.webFallbackEnabled) {
                    $(self.transport).off();
                    if (typeof self.transport.disconnect === 'function') {
                        self.transport.disconnect();
                    }
                    self.transport = createRemoteTtyTransport();
                    self._bindTransportEvents();
                    self.transport.connect(options)
                        .done(function () {
                            deferred.resolve();
                        })
                        .fail(function (fallbackError) {
                            deferred.reject(fallbackError);
                        });
                    return;
                }

                deferred.reject(error);
            });

        return deferred.promise();
    };

    terminalProto.createTerminal = function createTerminal(cols, rows) {
        var self = this;

        if (!this.transport || !this.transport.isConnected()) {
            throw new Error('Sem conexão para criar terminal.');
        }

        if (this.isCreating) {
            return;
        }

        this.isCreating = true;

        var cwd = getProjectRootPath();
        this.transport.create(cols || 80, rows || 24, cwd)
            .fail(function () {
                self.isCreating = false;
            });
    };

    module.exports = function () {
        return Object.create(terminalProto, {
            terminals: {
                value: {},
                writable: true
            },
            isCreating: {
                value: false,
                writable: true
            },
            transport: {
                value: null,
                writable: true
            }
        });
    };
});
