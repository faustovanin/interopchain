#!/usr/bin/env bash
# deploy.sh — Packages, installs, approves, and commits chaincodes on the Fabric network.
#
# Usage:
#   ./scripts/deploy.sh [CHAINCODE_NAME]
#
# If CHAINCODE_NAME is not provided, all chaincodes in the chaincodes/ directory are deployed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CHAINCODES_DIR="${REPO_ROOT}/chaincodes"

CHANNEL_NAME="${CHANNEL_NAME:-interopchain}"
ORDERER_ADDRESS="${ORDERER_ADDRESS:-localhost:7050}"
PEER_ADDRESS="${PEER_ADDRESS:-localhost:7051}"

deploy_chaincode() {
    local cc_name="$1"
    local cc_path="${CHAINCODES_DIR}/${cc_name}"

    if [[ ! -d "${cc_path}" ]]; then
        echo "ERROR: Chaincode directory not found: ${cc_path}"
        exit 1
    fi

    echo "==> Packaging chaincode '${cc_name}'..."
    peer lifecycle chaincode package "/tmp/${cc_name}.tar.gz" \
        --path "${cc_path}" \
        --lang java \
        --label "${cc_name}_1.0"

    echo "==> Installing chaincode '${cc_name}'..."
    peer lifecycle chaincode install "/tmp/${cc_name}.tar.gz"

    echo "==> Querying installed chaincodes to get package ID..."
    PACKAGE_ID=$(peer lifecycle chaincode queryinstalled \
        | grep "${cc_name}_1.0" \
        | awk '{print $3}' \
        | tr -d ',')

    echo "==> Approving chaincode '${cc_name}' (package ID: ${PACKAGE_ID})..."
    peer lifecycle chaincode approveformyorg \
        --orderer "${ORDERER_ADDRESS}" \
        --channelID "${CHANNEL_NAME}" \
        --name "${cc_name}" \
        --version "1.0" \
        --package-id "${PACKAGE_ID}" \
        --sequence 1

    echo "==> Committing chaincode '${cc_name}'..."
    peer lifecycle chaincode commit \
        --orderer "${ORDERER_ADDRESS}" \
        --channelID "${CHANNEL_NAME}" \
        --name "${cc_name}" \
        --version "1.0" \
        --sequence 1

    echo "==> Chaincode '${cc_name}' deployed successfully."
}

if [[ $# -ge 1 ]]; then
    deploy_chaincode "$1"
else
    echo "==> Deploying all chaincodes in ${CHAINCODES_DIR}..."
    for cc_dir in "${CHAINCODES_DIR}"/*/; do
        cc_name="$(basename "${cc_dir}")"
        deploy_chaincode "${cc_name}"
    done
fi

echo "==> All chaincodes deployed."
