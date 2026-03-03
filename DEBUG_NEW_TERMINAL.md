# Debug - Botão "+" Não Funciona

Se o botão `+` (para criar novo terminal) não está funcionando, siga este guia:

## Passos para Debug

### 1. Abrir DevTools
- Pressione **F12** ou **Cmd+Option+I** (Mac)
- Clique na aba **Console**

### 2. Clicar no Botão "+"
- Clique no ícone **`+`** no painel do terminal
- Observe os logs que aparecem

### 3. Analisar os Logs

**Procure por esta mensagem:**
```
[BracketsTerminal] Criando novo terminal...
[BracketsTerminal] Estado do terminalManager: {...}
```

**Verifique o objeto de estado:**

```javascript
{
  temTransport: boolean,       // deve ser TRUE
  transporte: string,          // deve ser "existe"
  estáConectado: boolean,      // deve ser TRUE
  terminaisAtivos: number,     // quantos terminais já existem
  estaConectando: boolean      // deve ser FALSE
}
```

### 4. Interpretando Resultado

**Se `estáConectado === false`:**
- O transporte existe, mas está desconectado
- Solução: Feche e abra o terminal novamente (pressione Cmd/Ctrl+Alt+T)

**Se `temTransport === false`:**
- Não há transporte criado
- Solução: Verifique se a conexão inicial funcionou (veja README.md)

**Se todos estão corretos:**
- Procure por mais logs abaixo, especialmente:
  ```
  [Terminal] Transport evento: created
  ```
- Se não aparecer, o terminal foi criado no backend mas não foi renderizado

### 5. Solução Rápida

Se encontrar o problema, tente:

1. **Recarregar a página**
   - Se em Phoenix Web: F5 ou Cmd+R
   - Se em Phoenix Desktop: Reiniciar Phoenix

2. **Fechar e abrir terminal**
   - Pressione Cmd/Ctrl+Alt+T para fechar
   - Pressione novamente para abrir
   - Agora tente criar novo terminal

3. **Verificar console do backend**
   - Se houver servidor tty.js rodando, verificar seus logs
   - Procurar por erros de conexão

## Próximas Etapas

Se o problema persistir:

1. Copie **todos os logs** do console (Cmd+A, Cmd+C)
2. Abra [GitHub Issues](https://github.com/diegous1/brackets-terminal)
3. Cole os logs e descreva:
   - SO (Mac/Windows/Linux)
   - Versão do Phoenix
   - Passos exatos para reproduzir
   - Screenshot da DevTools

---

**Nota**: Os logs detalhados foram adicionados na versão 0.6.1+ específicamente para ajudar a debugar este tipo de problema.
