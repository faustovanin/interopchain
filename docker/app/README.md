# Web Application Docker Image

This directory contains the `Dockerfile` for building the Interopchain web application image.

## Build

```bash
docker build -t interopchain-app:latest -f docker/app/Dockerfile .
```

## Run

```bash
docker run -p 8080:80 interopchain-app:latest
```

## Notes

- The image uses a multi-stage build: Node.js to compile the application, then Nginx to serve the static assets.
- The server API base URL must be configured at build time via the `REACT_APP_API_URL` (or equivalent) environment variable.
