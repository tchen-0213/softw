#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
NAMESPACE=${NAMESPACE:-softw-microservices}
LOCAL_PORT=${LOCAL_PORT:-3102}
BASE_URL=${BASE_URL:-http://127.0.0.1:$LOCAL_PORT}
DOCKER_BASE_URL=${K6_DOCKER_BASE_URL:-http://host.docker.internal:$LOCAL_PORT}
BURN_MS=${BURN_MS:-80}
RUN_ID=${RUN_ID:-$(date +%Y%m%d-%H%M%S)}
REPORT_DIR="$ROOT/04_tests/reports/performance/raw"
TIMELINE="$REPORT_DIR/hpa-timeline-$RUN_ID.tsv"
SUMMARY="$REPORT_DIR/hpa-k6-summary-$RUN_ID.json"
K6_LOG="$REPORT_DIR/hpa-k6-$RUN_ID.txt"
STATE_LOG="$REPORT_DIR/hpa-state-$RUN_ID.txt"
PORT_FORWARD_LOG="$REPORT_DIR/hpa-port-forward-$RUN_ID.txt"
MONITOR_PID=
PORT_FORWARD_PID=

mkdir -p "$REPORT_DIR"
command -v kubectl >/dev/null || { echo "kubectl 未安装" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl 未安装" >&2; exit 1; }

restore() {
  [ -z "$MONITOR_PID" ] || kill "$MONITOR_PID" 2>/dev/null || true
  [ -z "$MONITOR_PID" ] || wait "$MONITOR_PID" 2>/dev/null || true
  [ -z "$PORT_FORWARD_PID" ] || kill "$PORT_FORWARD_PID" 2>/dev/null || true
  [ -z "$PORT_FORWARD_PID" ] || wait "$PORT_FORWARD_PID" 2>/dev/null || true
  kubectl apply -f "$ROOT/03_devops/k8s/microservices/03-hpa.yaml" >/dev/null 2>&1 || true
  kubectl scale deployment/product-service -n "$NAMESPACE" --replicas=1 >/dev/null 2>&1 || true
}
trap restore EXIT

kubectl get namespace "$NAMESPACE" >/dev/null
kubectl top pods -n "$NAMESPACE" >/dev/null
kubectl apply -f "$ROOT/03_devops/k8s/microservices/03-hpa.yaml" >/dev/null
kubectl scale deployment/product-service -n "$NAMESPACE" --replicas=1 >/dev/null
kubectl rollout status deployment/product-service -n "$NAMESPACE" --timeout=120s >/dev/null

if ! curl -fsS "$BASE_URL/live" >/dev/null 2>&1; then
  kubectl port-forward --address=0.0.0.0 -n "$NAMESPACE" \
    service/product-service "$LOCAL_PORT:3102" >"$PORT_FORWARD_LOG" 2>&1 &
  PORT_FORWARD_PID=$!
  deadline=$(( $(date +%s) + 30 ))
  until curl -fsS "$BASE_URL/live" >/dev/null 2>&1; do
    [ "$(date +%s)" -lt "$deadline" ] || { echo "商品服务端口转发未就绪" >&2; exit 1; }
    sleep 1
  done
fi

curl -fsS -D - -o /dev/null "$BASE_URL/api/products?burnMs=$BURN_MS" | \
  grep -qi "X-Experiment-Cpu-Burn-Ms: $BURN_MS"

{
  echo "run_id=$RUN_ID"
  echo "started_at=$(date -Iseconds)"
  echo "context=$(kubectl config current-context)"
  echo "kubernetes=$(kubectl version -o json 2>/dev/null | tr -d '\n')"
  echo "metrics_server=$(kubectl get deployment metrics-server -n kube-system -o jsonpath='{.spec.template.spec.containers[0].image}')"
  echo "product_image=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')"
  echo "product_resources=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources}')"
  echo "== before hpa,pods =="
  kubectl get hpa,pods -n "$NAMESPACE" -o wide
  echo "== before resource usage =="
  kubectl top pods -n "$NAMESPACE"
} > "$STATE_LOG"

printf 'timestamp\tcpuPercent\tcpuMillicores\tmemoryMi\tdesiredReplicas\tcurrentReplicas\treadyReplicas\tactualPods\n' > "$TIMELINE"
sample() {
  cpu_percent=$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}' 2>/dev/null || true)
  desired=$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}' 2>/dev/null || true)
  current=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || true)
  ready=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || true)
  actual=$(kubectl get pods -n "$NAMESPACE" -l app=product-service -o name 2>/dev/null | awk 'END {print NR+0}')
  usage=$(kubectl top pods -n "$NAMESPACE" -l app=product-service --no-headers 2>/dev/null || true)
  cpu_m=$(printf '%s\n' "$usage" | awk 'NF>=3 {v=$2; sub(/m$/, "", v); total+=v} END {print total+0}')
  memory_mi=$(printf '%s\n' "$usage" | awk 'NF>=3 {v=$3; if (v ~ /Mi$/) {sub(/Mi$/, "", v); total+=v} else if (v ~ /Ki$/) {sub(/Ki$/, "", v); total+=v/1024} else if (v ~ /Gi$/) {sub(/Gi$/, "", v); total+=v*1024}} END {printf "%.2f", total+0}')
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -Iseconds)" "${cpu_percent:-NA}" "${cpu_m:-0}" "${memory_mi:-0}" "${desired:-NA}" "${current:-0}" "${ready:-0}" "${actual:-0}" >> "$TIMELINE"
}
monitor() { while :; do sample; sleep 5; done; }
monitor &
MONITOR_PID=$!

