#!/usr/bin/env bash
# setup.sh — One-time setup for the Interopchain development environment.
#
# This script:
#   1. Checks for required tools (Docker, Fabric binaries, Node.js).
#   2. Downloads Hyperledger Fabric Docker images if not already present.
#   3. Generates cryptographic material using `cryptogen`.
#   4. Generates the genesis block and channel transaction using `configtxgen`.
#
# Usage:
#   ./scripts/setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Checking prerequisites..."

command -v docker      >/dev/null 2>&1 || { echo "ERROR: docker is not installed."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "ERROR: docker compose is not installed."; exit 1; }
command -v cryptogen   >/dev/null 2>&1 || { echo "ERROR: cryptogen (Fabric binary) not found in PATH."; exit 1; }
command -v configtxgen >/dev/null 2>&1 || { echo "ERROR: configtxgen (Fabric binary) not found in PATH."; exit 1; }
command -v node        >/dev/null 2>&1 || { echo "ERROR: node is not installed."; exit 1; }

echo "==> All prerequisites found."

echo "==> Pulling Hyperledger Fabric Docker images..."
docker pull hyperledger/fabric-peer:latest
docker pull hyperledger/fabric-orderer:latest
docker pull hyperledger/fabric-ca:latest
docker pull hyperledger/fabric-tools:latest

echo "==> Generating crypto material..."
cryptogen generate --config="${REPO_ROOT}/docker/fabric/crypto-config.yaml" \
    --output="${REPO_ROOT}/docker/fabric/crypto-config"

echo "==> Generating channel artifacts..."
export FABRIC_CFG_PATH="${REPO_ROOT}/docker/fabric"
configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel \
    -outputBlock "${REPO_ROOT}/docker/fabric/genesis.block"
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx \
    "${REPO_ROOT}/docker/fabric/channel.tx" -channelID interopchain

echo "==> Setup complete. Run ./scripts/start-dev.sh to start the development environment."
