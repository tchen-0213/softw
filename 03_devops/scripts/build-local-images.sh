#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

DOCKER_BUILDKIT=0 docker build -t softw/backend:practice backend
DOCKER_BUILDKIT=0 docker build -t softw/frontend:practice frontend
DOCKER_BUILDKIT=0 docker build -t softw/api-gateway:practice -f services/api-gateway/Dockerfile services
DOCKER_BUILDKIT=0 docker build -t softw/user-service:practice -f services/user-service/Dockerfile services
DOCKER_BUILDKIT=0 docker build -t softw/product-service:practice -f services/product-service/Dockerfile services
DOCKER_BUILDKIT=0 docker build -t softw/order-service:practice -f services/order-service/Dockerfile services

echo "local images built with :practice tags"
