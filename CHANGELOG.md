# Changelog

## [0.6.1] - 2026-03-02

### 🎯 Objetivos Completados
- ✅ Revisão completa do repositório e análise de bugs
- ✅ Migração da API legacy para API moderna do Phoenix Code
- ✅ Adição de logs robustos para debug
- ✅ Melhoria da documentação e configurações

### 🔧 Mudanças Técnicas

#### Modernização da API (Breaking Change)
- **Antes**: Usava `NodeDomain` API (legacy)
- **Depois**: Usa `NodeConnector` API (moderna do Phoenix Code)

##### node/TerminalDomain.js
- Substituído `domainManager.registerCommand/registerEvent` por `global.createNodeConnector()`
- Funções agora são `async` e aceitam payload como objeto único
- Melhor tratamento de erros com try/catch
- Inicialização automática do NodeConnector ao carregar o módulo
- Novos logs com prefixo `[Terminal Backend]` para facilitar debug

**Impacto**: O backend Node agora usa a API moderna do Phoenix Code, garantindo compatibilidade futura.

##### src/transports/localNodeTransport.js
- Substituído `NodeDomain` por `NodeConnector.createNodeConnector()`
- Migrado de `.exec().done().fail()` para `.execPeer()` com Promise moderna (`.then().catch()`)
- Event listeners agora usam `nodeConnector.on()` em vez de `domain.on()`
- Novos logs com prefixo `[LocalNodeTransport]` para rastrear conexão e operações

**Impacto**: Transporte local agora totalmente compatível com a arquitetura moderna do Phoenix Code.

#### Logs Robustos para Debug
- **main.js**: Logs em `initializeConnection()` e mensagens mais detalhadas de status
- **src/terminal.js**: Logs em todos os métodos principais (`_bindTransportEvents`, `startConnection`, `createTerminal`)
- **node/TerminalDomain.js**: Logs para cada operação de terminal (criar, escrever, resize, matar)
- **src/transports/localNodeTransport.js**: Logs detalhados de conexão, criação, e eventos

Todos os logs usam prefixos padrão para facilitar filtragem no console:
- `[BracketsTerminal]` - main.js
- `[Terminal]` - src/terminal.js
- `[Terminal Backend]` - node/TerminalDomain.js
- `[LocalNodeTransport]` - src/transports/localNodeTransport.js

#### Melhorias de Configuração
- **htmlContent/settings-dialog.html**: Agora exibe todos os campos de configuração (backend mode, host, port, fontSize, webFallbackEnabled, connectTimeoutMs)
- **src/settings.js**: Melhorada lógica de leitura de formulário (tratamento correto de checkboxes)
- **README.md**: Documentação atualizada com explicações sobre cada opção de configuração

### 📦 Versão
- Bump de `0.6.0` → `0.6.1`

### 🧪 Recomendações de Teste

1. **Backend Local (recomendado para Phoenix Desktop)**
   ```bash
   cd node && npm install
   # Iniciar Phoenix Desktop
   # Ver logs em F12 (DevTools) com filtro "[Terminal Backend]"
   ```

2. **Testar Criação de Terminal**
   - Abrir Phoenix Code > View > Show Terminal
   - Verificar logs na DevTools
   - Terminal deve aparecer no painel inferior

3. **Testar Comandos Básicos**
   - Digitar comandos no terminal (ls, pwd, etc.)
   - Testar múltiplas abas (ícone `+`)
   - Testar redimensionamento do painel

4. **Verificar Logs**
   - Abrir DevTools (F12)
   - Filtrar por `[Terminal` para ver todos os logs da extensão
   - Procurar por mensagens de erro vermelho

### ⚠️ Notas de Compatibilidade
- **Phoenix Code 2.0+**: Totalmente compatível (usa API moderna)
- **Brackets Legacy**: Pode não funcionar (requer NodeDomain API, então seria necessário manter ambas as APIs)
- **Node.js**: Requer node-pty ^1.1.0 (considere atualizar para versão mais recente em futuras releases)

### 🐛 Issues Corrigidos
1. Dialog de settings agora mostra todos os campos de configuração (antes exibia apenas porta)
2. Fallback remoto agora está documentado e testável
3. Melhor rastreamento de erros de conexão via logs

### 📝 Próximos Passos Recomendados
1. Atualizar `node-pty` para versão mais recente (quando Node.js 18+ for obrigatório)
2. Considerar remover suporte ao tty.js remoto se não for utilizado
3. Adicionar testes automatizados para validar fluxo de conexão
4. Atualizar vendor libraries (tty.js, terminal.js) para versões modernas
