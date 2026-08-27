#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-softw-practice}"

kubectl -n "$NAMESPACE" get pods
kubectl -n "$NAMESPACE" get svc
kubectl -n "$NAMESPACE" get deployments -o name | while IFS= read -r deployment; do
  kubectl -n "$NAMESPACE" rollout status "$deployment" --timeout=300s
done

if [ "$NAMESPACE" = "softw-microservices" ]; then
  kubectl -n "$NAMESPACE" run gateway-healthcheck \
    --image=curlimages/curl:8.16.0 --restart=Never --rm -i \
    --command -- curl --fail --silent http://api-gateway:8080/health
  kubectl -n "$NAMESPACE" run frontend-healthcheck \
    --image=curlimages/curl:8.16.0 --restart=Never --rm -i \
    --command -- curl --fail --silent http://microservice-frontend/
else
  kubectl -n "$NAMESPACE" run backend-healthcheck \
    --image=curlimages/curl:8.16.0 --restart=Never --rm -i \
    --command -- curl --fail --silent http://backend:3001/api/health
fi
