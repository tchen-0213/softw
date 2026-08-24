#!/usr/bin/env sh
set -eu

npm --prefix backend test
npm --prefix frontend run build

echo "local verification passed"
