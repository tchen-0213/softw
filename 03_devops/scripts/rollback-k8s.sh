#!/bin/sh
set -eu

NAMESPACE=${1:?用法: rollback-k8s.sh NAMESPACE DEPLOYMENT [REVISION]}
DEPLOYMENT=${2:?用法: rollback-k8s.sh NAMESPACE DEPLOYMENT [REVISION]}
REVISION=${3:-}

if [ -n "$REVISION" ]; then
  kubectl -n "$NAMESPACE" rollout undo "deployment/$DEPLOYMENT" --to-revision="$REVISION"
else
  kubectl -n "$NAMESPACE" rollout undo "deployment/$DEPLOYMENT"
fi
kubectl -n "$NAMESPACE" rollout status "deployment/$DEPLOYMENT" --timeout=300s
kubectl -n "$NAMESPACE" get "deployment/$DEPLOYMENT" -o wide
