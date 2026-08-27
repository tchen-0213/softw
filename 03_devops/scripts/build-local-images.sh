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
DOCKER_BUILDKIT=0 docker build -t softw/microservice-frontend:practice -f frontend/Dockerfile.microservices frontend

if command -v kind >/dev/null 2>&1 && kind get clusters | grep -qx "${KIND_CLUSTER_NAME:-softw-practice}"; then
  kind load docker-image \
    softw/backend:practice \
    softw/frontend:practice \
    softw/api-gateway:practice \
    softw/user-service:practice \
    softw/product-service:practice \
    softw/order-service:practice \
    softw/microservice-frontend:practice \
    --name "${KIND_CLUSTER_NAME:-softw-practice}"
  echo "local images built and loaded into Kind"
else
  echo "local images built with :practice tags"
fi
