#!/bin/sh
set -eu

NAMESPACE=${1:?Usage: rollback-k8s.sh NAMESPACE DEPLOYMENT [REVISION] [EXPECTED_IMAGE_TAG]}
DEPLOYMENT=${2:?Usage: rollback-k8s.sh NAMESPACE DEPLOYMENT [REVISION] [EXPECTED_IMAGE_TAG]}
REVISION=${3:-}
EXPECTED_IMAGE_TAG=${4:-}

if [ -n "$REVISION" ]; then
  kubectl -n "$NAMESPACE" rollout undo "deployment/$DEPLOYMENT" --to-revision="$REVISION"
else
  kubectl -n "$NAMESPACE" rollout undo "deployment/$DEPLOYMENT"
fi
kubectl -n "$NAMESPACE" rollout status "deployment/$DEPLOYMENT" --timeout=300s
kubectl -n "$NAMESPACE" rollout history "deployment/$DEPLOYMENT"
image=$(kubectl -n "$NAMESPACE" get "deployment/$DEPLOYMENT" -o jsonpath='{.spec.template.spec.containers[0].image}')
echo "rolled_back_image=$image"
if [ -n "$EXPECTED_IMAGE_TAG" ]; then
  case "$image" in
    *:"$EXPECTED_IMAGE_TAG") ;;
    *) echo "rollback image $image does not match expected tag $EXPECTED_IMAGE_TAG" >&2; exit 1 ;;
  esac
fi

if [ "$NAMESPACE" = "softw-microservices" ]; then
  sh "$(CDPATH= cd -- "$(dirname "$0")" && pwd)/k8s-health-check.sh" "$NAMESPACE" "$EXPECTED_IMAGE_TAG"
else
  kubectl -n "$NAMESPACE" get "deployment/$DEPLOYMENT" -o wide
fi
