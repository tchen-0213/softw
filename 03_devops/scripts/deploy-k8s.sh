#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
sh "$ROOT/03_devops/scripts/create-k8s-secrets.sh"
kubectl apply -f "$ROOT/03_devops/k8s/monolith"
kubectl apply -f "$ROOT/03_devops/k8s/microservices"

for deployment in mysql backend frontend; do
  kubectl -n softw-practice rollout status "deployment/$deployment" --timeout=300s
done
for deployment in microservice-mysql user-service product-service order-service api-gateway microservice-frontend; do
  kubectl -n softw-microservices rollout status "deployment/$deployment" --timeout=300s
done

sh "$ROOT/03_devops/scripts/k8s-health-check.sh" softw-practice
sh "$ROOT/03_devops/scripts/k8s-health-check.sh" softw-microservices
