# Scripts

This directory contains bash scripts for managing the Interopchain development environment, deployments, and experiments.

## Scripts

| Script | Description |
|---|---|
| [`setup.sh`](setup.sh) | One-time setup: installs prerequisites, generates Fabric crypto material and channel artifacts |
| [`start-dev.sh`](start-dev.sh) | Starts the full local development environment (Fabric network, server, and app) |
| [`deploy.sh`](deploy.sh) | Packages, installs, approves, and commits chaincodes on the Fabric network |
| [`run-experiments.sh`](run-experiments.sh) | Runs the research experiments using the dataset and deployed chaincodes |

## Usage

Run each script from the repository root:

```bash
# 1. One-time setup
./scripts/setup.sh

# 2. Start the development environment
./scripts/start-dev.sh

# 3. Deploy chaincodes (after the network is running)
./scripts/deploy.sh

# 4. Run experiments
./scripts/run-experiments.sh
```

## Prerequisites

- Docker ≥ 20.10 and Docker Compose ≥ 2.0
- Hyperledger Fabric binaries (`peer`, `configtxgen`, `cryptogen`) in your `$PATH`
- Java 11+ and Maven ≥ 3.8 (for chaincode builds)
- Node.js ≥ 18 LTS
