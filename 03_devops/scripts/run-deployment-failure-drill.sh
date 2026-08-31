#!/usr/bin/env sh
set -eu

IMAGE_PREFIX=${1:?Usage: run-deployment-failure-drill.sh IMAGE_PREFIX GOOD_TAG [EVIDENCE_DIR]}
GOOD_TAG=${2:?Usage: run-deployment-failure-drill.sh IMAGE_PREFIX GOOD_TAG [EVIDENCE_DIR]}
EVIDENCE_DIR=${3:-04_tests/reports/kubernetes-deployment/failure-drill}
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
NAMESPACE=softw-microservices
DEPLOYMENT=user-service
BAD_TAG="missing-${GOOD_TAG}"
mkdir -p "$ROOT/$EVIDENCE_DIR"

original_image=$(kubectl -n "$NAMESPACE" get "deployment/$DEPLOYMENT" \
  -o jsonpath='{.spec.template.spec.containers[0].image}')
echo "original_image=$original_image" | tee "$ROOT/$EVIDENCE_DIR/summary.txt"

kubectl -n "$NAMESPACE" set image "deployment/$DEPLOYMENT" \
  "user-service=$IMAGE_PREFIX/user-service:$BAD_TAG" \
  2>&1 | tee "$ROOT/$EVIDENCE_DIR/inject-invalid-image.txt"

if kubectl -n "$NAMESPACE" rollout status "deployment/$DEPLOYMENT" --timeout=60s \
  > "$ROOT/$EVIDENCE_DIR/expected-rollout-failure.txt" 2>&1; then
  echo "failure drill unexpectedly deployed the missing image" >&2
  exit 1
fi
echo "Expected rollout failure detected for $IMAGE_PREFIX/user-service:$BAD_TAG" \
  | tee -a "$ROOT/$EVIDENCE_DIR/summary.txt"

sh "$ROOT/03_devops/scripts/k8s-collect-failure.sh" "$NAMESPACE" "$ROOT/$EVIDENCE_DIR/diagnostics"
sh "$ROOT/03_devops/scripts/rollback-k8s.sh" "$NAMESPACE" "$DEPLOYMENT" "" "$GOOD_TAG" \
  2>&1 | tee "$ROOT/$EVIDENCE_DIR/rollback.txt"

restored_image=$(kubectl -n "$NAMESPACE" get "deployment/$DEPLOYMENT" \
  -o jsonpath='{.spec.template.spec.containers[0].image}')
if [ "$restored_image" != "$original_image" ]; then
  echo "rollback restored $restored_image instead of $original_image" >&2
  exit 1
fi
echo "restored_image=$restored_image" | tee -a "$ROOT/$EVIDENCE_DIR/summary.txt"
