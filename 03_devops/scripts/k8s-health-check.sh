#!/usr/bin/env sh
set -eu

NAMESPACE="${1:-softw-practice}"
EXPECTED_REVISION="${2:-}"

kubectl -n "$NAMESPACE" get pods
kubectl -n "$NAMESPACE" get svc
kubectl -n "$NAMESPACE" get deployments -o name | while IFS= read -r deployment; do
  kubectl -n "$NAMESPACE" rollout status "$deployment" --timeout=300s
done

if [ "$NAMESPACE" = "softw-microservices" ]; then
  kubectl -n "$NAMESPACE" delete pod service-contract-check --ignore-not-found >/dev/null
  revision_arg=""
  if [ -n "$EXPECTED_REVISION" ]; then
    revision_arg="--env=EXPECTED_REVISION=$EXPECTED_REVISION"
  fi
  # shellcheck disable=SC2086
  kubectl -n "$NAMESPACE" run service-contract-check \
    --image=curlimages/curl:8.16.0 --restart=Never --rm -i $revision_arg \
    --command -- sh -ec '
      for endpoint in user-service:3101 product-service:3102 order-service:3103 api-gateway:8080; do
        curl --fail --silent "http://${endpoint}/health"
        curl --fail --silent "http://${endpoint}/ready"
        version=$(curl --fail --silent "http://${endpoint}/version")
        echo "$version"
        if [ -n "${EXPECTED_REVISION:-}" ]; then
          echo "$version" | grep -F "$EXPECTED_REVISION"
        fi
      done
    '
  kubectl -n "$NAMESPACE" delete pod gateway-healthcheck --ignore-not-found >/dev/null
  kubectl -n "$NAMESPACE" run gateway-healthcheck \
    --image=curlimages/curl:8.16.0 --restart=Never --rm -i \
    --command -- curl --fail --silent http://api-gateway:8080/health
  kubectl -n "$NAMESPACE" run frontend-healthcheck \
    --image=curlimages/curl:8.16.0 --restart=Never --rm -i \
    --command -- curl --fail --silent http://microservice-frontend/
else
  kubectl -n "$NAMESPACE" delete pod backend-healthcheck --ignore-not-found >/dev/null
  kubectl -n "$NAMESPACE" run backend-healthcheck \
    --image=curlimages/curl:8.16.0 --restart=Never --rm -i \
    --command -- curl --fail --silent http://backend:3001/api/health
fi
