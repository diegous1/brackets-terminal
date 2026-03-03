#!/bin/bash

# Script de teste para Brackets Terminal
# Valida a instalação e dependências

set -e

echo "================================================"
echo "Brackets Terminal - Script de Teste"
echo "================================================"
echo ""

# 1. Verificar Node.js
echo "1️⃣  Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✓ Node.js instalado: $NODE_VERSION"
else
    echo "   ✗ Node.js NÃO encontrado!"
    exit 1
fi

# 2. Verificar npm
echo "2️⃣  Verificando npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "   ✓ npm instalado: $NPM_VERSION"
else
    echo "   ✗ npm NÃO encontrado!"
    exit 1
fi

# 3. Verificar existência de node-pty
echo "3️⃣  Verificando dependências do backend..."
if [ -d "./node/node_modules/node-pty" ]; then
    echo "   ✓ node-pty já instalado"
else
    echo "   ⚠ node-pty não encontrado. Instalando..."
    cd node
    npm install
    cd ..
    echo "   ✓ node-pty instalado"
fi

# 4. Validar arquivos principais
echo "4️⃣  Validando arquivos principais..."
FILES=(
    "main.js"
    "package.json"
    "node/TerminalDomain.js"
    "node/package.json"
    "src/terminal.js"
    "src/panel.js"
    "src/settings.js"
    "src/transports/localNodeTransport.js"
    "src/transports/remoteTtyTransport.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ✗ $file FALTANDO!"
        exit 1
    fi
done

# 5. Verificar versão
echo "5️⃣  Versão da extensão..."
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
echo "   ✓ Versão: $VERSION"

# 6. Resumo
echo ""
echo "================================================"
echo "✓ Teste completado com sucesso!"
echo "================================================"
echo ""
echo "Próximos passos:"
echo "1. Abra o Phoenix Code"
echo "2. Vá para View > Show Terminal (ou Cmd/Ctrl+Alt+T)"
echo "3. Abra DevTools (F12) para ver os logs"
echo "4. Filtrar por '[Terminal' no console"
echo ""
echo "Se encontrar problemas, veja DEBUG.md para guia de troubleshooting."
