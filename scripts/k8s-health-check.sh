#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-softw-practice}"

kubectl -n "$NAMESPACE" get pods
kubectl -n "$NAMESPACE" get svc
kubectl -n "$NAMESPACE" rollout status deploy/backend || true
kubectl -n "$NAMESPACE" rollout status deploy/frontend || true