run_k6() {
  if command -v k6 >/dev/null 2>&1; then
    K6_NO_COLOR=true BASE_URL="$BASE_URL" BURN_MS="$BURN_MS" \
      k6 run --summary-export "$SUMMARY" "$ROOT/04_tests/performance/k6-hpa-product-burn.js"
    return
  fi
  command -v docker >/dev/null || { echo "k6 和 Docker 均未安装" >&2; return 1; }
  docker_report_dir=$(cygpath -w "$REPORT_DIR" 2>/dev/null || printf '%s' "$REPORT_DIR")
  docker_script_dir=$(cygpath -w "$ROOT/04_tests/performance" 2>/dev/null || printf '%s' "$ROOT/04_tests/performance")
  MSYS_NO_PATHCONV=1 docker run --rm --add-host host.docker.internal:host-gateway \
    -e K6_NO_COLOR=true -e "BASE_URL=$DOCKER_BASE_URL" -e "BURN_MS=$BURN_MS" \
    --mount "type=bind,src=$docker_report_dir,dst=/results" \
    --mount "type=bind,src=$docker_script_dir,dst=/scripts,readonly" \
    "${K6_DOCKER_IMAGE:-grafana/k6:2.2.0}" run \
    --summary-export "/results/$(basename "$SUMMARY")" /scripts/k6-hpa-product-burn.js
}

echo "运行 HPA 压测，原始结果写入 $REPORT_DIR"
k6_status=0
run_k6 > "$K6_LOG" 2>&1 || k6_status=$?
cat "$K6_LOG"
[ "$k6_status" -eq 0 ] || { echo "k6 压测失败，退出码=$k6_status" >&2; exit "$k6_status"; }

echo "等待 HPA 缩回 1 个副本（最长 300 秒）"
deadline=$(( $(date +%s) + 300 ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  desired=$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}')
  current=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
  ready=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
  actual=$(kubectl get pods -n "$NAMESPACE" -l app=product-service -o name | awk 'END {print NR+0}')
  [ "$desired" = "1" ] && [ "$current" = "1" ] && [ "$ready" = "1" ] && [ "$actual" = "1" ] && break
  sleep 5
done
sample
desired=$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}')
current=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
ready=$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
actual=$(kubectl get pods -n "$NAMESPACE" -l app=product-service -o name | awk 'END {print NR+0}')
peak=$(awk -F '\t' 'NR>1 && $6+0>max {max=$6+0} END {print max+0}' "$TIMELINE")

{
  echo "== after hpa,pods =="
  kubectl get hpa,pods -n "$NAMESPACE" -o wide
  echo "== after resource usage =="
  kubectl top pods -n "$NAMESPACE"
  echo "== hpa events =="
  kubectl describe hpa product-service-hpa -n "$NAMESPACE"
  echo "finished_at=$(date -Iseconds)"
  echo "peak_replicas=$peak"
} >> "$STATE_LOG"

[ "$peak" -gt 1 ]
[ "$desired" = "1" ]
[ "$current" = "1" ]
[ "$ready" = "1" ]
[ "$actual" = "1" ]
echo "HPA 实验完成：峰值副本数=$peak；时间线=$TIMELINE；k6 汇总=$SUMMARY"
restore
trap - EXIT INT TERM
