# Architecture Overview

## System Components

```
┌──────────────────────────────────────────────────────────┐
│                        End Users                         │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼────────────────────────────────┐
│                   Web Application (app/)                 │
│  - Login / Authentication UI                             │
│  - Smart Contract data display                           │
│  - QR Code reader                                        │
│  - Transaction signing                                   │
└─────────────────────────┬────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼────────────────────────────────┐
│                  NodeJS Server (server/)                 │
│  - Authentication & Authorisation                        │
│  - Private key management                                │
│  - Hyperledger Fabric gateway                            │
└─────────────────────────┬────────────────────────────────┘
                          │ Fabric SDK
┌─────────────────────────▼────────────────────────────────┐
│           Hyperledger Fabric Network (docker/)           │
│  - Peers  - Orderers  - Certificate Authorities          │
│  - Channels  - Private Data Collections                  │
└─────────────────────────┬────────────────────────────────┘
                          │ Chaincode calls
┌─────────────────────────▼────────────────────────────────┐
│               Chaincodes (chaincodes/)                   │
│  - HL7 FHIR resource management                          │
│  - Access control logic                                  │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

1. The **user** accesses the **web application**, authenticates, and interacts with health data.
2. The **web application** sends requests to the **NodeJS server** via a REST API.
3. The **server** validates the user session, retrieves the relevant private key from its wallet, and submits or evaluates transactions on the Fabric network.
4. **Chaincodes** running on Fabric peers execute the business logic and read/write state to the ledger in HL7 FHIR format.
5. Results are returned through the stack back to the user's browser.

## Repository Layout

| Directory | Purpose |
|---|---|
| `app/` | Web application source code |
| `chaincodes/` | Hyperledger Fabric chaincode source code |
| `dataset/` | HL7 FHIR sample files for testing and experiments |
| `docker/` | Docker Compose files and Dockerfiles for all services |
| `docs/` | Architecture decisions and topic documentation |
| `scripts/` | Bash scripts for setup, deployment, and experiments |
| `server/` | NodeJS backend server source code |
