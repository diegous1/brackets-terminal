Brackets Terminal
=================

## Phoenix Code + Brackets

Esta extensão foi atualizada para funcionar no **Phoenix Code** e também no Brackets legado, sem mudanças visuais no plugin.

## Como funciona

A extensão usa dois modos de backend:

1. **Phoenix Desktop (padrão)**: backend local via Node Domain + `node-pty` (sem `tty.js` global).
2. **Phoenix Web / fallback**: conexão remota com servidor `tty.js` configurado em `host:port`.

Configuração padrão:

- `backendMode`: `auto`
- `host`: `localhost`
- `port`: `8080`
- `webFallbackEnabled`: `true`
- `connectTimeoutMs`: `3000`

> Observação: no Phoenix Web você precisa de um backend remoto (ex: `tty.js`) acessível por URL compatível com o protocolo da página (HTTP/HTTPS).

## Instalação (usuário final)

- Abra o Phoenix > Extension Manager > Available.
- Procure por **Brackets Terminal**.
- Instale a extensão.

## Desenvolvimento local

### Requisitos

- Phoenix Desktop (recomendado para backend local)
- Node.js e npm

### Rodar backend local (Phoenix Desktop)

O Phoenix instala automaticamente dependências da pasta `node/` por causa de `nodeConfig.npmInstall`.

Se precisar instalar manualmente:

```bash
cd node
npm install
```

### Rodar fallback remoto (`tty.js`)

```bash
npm install -g tty.js
tty.js --port 8080
```

Depois ajuste a porta nas configurações da extensão, se necessário.

## Publicação no store do Phoenix

Este repositório inclui workflow GitHub Actions em `.github/workflows/publishToPhcode.yml`.

Fluxo:

1. Faça commit do `package.json` com nova versão.
2. Crie uma release com tag igual à versão (`0.6.0` ou `v0.6.0`).
3. Ao publicar a release, o workflow envia para `publish.phcode.dev`.

## Uso

- Menu: `View > Show terminal`
- Atalho: `Cmd/Ctrl + Alt + T`
- Suporte a múltiplas abas
- Comandos rápidos: limpar, `cd` para projeto atual, aumentar/reduzir fonte

![general screenshot](images/screenshot_1.png)

![Nano](images/screenshot2.png)

## Troubleshooting

- **Ícone vermelho**: falha ao conectar backend (local ou remoto).
- **No Phoenix Web sem terminal**: configure backend remoto acessível por rede e protocolo correto (HTTPS em páginas HTTPS).
- **Backend local falhou no Desktop**: rode `npm install` em `node/` e reinicie o Phoenix.

## Licença

MIT
