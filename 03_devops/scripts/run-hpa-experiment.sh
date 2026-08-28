#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
NAMESPACE=${NAMESPACE:-softw-microservices}
BASE_URL=${BASE_URL:-http://127.0.0.1:30081}
RUN_ID=${RUN_ID:-$(date +%Y%m%d-%H%M%S)}
REPORT_DIR="$ROOT/04_tests/reports/performance/raw"
TIMELINE="$REPORT_DIR/hpa-timeline-$RUN_ID.tsv"
SUMMARY="$REPORT_DIR/hpa-k6-summary-$RUN_ID.json"
K6_LOG="$REPORT_DIR/hpa-k6-$RUN_ID.txt"

mkdir -p "$REPORT_DIR"
command -v kubectl >/dev/null || { echo "kubectl 未安装" >&2; exit 1; }
command -v k6 >/dev/null || { echo "k6 未安装" >&2; exit 1; }
kubectl top pods -n "$NAMESPACE" >/dev/null
kubectl apply -f "$ROOT/03_devops/k8s/microservices/03-hpa.yaml" >/dev/null
kubectl scale deployment/product-service -n "$NAMESPACE" --replicas=1 >/dev/null
kubectl rollout status deployment/product-service -n "$NAMESPACE" --timeout=120s >/dev/null
kubectl exec -n "$NAMESPACE" deployment/product-service -- \
  wget -S -O /dev/null "http://127.0.0.1:3102/api/products?burnMs=${BURN_MS:-80}" 2>&1 | \
  grep -qi "X-Experiment-Cpu-Burn-Ms: ${BURN_MS:-80}"

printf 'timestamp\tcpu\tdesiredReplicas\tcurrentReplicas\treadyReplicas\n' > "$TIMELINE"
sample() {
  cpu=$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}' 2>/dev/null || true)
  desired=$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}' 2>/dev/null || true)
  current=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || true)
  ready=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || true)
  printf '%s\t%s\t%s\t%s\t%s\n' "$(date -Iseconds)" "${cpu:-NA}" "${desired:-NA}" "${current:-0}" "${ready:-0}" >> "$TIMELINE"
}
monitor() { while :; do sample; sleep 5; done; }
monitor &
MONITOR_PID=$!
cleanup() { kill "$MONITOR_PID" 2>/dev/null || true; wait "$MONITOR_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "运行 HPA 压测，原始结果写入 $REPORT_DIR"
K6_NO_COLOR=true BASE_URL="$BASE_URL" BURN_MS="${BURN_MS:-80}" \
  k6 run --summary-export "$SUMMARY" "$ROOT/04_tests/performance/k6-hpa-product-burn.js" | tee "$K6_LOG"

echo "等待 HPA 缩回 1 个副本（最长 180 秒）"
deadline=$(( $(date +%s) + 180 ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  desired=$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}')
  current=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
  [ "$desired" = "1" ] && [ "$current" = "1" ] && break
  sleep 5
done
sample
desired=$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}')
current=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
cleanup
trap - EXIT INT TERM

peak=$(awk -F '\t' 'NR>1 && $4+0>max {max=$4+0} END {print max+0}' "$TIMELINE")
echo "HPA 实验完成：峰值副本数=${peak}；时间线=${TIMELINE}；k6 汇总=${SUMMARY}"
test "$peak" -gt 1
test "$desired" = "1"
test "$current" = "1"
