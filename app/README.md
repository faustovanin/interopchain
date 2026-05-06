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
- The NodeJS server running (see [`server/`](../server/README.md))

## Getting Started

```bash
cd app
cp .env.example .env        # Edit .env with your configuration
npm install
npm start
```

The application is available at `http://localhost:3001` by default.

## Project Structure

```
app/
├── src/
│   ├── index.js            # Application entry point
│   ├── components/         # Reusable UI components
│   │   ├── Auth/           # Login and registration forms
│   │   ├── Dashboard/      # Blockchain data display
│   │   ├── QRCodeReader/   # QR code scanning component
│   │   └── TransactionSigner/ # Transaction review and signing
│   ├── services/           # API client for the server
│   └── App.js              # Root application component
├── public/
├── .env.example
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `REACT_APP_API_URL` | Base URL of the NodeJS server REST API | `http://localhost:3000` |
| `PORT` | Port for the development server | `3001` |
