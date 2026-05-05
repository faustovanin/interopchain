# ADR 0002 — Use NodeJS for the Backend Server

**Date:** 2026-05-05
**Status:** Accepted

## Context

The project needs a backend server to:
- Manage user authentication and authorisation.
- Securely store and handle private keys for blockchain identities.
- Act as a gateway between the web application and the Hyperledger Fabric network.

## Decision

We will use **Node.js** (with the Hyperledger Fabric Node SDK) for the backend server.

## Rationale

- The Hyperledger Fabric SDK for Node.js is mature and actively maintained.
- Node.js is well-suited for I/O-intensive applications such as blockchain gateways.
- A JavaScript/TypeScript stack enables code sharing with the frontend web application.
- There is broad community support for authentication libraries (e.g., Passport.js, JWT).

## Consequences

- Private keys must be stored securely on the server (e.g., using an HSM or an encrypted wallet).
- The server must implement proper authentication flows before forwarding transactions to the Fabric network.
- Developers need familiarity with async/await patterns and the Fabric Node SDK.
