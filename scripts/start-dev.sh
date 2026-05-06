#!/usr/bin/env bash
# start-dev.sh — Starts the full Interopchain local development environment.
#
# This script brings up:
#   - The Hyperledger Fabric network (peers, orderers, CAs)
#   - The NodeJS backend server
#   - The web application (in development mode)
#
# Usage:
#   ./scripts/start-dev.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Starting Hyperledger Fabric network..."
docker compose -f "${REPO_ROOT}/docker/fabric/docker-compose.fabric.yml" up -d

echo "==> Waiting for Fabric network to be ready..."
sleep 5

echo "==> Deploying chaincodes..."
"${SCRIPT_DIR}/deploy.sh"

echo "==> Starting NodeJS server..."
(cd "${REPO_ROOT}/server" && npm install && npm start &)

echo "==> Starting web application (development mode)..."
(cd "${REPO_ROOT}/app" && npm install && npm start &)

echo ""
echo "==> Development environment is running."
echo "    Web application: http://localhost:3001"
echo "    Server API:      http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop."
wait
