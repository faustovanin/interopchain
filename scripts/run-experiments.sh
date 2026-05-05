#!/usr/bin/env bash
# run-experiments.sh — Runs the Interopchain research experiments.
#
# This script:
#   1. Verifies the Fabric network and server are running.
#   2. Loads sample HL7 FHIR resources from the dataset/ directory onto the ledger.
#   3. Executes a series of query and transaction experiments.
#   4. Outputs results to the experiments/results/ directory.
#
# Usage:
#   ./scripts/run-experiments.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DATASET_DIR="${REPO_ROOT}/dataset/samples"
RESULTS_DIR="${REPO_ROOT}/experiments/results"
SERVER_URL="${SERVER_URL:-http://localhost:3000}"

echo "==> Checking that the server is reachable at ${SERVER_URL}..."
curl --silent --fail "${SERVER_URL}/health" \
    || { echo "ERROR: Server is not running at ${SERVER_URL}. Start it with ./scripts/start-dev.sh"; exit 1; }

mkdir -p "${RESULTS_DIR}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RESULT_FILE="${RESULTS_DIR}/experiment_${TIMESTAMP}.json"

echo "==> Loading FHIR sample resources from ${DATASET_DIR}..."
for sample_file in "${DATASET_DIR}"/*.json; do
    resource_type=$(python3 -c "import json,sys; print(json.load(open('${sample_file}'))['resourceType'])" 2>/dev/null || echo "Unknown")
    echo "    Submitting ${resource_type} from $(basename "${sample_file}")..."
    curl --silent --fail \
        -X POST "${SERVER_URL}/fhir/${resource_type}" \
        -H "Content-Type: application/fhir+json" \
        --data-binary "@${sample_file}" \
        >> "${RESULT_FILE}" || echo "WARNING: Failed to submit $(basename "${sample_file}")"
done

echo "==> Running query experiments..."
curl --silent --fail "${SERVER_URL}/fhir/Patient" >> "${RESULT_FILE}"

echo ""
echo "==> Experiments complete. Results saved to ${RESULT_FILE}."
