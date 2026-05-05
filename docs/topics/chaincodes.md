# Smart Contracts (Chaincodes)

## Overview

Chaincodes are the smart contracts that run on Hyperledger Fabric peers. In Interopchain they implement the business logic for storing, retrieving, and managing HL7 FHIR resources on the ledger.

All chaincode source code lives in the [`chaincodes/`](../../chaincodes/README.md) directory.

## Responsibilities

- **FHIR resource CRUD** — create, read, update, and delete FHIR resources (e.g., Patient, Observation, Condition) stored as JSON in the ledger state.
- **Access control** — enforce policies that determine which organisations and users can read or write each resource type.
- **Audit trail** — every state change is recorded immutably on the ledger, providing a tamper-proof audit log.

## Development

Chaincodes are developed in **Go** and tested with the Fabric chaincode testing utilities. See [`chaincodes/README.md`](../../chaincodes/README.md) for setup and testing instructions.

## Deployment

Use the deployment script to package and install chaincodes on the network:

```bash
./scripts/deploy.sh
```
