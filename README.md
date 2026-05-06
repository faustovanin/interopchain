# Interopchain

Repositório do projeto de pesquisa **Interopchain** — uma plataforma de interoperabilidade de dados de saúde baseada em Hyperledger Fabric e HL7 FHIR.

## Overview

Interopchain enables secure, auditable sharing of healthcare records (HL7 FHIR resources) across organisations using a permissioned Hyperledger Fabric blockchain. A NodeJS backend server manages identities and acts as a Fabric gateway, while a web application provides an end-user interface for querying data, reading QR codes, and signing transactions.

## Repository Structure

| Directory | Description |
|---|---|
| [`app/`](app/README.md) | Web application (login, blockchain data display, QR code reader, transaction signing) |
| [`chaincodes/`](chaincodes/README.md) | Hyperledger Fabric chaincodes (smart contracts) for FHIR resource management |
| [`dataset/`](dataset/README.md) | Sample HL7 FHIR files used for testing and experiments |
| [`docker/`](docker/README.md) | Docker Compose files and Dockerfiles for all services |
| [`docs/`](docs/README.md) | Architecture Decision Records (ADRs) and topic documentation |
| [`scripts/`](scripts/README.md) | Bash scripts for setup, deployment, experiments, and the development environment |
| [`server/`](server/README.md) | NodeJS backend server (authentication, private key management, Fabric gateway) |

## Quick Start

```bash
# 1. One-time setup (generates crypto material and channel artifacts)
./scripts/setup.sh

# 2. Start the full development environment
./scripts/start-dev.sh
```

See the [`docs/`](docs/README.md) directory for architecture documentation and [`scripts/README.md`](scripts/README.md) for full usage instructions.

## Documentation

- [Architecture Overview](docs/topics/architecture-overview.md)
- [Hyperledger Fabric](docs/topics/hyperledger-fabric.md)
- [Smart Contracts (Chaincodes)](docs/topics/chaincodes.md)
- [NodeJS Server](docs/topics/server.md)
- [Web Application](docs/topics/app.md)
- [HL7 FHIR Dataset](docs/topics/dataset.md)

## License

This project is licensed under the [Apache 2.0 License](LICENSE).
