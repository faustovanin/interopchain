# Chaincodes

This directory contains the Hyperledger Fabric chaincode (smart contract) source code for the Interopchain project.

## Overview

Chaincodes implement the business logic that runs on Hyperledger Fabric peers. They are responsible for:
- Storing and retrieving HL7 FHIR resources on the ledger.
- Enforcing access control policies.
- Providing an immutable audit trail of all data changes.

## Chaincodes

| Directory | Description |
|---|---|
| [`fhir-chaincode/`](fhir-chaincode/README.md) | Core chaincode for FHIR resource CRUD operations and access control |

## Prerequisites

- Go ≥ 1.21
- Hyperledger Fabric peer binary in `$PATH`
- A running Fabric network (see [`docker/`](../docker/README.md))

## Development Workflow

```bash
# 1. Navigate to a chaincode directory
cd chaincodes/fhir-chaincode

# 2. Install Go dependencies
go mod tidy

# 3. Run unit tests
go test ./...

# 4. Deploy to the network (from the repo root)
./scripts/deploy.sh fhir-chaincode
```

## Coding Conventions

- Each chaincode lives in its own subdirectory with its own `go.mod`.
- Chaincode functions follow the Fabric Contract API.
- All ledger keys follow the pattern `RESOURCE_TYPE~ID` (e.g., `Patient~example-patient-001`).
- FHIR resources are stored as JSON-serialised strings in the world state.
