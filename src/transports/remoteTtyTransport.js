define(function (require, exports, module) {
    'use strict';

    var io = require('vendor/socket-io');

    module.exports = function createRemoteTtyTransport() {
        var transport = {};
        var socket = null;
        var connected = false;

        function trigger(eventName, payload) {
            $(transport).trigger(eventName, payload);
        }

        function bindSocketEvents() {
            socket.on('connect', function () {
                connected = true;
                trigger('connected');
            });

            socket.on('disconnect', function () {
                connected = false;
                trigger('disconnect');
            });

            socket.on('reconnect_failed', function () {
                connected = false;
                trigger('error', 'Falha ao reconectar ao servidor tty.js.');
            });

            socket.on('error', function () {
                connected = false;
                trigger('error', 'Erro de conexão com servidor tty.js.');
            });

            socket.on('data', function (id, data) {
                trigger('data', {
                    id: id,
                    data: data
                });
            });

            socket.on('kill', function (id) {
                trigger('terminalExit', {
                    id: id
                });
            });
        }

        transport.connect = function connect(options) {
            var deferred = $.Deferred();
            options = options || {};

            if (socket && connected) {
                deferred.resolve();
                return deferred.promise();
            }

            socket = io.connect(options.url, {
                force: true,
                'connect timeout': options.connectTimeoutMs || 3000
            });

            bindSocketEvents();

            socket.on('connect', function () {
                deferred.resolve();
            });

            socket.on('error', function () {
                deferred.reject('Não foi possível conectar ao servidor tty.js.');
            });

            return deferred.promise();
        };

        transport.create = function create(cols, rows) {
            var deferred = $.Deferred();

            if (!connected || !socket) {
                deferred.reject('Sem conexão com servidor tty.js.');
                return deferred.promise();
            }

            socket.emit('create', cols || 80, rows || 24, function (err, data) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                trigger('created', {
                    id: data.id,
                    cols: data.cols,
                    rows: data.rows
                });
                deferred.resolve(data);
            });

            return deferred.promise();
        };

        transport.write = function write(terminalId, data) {
            if (!connected || !socket) {
                return;
            }
            socket.emit('data', terminalId, data);
        };

        transport.resize = function resize(terminalId, cols, rows) {
            if (!connected || !socket) {
                return;
            }
            socket.emit('resize', terminalId, cols, rows);
        };

        transport.kill = function kill(terminalId) {
            if (!connected || !socket) {
                return;
            }
            socket.emit('kill', terminalId);
        };

        transport.disconnect = function disconnect() {
            if (!socket) {
                return;
            }

            socket.removeAllListeners('connect');
            socket.removeAllListeners('disconnect');
            socket.removeAllListeners('reconnect_failed');
            socket.removeAllListeners('error');
            socket.removeAllListeners('data');
            socket.removeAllListeners('kill');
            socket.disconnect();
            connected = false;
        };

        transport.isConnected = function () {
            return connected;
        };

        return transport;
    };
});
