#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-softw-microservices}"
TAIL_LINES="${TAIL_LINES:-80}"

printf '%s\n' '=== Workloads and probe state ==='
kubectl -n "$NAMESPACE" get deployments,pods,services -o wide

printf '%s\n' '=== Deployed image versions ==='
kubectl -n "$NAMESPACE" get deployments \
  -o custom-columns='DEPLOYMENT:.metadata.name,READY:.status.readyReplicas,IMAGE:.spec.template.spec.containers[*].image'

printf '%s\n' '=== Health, readiness and version endpoints ==='
CHECK_POD="observability-check-$(date +%s)"
kubectl -n "$NAMESPACE" run "$CHECK_POD" \
  --image=curlimages/curl:8.16.0 --restart=Never \
  --command -- sh -ec '
    for endpoint in \
      user-service:3101 \
      product-service:3102 \
      order-service:3103 \
      api-gateway:8080; do
      echo "--- ${endpoint}"
      curl --fail --silent "http://${endpoint}/health"; echo
      curl --fail --silent "http://${endpoint}/ready"; echo
      curl --fail --silent "http://${endpoint}/version"; echo
    done
  '
kubectl -n "$NAMESPACE" wait --for=jsonpath='{.status.phase}'=Succeeded "pod/$CHECK_POD" --timeout=90s
kubectl -n "$NAMESPACE" logs "$CHECK_POD"
kubectl -n "$NAMESPACE" delete pod "$CHECK_POD" --wait=false >/dev/null

printf '%s\n' "=== Recent service logs (last ${TAIL_LINES} lines) ==="
for deployment in user-service product-service order-service api-gateway; do
  printf '%s\n' "--- deployment/${deployment}"
  kubectl -n "$NAMESPACE" logs -l "app=${deployment}" --all-containers --prefix --tail="$TAIL_LINES" --max-log-requests=10 || true
done

printf '%s\n' '=== Recent warning events ==='
kubectl -n "$NAMESPACE" get events --field-selector type=Warning --sort-by=.lastTimestamp || true
