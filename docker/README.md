# Docker

This directory contains Docker Compose files and Dockerfiles for all Interopchain services.

## Services

| Directory / File | Description |
|---|---|
| `fabric/` | Hyperledger Fabric network (peers, orderers, CAs) |
| `server/` | NodeJS backend server image |
| `app/` | Web application image |
| `docker-compose.yml` | Compose file that brings up all services together |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 20.10
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.0

## Quick Start

Use the helper scripts to manage the environment:

```bash
# Start the full development environment (Fabric network + server + app)
./scripts/start-dev.sh

# Tear down all containers and volumes
docker compose -f docker/docker-compose.yml down -v
```

## Hyperledger Fabric (`fabric/`)

Contains the `docker-compose` configuration for Fabric peers, orderers, and Certificate Authorities, based on the [Fabric test-network](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html) reference.

## NodeJS Server (`server/`)

Contains the `Dockerfile` for building the NodeJS backend server image.

## Web Application (`app/`)

Contains the `Dockerfile` for building the web application image.
