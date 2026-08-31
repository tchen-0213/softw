#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
IMAGE_PREFIX=${1:?Usage: deploy-k8s.sh IMAGE_PREFIX IMAGE_TAG [EVIDENCE_DIR]}
IMAGE_TAG=${2:?Usage: deploy-k8s.sh IMAGE_PREFIX IMAGE_TAG [EVIDENCE_DIR]}
EVIDENCE_DIR=${3:-04_tests/reports/kubernetes-deployment}
case "$IMAGE_TAG" in
  latest|practice) echo "IMAGE_TAG must be an immutable commit SHA or version" >&2; exit 2 ;;
esac

mkdir -p "$ROOT/$EVIDENCE_DIR"
sh "$ROOT/03_devops/scripts/create-k8s-secrets.sh"
kubectl apply -f "$ROOT/03_devops/k8s/monolith"
kubectl apply -f "$ROOT/03_devops/k8s/microservices"

kubectl -n softw-practice set image deployment/backend \
  "backend=$IMAGE_PREFIX/backend:$IMAGE_TAG"
kubectl -n softw-practice set image deployment/frontend \
  "frontend=$IMAGE_PREFIX/frontend:$IMAGE_TAG"
kubectl -n softw-microservices set image deployment/user-service \
  "user-service=$IMAGE_PREFIX/user-service:$IMAGE_TAG"
kubectl -n softw-microservices set image deployment/product-service \
  "product-service=$IMAGE_PREFIX/product-service:$IMAGE_TAG"
kubectl -n softw-microservices set image deployment/order-service \
  "order-service=$IMAGE_PREFIX/order-service:$IMAGE_TAG"
kubectl -n softw-microservices set image deployment/api-gateway \
  "api-gateway=$IMAGE_PREFIX/api-gateway:$IMAGE_TAG"
kubectl -n softw-microservices set image deployment/microservice-frontend \
  "frontend=$IMAGE_PREFIX/microservice-frontend:$IMAGE_TAG"

{
  for deployment in mysql backend frontend; do
    kubectl -n softw-practice rollout status "deployment/$deployment" --timeout=300s
  done
  for deployment in microservice-mysql user-service product-service order-service api-gateway microservice-frontend; do
    kubectl -n softw-microservices rollout status "deployment/$deployment" --timeout=300s
  done
} 2>&1 | tee "$ROOT/$EVIDENCE_DIR/rollout.txt"

sh "$ROOT/03_devops/scripts/k8s-health-check.sh" softw-practice "$IMAGE_TAG" \
  2>&1 | tee "$ROOT/$EVIDENCE_DIR/monolith-health.txt"
sh "$ROOT/03_devops/scripts/k8s-health-check.sh" softw-microservices "$IMAGE_TAG" \
  2>&1 | tee "$ROOT/$EVIDENCE_DIR/microservices-health-version.txt"

{
  echo "image_prefix=$IMAGE_PREFIX"
  echo "image_tag=$IMAGE_TAG"
  kubectl -n softw-practice get deployments -o wide
  kubectl -n softw-microservices get deployments -o wide
  kubectl -n softw-practice get deployments -o jsonpath='{range .items[*]}{.metadata.name}{"="}{range .spec.template.spec.containers[*]}{.image}{" "}{end}{"\n"}{end}'
  kubectl -n softw-microservices get deployments -o jsonpath='{range .items[*]}{.metadata.name}{"="}{range .spec.template.spec.containers[*]}{.image}{" "}{end}{"\n"}{end}'
} > "$ROOT/$EVIDENCE_DIR/deployed-images.txt"
