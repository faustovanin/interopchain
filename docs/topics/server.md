# NodeJS Server

## Overview

The NodeJS backend server acts as a secure gateway between the web application and the Hyperledger Fabric network. Its source code lives in [`server/`](../../server/README.md).

## Responsibilities

- **Authentication** — verify user credentials and issue session tokens (JWT).
- **Private key management** — maintain a Fabric identity wallet; private keys never leave the server.
- **Transaction gateway** — forward signed transactions to the Fabric network on behalf of authenticated users.
- **REST API** — expose endpoints consumed by the web application.

## Security Considerations

- Private keys are stored in an encrypted wallet; the encryption passphrase is provided via environment variables and never committed to source control.
- All API endpoints require a valid JWT.
- TLS is required for communication between the server and the Fabric peers.

## Getting Started

```bash
cd server
npm install
npm start
```

See [`server/README.md`](../../server/README.md) for full configuration and environment variable details.
