#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-softw-microservices}"
OUTPUT_DIR="${2:-04_tests/reports/kubernetes-failure}"
mkdir -p "$OUTPUT_DIR"

redact() {
  sed -E \
    -e 's/(PASSWORD|SECRET|TOKEN):[[:space:]]+[^[:space:]]+/\1: [REDACTED]/g' \
    -e 's/(root_password|softw_password|microservice_dev_secret|microservice_internal_token)/[REDACTED]/g'
}

kubectl -n "$NAMESPACE" get all -o wide 2>&1 | redact > "$OUTPUT_DIR/workloads.txt" || true
kubectl -n "$NAMESPACE" get events --sort-by=.lastTimestamp 2>&1 | redact > "$OUTPUT_DIR/events.txt" || true
kubectl -n "$NAMESPACE" describe pods 2>&1 | redact > "$OUTPUT_DIR/pods-describe.txt" || true
kubectl -n "$NAMESPACE" describe deployments 2>&1 | redact > "$OUTPUT_DIR/deployments-describe.txt" || true

for deployment in user-service product-service order-service api-gateway microservice-frontend; do
  kubectl -n "$NAMESPACE" logs "deployment/$deployment" --all-containers --prefix --tail=300 2>&1 \
    | redact > "$OUTPUT_DIR/${deployment}.log" || true
  kubectl -n "$NAMESPACE" logs "deployment/$deployment" --all-containers --prefix --tail=300 --previous 2>&1 \
    | redact > "$OUTPUT_DIR/${deployment}-previous.log" || true
done

printf 'Kubernetes diagnostics written to %s\n' "$OUTPUT_DIR"
