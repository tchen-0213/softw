#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

IMAGE_PREFIX="${1:-softw}"
IMAGE_TAG="${2:-$(git rev-parse HEAD)}"
case "$IMAGE_TAG" in
  ""|latest|practice) echo "IMAGE_TAG must be an immutable commit SHA or version" >&2; exit 2 ;;
esac

build_image() {
  image=$1
  context=$2
  dockerfile=$3
  docker build \
    --build-arg SERVICE_VERSION=2.0.0 \
    --build-arg SERVICE_REVISION="$IMAGE_TAG" \
    --build-arg BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -t "$IMAGE_PREFIX/$image:$IMAGE_TAG" -f "$dockerfile" "$context"
}

build_image backend backend backend/Dockerfile
build_image frontend frontend frontend/Dockerfile
build_image microservice-frontend frontend frontend/Dockerfile.microservices
build_image api-gateway services services/api-gateway/Dockerfile
build_image user-service services services/user-service/Dockerfile
build_image product-service services services/product-service/Dockerfile
build_image order-service services services/order-service/Dockerfile

if command -v kind >/dev/null 2>&1 && kind get clusters | grep -qx "${KIND_CLUSTER_NAME:-softw-practice}"; then
  kind load docker-image \
    "$IMAGE_PREFIX/backend:$IMAGE_TAG" \
    "$IMAGE_PREFIX/frontend:$IMAGE_TAG" \
    "$IMAGE_PREFIX/api-gateway:$IMAGE_TAG" \
    "$IMAGE_PREFIX/user-service:$IMAGE_TAG" \
    "$IMAGE_PREFIX/product-service:$IMAGE_TAG" \
    "$IMAGE_PREFIX/order-service:$IMAGE_TAG" \
    "$IMAGE_PREFIX/microservice-frontend:$IMAGE_TAG" \
    --name "${KIND_CLUSTER_NAME:-softw-practice}"
  echo "local images built and loaded into Kind"
else
  echo "local images built with immutable tag $IMAGE_TAG"
fi
