# Smart Contracts (Chaincodes)

## Overview

Chaincodes are the smart contracts that run on Hyperledger Fabric peers. In Interopchain they implement the business logic for managing HL7 FHIR document records on the ledger.

All chaincode source code lives in the [`chaincodes/`](../../chaincodes/README.md) directory.

## Design: What Is Stored On-Chain

The full FHIR file is **not** stored on the ledger. Each on-chain record holds only:
- A **SHA-256 hash** of the FHIR file (for integrity verification).
- Selected **metadata** fields (resource type, resource ID, effective date, category, etc.) as a JSON string.
- The **patient's public key** (used for access control and queries).

## Responsibilities

- **Record registration** — store FHIR document hashes and metadata on the ledger.
- **Integrity verification** — the hash allows any party to verify that an off-chain FHIR file has not been tampered with.
- **Access control** — enforce policies linking records to patient public keys.
- **Rich queries** — query records by patient public key or metadata fields (requires CouchDB).
- **Audit trail** — every state change is recorded immutably on the ledger.

## Development

Chaincodes are developed in **Java** (using the Hyperledger Fabric Java Chaincode Shim) and tested with JUnit 5 and Mockito. See [`chaincodes/README.md`](../../chaincodes/README.md) for setup and testing instructions.

## Deployment

Use the deployment script to package and install chaincodes on the network:

```bash
./scripts/deploy.sh
```
