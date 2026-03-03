# Como Testar o Botão "+"

Agora que as mudanças foram feitas, siga este guia para testar.

## Pré-requisitos

```bash
# Certifique-se que node-pty está instalado
cd /Users/diego/_projects/Plugins-extensoes/Brackets/brackets-terminal/node
npm install
```

## Teste Passo a Passo

### 1. Abrir Phoenix Code
- Abra o Phoenix Code com a extensão instalada
- Vá até **View > Show Terminal** ou pressione **Cmd/Ctrl+Alt+T**
- Você deverá ver um terminal preto aparecer no painel inferior com o prompt do shell

### 2. Abrir DevTools para Ver Logs
- Pressione **F12** para abrir o DevTools
- Clique na aba **Console**
- Você deverá ver logs similares a:
  ```
  [BracketsTerminal] ✓ Phoenix Desktop detectado
  [Terminal] startConnection chamado
  [LocalNodeTransport] Conectando ao backend local...
  [LocalNodeTransport] Conexão bem-sucedida
  ```

### 3. Testar o Botão "+"
- **Clique no botão `+`** no painel do terminal (próximo às abas)
- **Veja os logs** que aparecem na DevTools

**Resultado esperado:**
```
[BracketsTerminal] Criando novo terminal...
[BracketsTerminal] Estado do terminalManager: {
  temTransport: true,
  transporte: "existe",
  estáConectado: true,
  terminaisAtivos: 1,
  estaConectando: false
}
[Terminal] createTerminal chamado.
[Terminal] Criando terminal com cwd: ...
[Terminal Backend] Terminal criado: local-2
[Terminal] Transport evento: created local-2
[BracketsTerminal] ✓ Nova aba criada!
```

### 4. Verificar Nova Aba
- Na área de abas do terminal, deverá aparecer uma **segunda aba**
- Clique nela para alternar entre terminais
- Ambos deverão funcionar independentemente

## Possíveis Problemas e Soluções

### Problema 1: Mensagem "Transporte não conectado"
```
[Terminal] Transporte não conectado. Tentando reconectar primeiro...
```

**O que fazer:**
- Isso é normal! O sistema tentará reconectar automaticamente
- Verifique se aparece:
  ```
  [Terminal] Reconexão bem-sucedida. Criando terminal...
  ```

### Problema 2: Nenhum log aparece quando clica em "+"
- Abra DevTools **antes** de clicar em "+"
- Certifique-se de estar na aba **Console** (não Network, Elements, etc)
- Tente clicar novamente e observe

### Problema 3: Ícone vermelho aparece
- O backend não conseguiu conectar
- **Solução:**
  1. Feche o terminal (Cmd/Ctrl+Alt+T)
  2. Abra novamente (Cmd/Ctrl+Alt+T)
  3. Tente criar novo terminal

### Problema 4: Terminal abre, mas "+" não funciona
- Veja [DEBUG_NEW_TERMINAL.md](DEBUG_NEW_TERMINAL.md) para análise aprofundada

## Teste Adicional - Comandos

Se conseguegue criar múltiplos terminais e eles aparecem com abas, tente:

1. **Digitar em cada terminal:**
   ```bash
   echo "Terminal 1"
   ```

2. **Alternar entre abas** - Clique em cada aba e verifique que o comando foi digitado corretamente

3. **Executar comandos diferentes:**
   ```bash
   # Terminal 1
   ls -la
   
   # Terminal 2
   pwd
   ```

4. **Testar redimensionamento:**
   - Arraste a borda superior do painel para redimensionar
   - Os terminais deverão se adaptar ao novo tamanho

## Reportar Resultados

Se o teste funcionar, parabéns! 🎉

Se não funcionar, colete:

1. **Todos os logs do console**:
   - Abra DevTools (F12)
   - Console > clique direito > "Save as..."
   - Ou selecione tudo (Cmd+A) e copie (Cmd+C)

2. **Informações do sistema:**
   ```bash
   node -v
   npm -v
   ```

3. **Descreva os passos:**
   - Exatamente o que você fez
   - O que esperava que acontecesse
   - O que aconteceu de fato
   - Os logs que você viu

---

**Nota:** A versão 0.6.1+ agora têm muito mais logging para ajudar a diagnosticar exatamente onde está o problema!
