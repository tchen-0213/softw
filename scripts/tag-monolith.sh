#!/usr/bin/env sh
set -eu

TAG_NAME="${1:-monolith-start}"

if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo "tag $TAG_NAME already exists"
  exit 0
fi

git tag -a "$TAG_NAME" -m "Baseline monolith version for 2026 summer practice"
echo "created tag $TAG_NAME"
