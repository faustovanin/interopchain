# Web Application

## Overview

The web application is the end-user interface for Interopchain. Its source code lives in [`app/`](../../app/README.md).

## Features

- **Authentication** — user registration and log-in flows backed by the NodeJS server.
- **Blockchain data display** — query and display data returned by Smart Contracts (chaincodes) running on the Hyperledger Fabric network.
- **QR Code reader** — scan QR codes to retrieve patient identifiers or transaction references.
- **Transaction signing** — allow users to review and sign blockchain transactions.
- **Server communication** — all blockchain interactions are proxied through the NodeJS server REST API.

## Getting Started

```bash
cd app
npm install
npm start
```

See [`app/README.md`](../../app/README.md) for full configuration details.
