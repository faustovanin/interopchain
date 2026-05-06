# Chaincodes

This directory contains the Hyperledger Fabric chaincode (smart contract) source code for the Interopchain project.

## Overview

Chaincodes implement the business logic that runs on Hyperledger Fabric peers. They are responsible for:
- Registering HL7 FHIR document records on the ledger (hash + metadata + patient public key).
- Querying records by patient public key or metadata fields.
- Enforcing access control policies.
- Providing an immutable audit trail of all data changes.

## Chaincodes

| Directory | Description |
|---|---|
| [`fhir-chaincode/`](fhir-chaincode/README.md) | Core chaincode for FHIR record registration, updates, and queries |

## Prerequisites

- Java 11+
- Maven ≥ 3.8
- Hyperledger Fabric peer binary in `$PATH`
- A running Fabric network with CouchDB state database (see [`docker/`](../docker/README.md))

## Development Workflow

```bash
# 1. Navigate to a chaincode directory
cd chaincodes/fhir-chaincode

# 2. Run unit tests
mvn test

# 3. Build the fat-jar for deployment
mvn package

# 4. Deploy to the network (from the repo root)
./scripts/deploy.sh fhir-chaincode
```

## Coding Conventions

- Each chaincode lives in its own subdirectory with its own `pom.xml`.
- Chaincode functions follow the Fabric Contract API (`ContractInterface`).
- All ledger keys follow the pattern `RESOURCE_TYPE~ID` (e.g., `Patient~example-patient-001`).
- Full FHIR files are **not** stored on-chain; only their SHA-256 hash, metadata, and the patient's public key are persisted.
