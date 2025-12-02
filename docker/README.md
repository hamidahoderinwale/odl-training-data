# Docker Configuration

This directory contains all Docker-related files for the project.

## Files

- `Dockerfile` - Production Docker image
- `Dockerfile.dev` - Development Docker image with hot reload
- `Dockerfile.python` - Python services Docker image
- `docker-compose.yml` - Production Docker Compose configuration
- `docker-compose.dev.yml` - Development Docker Compose configuration
- `.dockerignore` - Docker ignore patterns

## Usage

From the project root:

```bash
# Development
docker-compose -f docker/docker-compose.dev.yml up --build

# Production
docker-compose -f docker/docker-compose.yml up --build
```
