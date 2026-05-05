# NodeJS Server Docker Image

This directory contains the `Dockerfile` for building the Interopchain NodeJS backend server image.

## Build

```bash
docker build -t interopchain-server:latest -f docker/server/Dockerfile .
```

## Run

```bash
docker run --env-file server/.env -p 3000:3000 interopchain-server:latest
```

## Notes

- The image is based on `node:lts-alpine` for a minimal footprint.
- Environment variables (including wallet encryption passphrase and Fabric connection profile path) must be supplied at runtime via an `.env` file or your container orchestration platform's secret management.
- Never bake secrets into the image.
