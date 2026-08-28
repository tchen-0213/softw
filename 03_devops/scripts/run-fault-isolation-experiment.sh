#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
NAMESPACE=${NAMESPACE:-softw-microservices}
BASE_URL=${BASE_URL:-http://127.0.0.1:30081}
RUN_ID=${RUN_ID:-$(date +%Y%m%d-%H%M%S)}
REPORT_DIR="$ROOT/04_tests/reports/performance/raw"
REPORT="$REPORT_DIR/fault-isolation-$RUN_ID.txt"
mkdir -p "$REPORT_DIR"

restore() {
  kubectl scale deployment/product-service -n "$NAMESPACE" --replicas=1 >/dev/null 2>&1 || true
  kubectl rollout status deployment/product-service -n "$NAMESPACE" --timeout=120s >/dev/null 2>&1 || true
  kubectl apply -f "$ROOT/03_devops/k8s/microservices/03-hpa.yaml" >/dev/null 2>&1 || true
}
trap restore EXIT INT TERM

{
  echo "故障隔离实验 $RUN_ID"
  echo "== 故障前 =="
  kubectl get deployment -n "$NAMESPACE"
  curl -sS -w '\nHTTP_STATUS=%{http_code}\n' "$BASE_URL/health"

  echo "== 注入故障：停止商品服务 =="
  kubectl delete hpa product-service-hpa -n "$NAMESPACE" --ignore-not-found
  kubectl scale deployment/product-service -n "$NAMESPACE" --replicas=0
  kubectl wait --for=delete pod -l app=product-service -n "$NAMESPACE" --timeout=120s || true

  echo "== 商品接口：网关超时/隔离返回 =="
  curl -sS -w '\nHTTP_STATUS=%{http_code}\n' "$BASE_URL/api/products"
  echo "== 订单依赖检查：返回预设降级结果 =="
  curl -sS -w '\nHTTP_STATUS=%{http_code}\n' "$BASE_URL/api/orders/health/dependencies"
  echo "== 网关自身和其余服务仍存活 =="
  curl -sS -w '\nHTTP_STATUS=%{http_code}\n' "$BASE_URL/health"
  kubectl get deployment -n "$NAMESPACE"

  echo "== 恢复商品服务与 HPA =="
  restore
  kubectl get hpa product-service-hpa -n "$NAMESPACE"
  curl -sS -w '\nHTTP_STATUS=%{http_code}\n' "$BASE_URL/api/products"
} | tee "$REPORT"

grep -q 'HTTP_STATUS=503' "$REPORT"
grep -q 'HTTP_STATUS=206' "$REPORT"
grep -q 'fallback.*商品信息暂不可用' "$REPORT"
test "$(grep -c 'HTTP_STATUS=200' "$REPORT")" -ge 3
trap - EXIT INT TERM
echo "故障隔离实验完成：$REPORT"
