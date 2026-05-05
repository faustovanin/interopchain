# Documentation

This folder contains documentation for the Interopchain project, including architecture decisions and topic-specific guides.

## Structure

- [`adr/`](adr/) — Architecture Decision Records (ADRs): documents that capture important architectural choices made during the project.
- [`topics/`](topics/) — Topic-specific documentation covering the main components and concepts of the system.

## Topics

| Document | Description |
|---|---|
| [Architecture Overview](topics/architecture-overview.md) | High-level overview of the system architecture |
| [Hyperledger Fabric](topics/hyperledger-fabric.md) | Details on the Hyperledger Fabric blockchain network |
| [Smart Contracts (Chaincodes)](topics/chaincodes.md) | Guide on the Hyperledger Fabric chaincodes used in the project |
| [Server](topics/server.md) | NodeJS server for private key management and authentication |
| [Web Application](topics/app.md) | Web application for end-users |
| [HL7 FHIR Dataset](topics/dataset.md) | HL7 FHIR dataset used in experiments |

## Architecture Decision Records

ADRs are stored in the [`adr/`](adr/) directory following the format `NNNN-title-with-dashes.md`.

See [adr/0001-use-hyperledger-fabric.md](adr/0001-use-hyperledger-fabric.md) for an example.
