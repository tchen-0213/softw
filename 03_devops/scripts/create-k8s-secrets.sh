#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
: "${SOFTW_MYSQL_ROOT_PASSWORD:?请设置 SOFTW_MYSQL_ROOT_PASSWORD}"
: "${SOFTW_DB_PASSWORD:?请设置 SOFTW_DB_PASSWORD}"
: "${SOFTW_JWT_SECRET:?请设置 SOFTW_JWT_SECRET}"
: "${SOFTW_INTERNAL_SERVICE_TOKEN:?请设置 SOFTW_INTERNAL_SERVICE_TOKEN}"

kubectl apply -f "$ROOT/03_devops/k8s/monolith/00-namespace.yaml" >/dev/null
kubectl apply -f "$ROOT/03_devops/k8s/microservices/00-namespace.yaml" >/dev/null

kubectl -n softw-practice create secret generic softw-secret \
  --from-literal=DB_PASSWORD="$SOFTW_DB_PASSWORD" \
  --from-literal=MYSQL_ROOT_PASSWORD="$SOFTW_MYSQL_ROOT_PASSWORD" \
  --from-literal=JWT_SECRET="$SOFTW_JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f - >/dev/null

kubectl -n softw-microservices create secret generic softw-microservice-secret \
  --from-literal=DB_PASSWORD="$SOFTW_DB_PASSWORD" \
  --from-literal=MYSQL_ROOT_PASSWORD="$SOFTW_MYSQL_ROOT_PASSWORD" \
  --from-literal=JWT_SECRET="$SOFTW_JWT_SECRET" \
  --from-literal=INTERNAL_SERVICE_TOKEN="$SOFTW_INTERNAL_SERVICE_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f - >/dev/null

echo "Kubernetes 运行密钥已写入两个命名空间，仓库未保存密钥值"
