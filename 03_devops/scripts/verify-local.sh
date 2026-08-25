#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

npm --prefix backend test
npm --prefix frontend run build

echo "local verification passed"
