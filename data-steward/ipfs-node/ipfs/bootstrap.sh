#!/bin/sh

set -e

echo "===================================="
echo "Inicializando IPFS (PEER)"
echo "===================================="

# IPFS init
if [ ! -f /data/ipfs/config ]; then
    ipfs init
fi

echo "Verificando swarm key..."
if [ -f /data/ipfs/swarm.key ]; then
    echo "Swarm key OK"
else
    echo "ERRO: swarm.key não encontrada"
fi

# config base
/config.sh

echo "Iniciando daemon..."
ipfs daemon &
PID=$!

sleep 8

echo "Conectando ao peer principal..."

if [ ! -z "$BOOTSTRAP_PEER" ]; then
    ipfs swarm connect "$BOOTSTRAP_PEER" || true
fi

wait $PID