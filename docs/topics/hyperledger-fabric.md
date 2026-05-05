# Hyperledger Fabric

## Overview

[Hyperledger Fabric](https://hyperledger-fabric.readthedocs.io/) is the permissioned blockchain platform used by Interopchain to store and manage healthcare data. The network is containerised using Docker (see [`docker/`](../../docker/README.md)).

## Network Components

| Component | Description |
|---|---|
| **Peer** | Hosts the ledger and executes chaincodes |
| **Orderer** | Orders transactions and creates blocks |
| **Certificate Authority (CA)** | Issues identities (X.509 certificates) to network participants |
| **Channel** | Private sub-network scoped to a set of peers |

## Channels

Channels provide data isolation between organisations. Each channel has its own ledger, and only members of a channel can see its transactions.

## Private Data Collections

Sensitive FHIR resources that must not be visible to all channel members can be stored in private data collections. Only explicitly authorised organisations can access the data; only a hash is recorded on the public ledger.

## Identity Management

Each participant (user or service) has an X.509 certificate issued by an organisation's CA. The NodeJS server manages an **identity wallet** and uses these certificates to submit transactions on behalf of authenticated users.

## Getting Started

Refer to the scripts in [`scripts/`](../../scripts/README.md) to bring up a local development network:

```bash
./scripts/start-dev.sh
```
