# Guia de Debug - Brackets Terminal

Este guia ajuda a diagnosticar problemas com a extensão Brackets Terminal.

## 1. Habilitando Logs no Console (DevTools)

### Phoenix Code
1. Abra o Phoenix Code
2. Pressione **F12** ou **Cmd+Option+I** (Mac) / **Ctrl+Shift+I** (Windows/Linux)
3. Abra a aba **Console**
4. Abra o terminal da extensão (View > Show Terminal ou Cmd/Ctrl+Alt+T)
5. Observe os logs com prefixos `[Terminal]`, `[Terminal Backend]`, etc.

## 2. Filtrar Logs

No console do DevTools, você pode filtrar por:
- `[Terminal` - Mostra todos os logs da extensão
- `[Terminal Backend]` - Logs do backend Node.jS
- `[LocalNodeTransport]` - Logs do transporte local
- `[BracketsTerminal]` - Logs da extensão principal

## 3. Checklist de Troubleshooting

### Problema: "Ícone vermelho" (Erro de Conexão)

1. **Verificar se Node.js está disponível**
   - Abra a DevTools
   - Procure por log`[BracketsTerminal] ✓ Phoenix Desktop detectado`
   - Se vir `⚠ Phoenix Web`, o backend local não está disponível

2. **Verificar se node-pty foi instalado**
   ```bash
   cd /caminho/para/extensão/node
   npm install
   ```
   - Se falhar, verifique se Node.js e npm estão instalados
   - Verificar se node-pty pode ser compilado (pode exigir ferramentas de build)

3. **Ver erro específico**
   - DevTools > Console > Filtrar `[Terminal Backend]`
   - Procurar por "Erro" ou "Error"
   - Ler a mensagem de erro específica

### Problema: Terminal não abre / fica em branco

1. **Verificar se a conexão foi estabelecida**
   - DevTools > Console
   - Procurar por `[LocalNodeTransport] Conexão bem-sucedida`
   - Procurar por `[Terminal] Transport conectado com sucesso`

2. **Verificar se o terminal foi criado**
   - Procurar por `[Terminal Backend] Terminal criado`
   - Procurar por `[Terminal] Transport evento: created`

3. **Verificar dados chegando**
   - Procurar por `[LocalNodeTransport] Recebeu terminalData`
   - Se não aparecer, o terminal foi criado mas não há fluxo de dados

### Problema: Comandos não funcionam (digitação lenta/não responde)

1. **Verificar se os dados estão sendo enviados**
   ```javascript
   // No console do DevTools, execute:
   console.log(Object.keys(brackets.getModule('terminal').terminals))
   ```

2. **Testar escrita manual**
   ```javascript
   // No console do DevTools:
   var terminal = brackets.getModule('terminal');
   terminal.transport.write('terminal-id', 'ls\n');
   ```

3. **Verificar tamanho do terminal**
   - O terminal pode estar muito pequeno
   - Tente redimensionar o painel inferior arrastando a borda

### Problema: "Sem conexão para criar terminal"

1. **Verificar o status de `isConnected()`**
   ```javascript
   // No console do DevTools:
   var transport = /* obter transport */;
   console.log(transport.isConnected());
   ```

2. **Verificar se healthCheck passou**
   - DevTools > Console
   - Procurar por `[LocalNodeTransport] Health check realizado`

3. **Verificar timeout**
   - Se demorar muito, pode ser um timeout de conexão
   - Verificar configuração de `connectTimeoutMs` (padrão 3000ms)

## 4. Ativar Debug Completo

### Node.js Inspector (Advanced)
```javascript
// No console do Phoenix DevTools:
var NodeConnector = brackets.getModule('NodeConnector');
NodeConnector.setInspectEnabled(true);
// Reiniciar Phoenix
```

Depois inspecionar com `node --inspect` em `localhost:9229`

### Modo Verbose no Terminal.js
Editar `src/terminal.js` e mudar:
```javascript
console.debug // para console.log
```

## 5. Reportar Bugs

Se o problema persistir, colete:

1. **Logs completos da DevTools** (copiar e salvar em arquivo)
   ```
   [BracketsTerminal] ...
   [Terminal] ...
   [LocalNodeTransport] ...
   [Terminal Backend] ...
   ```

2. **Informações do Sistema**
   ```bash
   node -v
   npm -v
   uname -a  # Mac/Linux
   ```

3. **Arquivo de log do Phoenix**
   ```
   ~/.phcode/logs/
   ```

4. **Passos para reproduzir**
   - Sequência exata de ações
   - Resultado esperado vs. resultado real
   - Logs correspondentes

## 6. Performance

Se o terminal estiver lento:

1. **Verificar logs excessivos**
   - Muito uso de `console.debug` pode desacelerar
   - Considerar desabilitar `console.debug` em produção

2. **Verificar tamanho do terminal**
   - Terminais muito grandes consomem mais memória
   - Reduzir número de linhas de histórico se necessário

3. **Verificar CPU**
   - Abrir Activity Monitor (Mac) / Task Manager (Windows)
   - Verificar uso de CPU do processo Phoenix
   - Se > 50%, pode haver loop infinito

## 7. Links Úteis

- [Phoenix Code API Docs](https://docs.phcode.dev/api/API-Reference/NodeConnector)
- [node-pty Docs](https://github.com/microsoft/node-pty)
- [GitHub Issues](https://github.com/diegous1/brackets-terminal/issues)
