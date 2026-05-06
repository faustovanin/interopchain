# Server

The NodeJS backend server for Interopchain. It acts as a secure gateway between the web application and the Hyperledger Fabric network.

## Responsibilities

- **Authentication** — user registration, login, and JWT issuance.
- **Private key management** — maintains a Hyperledger Fabric identity wallet; private keys never leave the server.
- **Transaction gateway** — submits and evaluates Fabric transactions on behalf of authenticated users.
- **REST API** — exposes endpoints consumed by the web application.

## Prerequisites

- Node.js ≥ 18 LTS
- A running Hyperledger Fabric network (see [`docker/`](../docker/README.md) and [`scripts/`](../scripts/README.md))

## Getting Started

```bash
cd server
cp .env.example .env          # Edit .env with your configuration
npm install
npm start
```

The server listens on `http://localhost:3000` by default.

## Project Structure

```
server/
├── src/
│   ├── app.js            # Express application setup
│   ├── auth/             # Authentication middleware and routes
│   ├── fabric/           # Hyperledger Fabric gateway and wallet utilities
│   └── routes/           # API route handlers
├── .env.example          # Example environment variables
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | Secret used to sign JWTs | *(required)* |
| `FABRIC_WALLET_PATH` | Path to the Fabric identity wallet directory | `./wallet` |
| `FABRIC_CONNECTION_PROFILE` | Path to the Fabric connection profile JSON | `./connection-profile.json` |
| `WALLET_ENCRYPTION_KEY` | Passphrase for encrypting the wallet | *(required)* |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Authenticate and receive a JWT |
| `GET` | `/fhir/:resourceType` | Query FHIR resources from the ledger |
| `POST` | `/fhir/:resourceType` | Submit a new FHIR resource to the ledger |
| `GET` | `/health` | Health check endpoint |

## Security Notes

- Never commit `.env` or wallet files to source control.
- Rotate `JWT_SECRET` and `WALLET_ENCRYPTION_KEY` regularly.
- Enable TLS in production deployments.
