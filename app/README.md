# App

The Interopchain web application — a browser-based interface that allows users to interact with the Hyperledger Fabric blockchain via the NodeJS backend server.

## Features

- **Authentication** — user registration and log-in flows.
- **Blockchain data display** — query and display HL7 FHIR data returned by Smart Contracts (chaincodes).
- **QR Code reader** — scan QR codes to retrieve patient identifiers or transaction references.
- **Transaction signing** — review and sign blockchain transactions before submission.
- **Server communication** — all blockchain interactions are proxied through the NodeJS server REST API.

## Prerequisites

- Node.js ≥ 18 LTS
- PostgreSQL inicializado com [`data-steward/sql/init.sql`](../data-steward/sql/init.sql)
- AWS KMS com permissão `kms:CreateKey` para a API

## Getting Started

```bash
cd app
cp .env.example .env        # Edite as credenciais do banco, JWT e AWS
npm install
npm start
```

Em outro terminal, inicie a API:

```bash
npm run server
```

A interface fica em `http://localhost:3001` e a API em `http://localhost:3002`.

## API REST

- `POST /api/auth/register` — cria o paciente, gera o hash da senha e cria a chave simétrica no AWS KMS.
- `POST /api/auth/login` — autentica por e-mail e senha e retorna um JWT.
- `GET /api/patients/me` — retorna o perfil autenticado; requer `Authorization: Bearer <token>`.
- `GET /api/patients/me/resources` — lista os recursos clínicos do paciente autenticado.
- `PATCH /api/patients/me/consent` — atualiza o consentimento com `{"status":"granted"}` ou `{"status":"revoked"}`.
- `GET /api/health` — verifica a disponibilidade da API.

O backend nunca retorna `password_hash` nem expõe `kms_key_id` para o navegador. Configure `JWT_SECRET` com um valor longo e aleatório.

## Project Structure

```
app/
├── server/              # API REST, autenticação, PostgreSQL e AWS KMS
├── src/
│   ├── index.js            # Application entry point
│   ├── components/         # Reusable UI components
│   │   ├── Auth/           # Login and registration forms
│   │   ├── Dashboard/      # Blockchain data display
│   │   ├── QRCodeReader/   # QR code scanning component
│   │   └── TransactionSigner/ # Transaction review and signing
│   ├── styles.css          # Visual
│   └── App.js              # Login, register
├── public/
├── .env.example
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `REACT_APP_API_URL` | Base URL of the NodeJS server REST API | `http://localhost:3002` |
| `PORT` | Port for the development server | `3001` |
