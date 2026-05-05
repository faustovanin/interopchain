# ADR 0001 — Use Hyperledger Fabric as the Blockchain Platform

**Date:** 2026-05-05
**Status:** Accepted

## Context

The Interopchain project requires a permissioned blockchain platform that:
- Supports smart contracts (chaincodes) written in Go or JavaScript.
- Is suitable for healthcare data interoperability scenarios.
- Provides identity management and fine-grained access control.
- Supports private data collections for sensitive health records.

## Decision

We will use **Hyperledger Fabric** as the underlying blockchain platform.

## Rationale

- Hyperledger Fabric is a permissioned blockchain, which suits regulated healthcare environments.
- It supports chaincode development in Go, Node.js, and Java.
- Its channel and private data collection features allow selective data sharing between organisations.
- It is widely adopted in enterprise and research contexts, with extensive documentation and community support.
- The modular architecture enables pluggable consensus mechanisms and identity providers.

## Consequences

- The development environment requires Docker and the Hyperledger Fabric binaries.
- Chaincode must be developed and tested against the Fabric SDK.
- Network setup (peers, orderers, CAs) adds operational complexity compared to public blockchains.
