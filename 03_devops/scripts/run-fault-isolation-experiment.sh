#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
NAMESPACE=${NAMESPACE:-softw-microservices}
LOCAL_PORT=${LOCAL_PORT:-18081}
BASE_URL=${BASE_URL:-http://127.0.0.1:$LOCAL_PORT}
RUN_ID=${RUN_ID:-$(date +%Y%m%d-%H%M%S)}
REPORT_DIR="$ROOT/04_tests/reports/performance/raw"
REPORT="$REPORT_DIR/fault-isolation-$RUN_ID.txt"
PORT_FORWARD_LOG="$REPORT_DIR/fault-port-forward-$RUN_ID.txt"
PORT_FORWARD_PID=
ORIGINAL_REPLICAS=1

mkdir -p "$REPORT_DIR"
command -v kubectl >/dev/null || { echo "kubectl 未安装" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl 未安装" >&2; exit 1; }

restore() {
  kubectl scale deployment/product-service -n "$NAMESPACE" --replicas="$ORIGINAL_REPLICAS" >/dev/null 2>&1 || true
  kubectl rollout status deployment/product-service -n "$NAMESPACE" --timeout=120s >/dev/null 2>&1 || true
  kubectl apply -f "$ROOT/03_devops/k8s/microservices/03-hpa.yaml" >/dev/null 2>&1 || true
  [ -z "$PORT_FORWARD_PID" ] || kill "$PORT_FORWARD_PID" 2>/dev/null || true
  [ -z "$PORT_FORWARD_PID" ] || wait "$PORT_FORWARD_PID" 2>/dev/null || true
}
trap restore EXIT INT TERM

kubectl get hpa product-service-hpa -n "$NAMESPACE" >/dev/null
kubectl scale deployment/product-service -n "$NAMESPACE" --replicas=1 >/dev/null
kubectl rollout status deployment/product-service -n "$NAMESPACE" --timeout=120s >/dev/null
deadline=$(( $(date +%s) + 120 ))
until [ "$(kubectl get pods -n "$NAMESPACE" -l app=product-service -o name | awk 'END {print NR+0}')" = "1" ]; do
  [ "$(date +%s)" -lt "$deadline" ] || { echo "故障前商品服务未回到单 Pod 基线" >&2; exit 1; }
  sleep 2
done
ORIGINAL_REPLICAS=1

kubectl port-forward --address=0.0.0.0 -n "$NAMESPACE" \
  service/api-gateway "$LOCAL_PORT:8080" >"$PORT_FORWARD_LOG" 2>&1 &
PORT_FORWARD_PID=$!
deadline=$(( $(date +%s) + 30 ))
until curl -fsS "$BASE_URL/live" >/dev/null 2>&1; do
  [ "$(date +%s)" -lt "$deadline" ] || { echo "API 网关端口转发未就绪" >&2; exit 1; }
  sleep 1
done

request() {
  label=$1
  path=$2
  echo "== $label =="
  curl -sS -w '\nHTTP_STATUS=%{http_code}\n' "$BASE_URL$path"
}

{
  echo "故障隔离实验 $RUN_ID"
  echo "context=$(kubectl config current-context)"
  echo "started_at=$(date -Iseconds)"
  echo "== 故障前 HPA、Pod 与资源 =="
  kubectl get hpa,pods -n "$NAMESPACE" -o wide
  kubectl top pods -n "$NAMESPACE"
  request "故障前网关就绪" "/ready"

  echo "== 注入故障：暂停 HPA 并将商品服务缩至 0 =="
  kubectl delete hpa product-service-hpa -n "$NAMESPACE"
  kubectl scale deployment/product-service -n "$NAMESPACE" --replicas=0
  deadline=$(( $(date +%s) + 45 ))
  while [ "$(kubectl get pods -n "$NAMESPACE" -l app=product-service -o name | awk 'END {print NR+0}')" != "0" ]; do
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "商品 Pod 未在 45 秒内优雅退出，强制完成本次故障注入"
      kubectl delete pod -n "$NAMESPACE" -l app=product-service --grace-period=0 --force --wait=false
      break
    fi
    sleep 2
  done
  deadline=$(( $(date +%s) + 30 ))
  until [ "$(kubectl get pods -n "$NAMESPACE" -l app=product-service -o name | awk 'END {print NR+0}')" = "0" ]; do
    [ "$(date +%s)" -lt "$deadline" ] || { echo "商品 Pod 未能停止" >&2; exit 1; }
    sleep 1
  done

  request "商品接口隔离返回" "/api/products"
  request "订单依赖检查预设降级" "/api/orders/health/dependencies"
  request "网关存活探针" "/live"
  echo "== 用户与订单服务存活探针 =="
  kubectl exec -n "$NAMESPACE" deployment/user-service -- wget -qO- http://127.0.0.1:3101/live
  echo
  kubectl exec -n "$NAMESPACE" deployment/order-service -- wget -qO- http://127.0.0.1:3103/live
  echo
  echo "== 故障期间 Deployment 状态 =="
  kubectl get deployment -n "$NAMESPACE"
  echo "== 故障期间网关与订单日志 =="
  kubectl logs -n "$NAMESPACE" deployment/api-gateway --since=2m --tail=80
  kubectl logs -n "$NAMESPACE" deployment/order-service --since=2m --tail=80

  echo "== 恢复商品服务与 HPA =="
  kubectl scale deployment/product-service -n "$NAMESPACE" --replicas="$ORIGINAL_REPLICAS"
  kubectl rollout status deployment/product-service -n "$NAMESPACE" --timeout=120s
  kubectl apply -f "$ROOT/03_devops/k8s/microservices/03-hpa.yaml"
  deadline=$(( $(date +%s) + 60 ))
  until [ "$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}' 2>/dev/null || true)" = "1" ] && \
    [ "$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')" = "1" ] && \
    [ "$(kubectl get pods -n "$NAMESPACE" -l app=product-service -o name | awk 'END {print NR+0}')" = "1" ] && \
    curl -fsS "$BASE_URL/ready" >/dev/null 2>&1; do
    [ "$(date +%s)" -lt "$deadline" ] || { echo "恢复后网关未在时限内 Ready" >&2; exit 1; }
    sleep 2
  done
  kubectl get hpa,pods -n "$NAMESPACE" -o wide
  request "恢复后商品接口" "/api/products"
  request "恢复后网关就绪" "/ready"
  echo "finished_at=$(date -Iseconds)"
} > "$REPORT" 2>&1

cat "$REPORT"
grep -q 'HTTP_STATUS=503' "$REPORT"
grep -q 'HTTP_STATUS=206' "$REPORT"
grep -q '依赖服务暂不可用' "$REPORT"
grep -q '商品信息暂不可用，订单查询保持可用' "$REPORT"
test "$(grep -c 'HTTP_STATUS=200' "$REPORT")" -ge 3
test "$(kubectl get hpa product-service-hpa -n "$NAMESPACE" -o jsonpath='{.spec.minReplicas}')" -ge 1
test "$(kubectl get deployment product-service -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')" -ge 1

trap - EXIT INT TERM
[ -z "$PORT_FORWARD_PID" ] || kill "$PORT_FORWARD_PID" 2>/dev/null || true
[ -z "$PORT_FORWARD_PID" ] || wait "$PORT_FORWARD_PID" 2>/dev/null || true
echo "故障隔离实验完成：$REPORT"
