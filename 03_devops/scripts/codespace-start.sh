#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

docker compose -f 03_devops/docker-compose.yml up -d --build --wait

if [ -n "${CODESPACE_NAME:-}" ]; then
  API_ORIGIN="https://${CODESPACE_NAME}-3001.app.github.dev"
  printf 'Codespaces backend: %s\n' "$API_ORIGIN"
  printf 'Health check: %s/api/health\n' "$API_ORIGIN"
else
  printf '%s\n' 'Backend: http://localhost:3001'
  printf '%s\n' 'Health check: http://localhost:3001/api/health'
fi
