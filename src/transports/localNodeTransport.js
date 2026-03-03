define(function (require, exports, module) {
    'use strict';

    var NodeConnector = null;

    try {
        NodeConnector = brackets.getModule('NodeConnector');
    } catch(e) {
        console.warn('[LocalNodeTransport] NodeConnector não disponível');
    }

    module.exports = function createLocalNodeTransport() {
        var transport = {};
        var connected = false;
        var nodeConnector = null;
        var TERMINAL_NODE_CONNECTOR_ID = 'brackets-terminal';
        var isModern = !!NodeConnector;

        function trigger(eventName, payload) {
            $(transport).trigger(eventName, payload);
        }

        function ensureNodeConnector() {
            if (nodeConnector) {
                console.log('[LocalNodeTransport] NodeConnector já existe, retornando.');
                return nodeConnector;
            }

            console.log('[LocalNodeTransport] Criando NodeConnector com ID:', TERMINAL_NODE_CONNECTOR_ID);
            console.log('[LocalNodeTransport] Usando API:', isModern ? 'NodeConnector (moderno)' : 'NodeDomain (legado)');
            console.log('[LocalNodeTransport] NodeConnector module:', typeof NodeConnector);
            
            try {
                if (!NodeConnector || typeof NodeConnector.createNodeConnector !== 'function') {
                    console.error('[LocalNodeTransport] NodeConnector indisponível ou incompleto:', NodeConnector);
                    throw new Error('NodeConnector não disponível. Execute o Phoenix Code como Desktop App.');
                }

                console.log('[LocalNodeTransport] Chamando NodeConnector.createNodeConnector...');
                nodeConnector = NodeConnector.createNodeConnector(TERMINAL_NODE_CONNECTOR_ID, {});
                
                console.log('[LocalNodeTransport] NodeConnector criado. Tipo:', typeof nodeConnector);
                
                // Registrar listeners para eventos do backend Node
                nodeConnector.on('terminalData', function (event, payload) {
                    console.debug('[LocalNodeTransport] Recebeu terminalData:', payload.id);
                    trigger('data', payload);
                });

                nodeConnector.on('terminalExit', function (event, payload) {
                    console.log('[LocalNodeTransport] Recebeu terminalExit:', payload.id);
                    trigger('terminalExit', payload);
                });

                nodeConnector.on('terminalError', function (event, payload) {
                    console.error('[LocalNodeTransport] Recebeu terminalError:', payload);
                    trigger('error', payload && payload.message ? payload.message : 'Erro no backend local.');
                });

                console.log('[LocalNodeTransport] Event listeners registrados com sucesso.');
            } catch (error) {
                console.error('[LocalNodeTransport] Erro ao criar NodeConnector:', error);
                console.error('[LocalNodeTransport] Stack:', error.stack);
                nodeConnector = null;
            }

            return nodeConnector;
        }

        transport.connect = function connect() {
            var deferred = $.Deferred();

            console.log('[LocalNodeTransport] Iniciando conexão com backend local...');
            console.log('[LocalNodeTransport] Ambiente:', isModern ? 'Phoenix Code (moderno)' : 'Brackets (legado)');

            if (!isModern) {
                console.error('[LocalNodeTransport] NodeConnector não disponível. Rejeitando.');
                deferred.reject('Backend local não disponível em Brackets legado. Use servidor remoto (tty.js).');
                return deferred.promise();
            }

            try {
                var connector = ensureNodeConnector();
                
                if (!connector) {
                    console.error('[LocalNodeTransport] Falha ao criar NodeConnector');
                    deferred.reject('Falha ao criar NodeConnector.');
                    return deferred.promise();
                }
                
                console.log('[LocalNodeTransport] Chamando execPeer para healthCheck...');
                console.log('[LocalNodeTransport] execPeer tipo:', typeof connector.execPeer);
                
                // Verificar saúde do backend
                connector.execPeer('healthCheck', {})
                    .then(function (result) {
                        connected = true;
                        console.log('[LocalNodeTransport] Conexão bem-sucedida. Info:', result);
                        trigger('connected');
                        deferred.resolve();
                    })
                    .catch(function (error) {
                        connected = false;
                        console.error('[LocalNodeTransport] Erro ao conectar - healthCheck falhou:', error);
                        deferred.reject(error);
                    });
            } catch (error) {
                console.error('[LocalNodeTransport] Exceção ao conectar:', error);
                console.error('[LocalNodeTransport] Stack:', error.stack);
                deferred.reject(error);
            }

            return deferred.promise();
        };

        transport.create = function create(cols, rows, cwd) {
            var deferred = $.Deferred();

            if (!connected) {
                console.error('[LocalNodeTransport] Não conectado ao backend local.');
                deferred.reject('Sem conexão com backend local.');
                return deferred.promise();
            }

            console.log('[LocalNodeTransport] Criando terminal:', { cols: cols, rows: rows, cwd: cwd });

            try {
                nodeConnector.execPeer('createTerminal', {
                    cols: cols || 80,
                    rows: rows || 24,
                    cwd: cwd || ''
                })
                    .then(function (terminalData) {
                        console.log('[LocalNodeTransport] Terminal criado:', terminalData.id);
                        trigger('created', terminalData);
                        deferred.resolve(terminalData);
                    })
                    .catch(function (error) {
                        console.error('[LocalNodeTransport] Erro ao criar terminal:', error);
                        deferred.reject(error);
                    });
            } catch (error) {
                console.error('[LocalNodeTransport] Exceção ao criar terminal:', error);
                deferred.reject(error);
            }

            return deferred.promise();
        };

        transport.write = function write(terminalId, data) {
            if (!connected) {
                console.warn('[LocalNodeTransport] Não conectado. Comando ignorado.');
                return;
            }

            try {
                nodeConnector.execPeer('writeTerminal', {
                    id: terminalId,
                    data: data
                }).catch(function (error) {
                    console.error('[LocalNodeTransport] Erro ao escrever no terminal:', error);
                });
            } catch (error) {
                console.error('[LocalNodeTransport] Exceção ao escrever no terminal:', error);
            }
        };

        transport.resize = function resize(terminalId, cols, rows) {
            if (!connected) {
                console.warn('[LocalNodeTransport] Não conectado. Resize ignorado.');
                return;
            }

            try {
                nodeConnector.execPeer('resizeTerminal', {
                    id: terminalId,
                    cols: cols,
                    rows: rows
                }).catch(function (error) {
                    console.error('[LocalNodeTransport] Erro ao redimensionar terminal:', error);
                });
            } catch (error) {
                console.error('[LocalNodeTransport] Exceção ao redimensionar terminal:', error);
            }
        };

        transport.kill = function kill(terminalId) {
            if (!connected) {
                console.warn('[LocalNodeTransport] Não conectado. Kill ignorado.');
                return;
            }

            try {
                nodeConnector.execPeer('killTerminal', {
                    id: terminalId
                }).catch(function (error) {
                    console.error('[LocalNodeTransport] Erro ao finalizar terminal:', error);
                });
            } catch (error) {
                console.error('[LocalNodeTransport] Exceção ao finalizar terminal:', error);
            }
        };

        transport.disconnect = function disconnect() {
            console.log('[LocalNodeTransport] Desconectando...');
            
            if (nodeConnector) {
                try {
                    nodeConnector.execPeer('disposeAll', {})
                        .then(function () {
                            connected = false;
                            nodeConnector.off();
                            nodeConnector = null;
                            console.log('[LocalNodeTransport] Desconectado.');
                        })
                        .catch(function (error) {
                            console.error('[LocalNodeTransport] Erro ao desconectar:', error);
                            connected = false;
                        });
                } catch (error) {
                    console.error('[LocalNodeTransport] Exceção ao desconectar:', error);
                    connected = false;
                }
            }
        };

        transport.isConnected = function () {
            console.debug('[LocalNodeTransport] isConnected() chamado. Retorna:', connected);
            return connected;
        };

        return transport;
    };
});
