define(function (require, exports, module) {
    'use strict';

    var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
    var NodeDomain = brackets.getModule('utils/NodeDomain');

    module.exports = function createLocalNodeTransport() {
        var transport = {};
        var connected = false;
        var domain = null;

        function trigger(eventName, payload) {
            $(transport).trigger(eventName, payload);
        }

        function ensureDomain() {
            if (domain) {
                return domain;
            }

            domain = new NodeDomain(
                'bracketsTerminal',
                ExtensionUtils.getModulePath(module, '../../node/TerminalDomain')
            );

            domain.on('terminalData', function (event, payload) {
                trigger('data', payload);
            });

            domain.on('terminalExit', function (event, payload) {
                trigger('terminalExit', payload);
            });

            domain.on('terminalError', function (event, payload) {
                trigger('error', payload && payload.message ? payload.message : 'Erro no backend local.');
            });

            return domain;
        }

        transport.connect = function connect() {
            var deferred = $.Deferred();
            var localDomain;

            try {
                localDomain = ensureDomain();
            } catch (error) {
                deferred.reject(error);
                return deferred.promise();
            }

            localDomain.exec('healthCheck')
                .done(function () {
                    connected = true;
                    trigger('connected');
                    deferred.resolve();
                })
                .fail(function (error) {
                    connected = false;
                    deferred.reject(error);
                });

            return deferred.promise();
        };

        transport.create = function create(cols, rows, cwd) {
            var deferred = $.Deferred();

            if (!connected) {
                deferred.reject('Sem conexão com backend local.');
                return deferred.promise();
            }

            ensureDomain().exec('createTerminal', cols || 80, rows || 24, cwd || '')
                .done(function (terminalData) {
                    trigger('created', terminalData);
                    deferred.resolve(terminalData);
                })
                .fail(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise();
        };

        transport.write = function write(terminalId, data) {
            if (!connected) {
                return;
            }
            ensureDomain().exec('writeTerminal', terminalId, data);
        };

        transport.resize = function resize(terminalId, cols, rows) {
            if (!connected) {
                return;
            }
            ensureDomain().exec('resizeTerminal', terminalId, cols, rows);
        };

        transport.kill = function kill(terminalId) {
            if (!connected) {
                return;
            }
            ensureDomain().exec('killTerminal', terminalId);
        };

        transport.disconnect = function disconnect() {
            if (!domain) {
                return;
            }

            domain.exec('disposeAll')
                .always(function () {
                    connected = false;
                });
        };

        transport.isConnected = function () {
            return connected;
        };

        return transport;
    };
});
