#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
RUN_ID=${RUN_ID:-2026-08-28}
RAW_DIR="$ROOT/04_tests/reports/performance/raw/interface-comparison-$RUN_ID"
CSV="$ROOT/04_tests/reports/performance/interface-comparison-$RUN_ID.csv"
mkdir -p "$RAW_DIR"

cleanup() { "$ROOT/03_devops/scripts/prepare-performance-data.sh" clean >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

"$ROOT/03_devops/scripts/prepare-performance-data.sh" seed | tee "$RAW_DIR/dataset-verification.txt"

run_case() {
  local version=$1 endpoint=$2 run=$3 base_url containers stats_file prefix monitor_pid
  prefix="$RAW_DIR/$version-$endpoint-run$run"
  if [[ $version == monolith ]]; then
    base_url=http://127.0.0.1:3001
    containers=(softw-backend softw-mysql)
  else
    base_url=http://127.0.0.1:8081
    containers=(softw-microservices-api-gateway-1 softw-microservices-product-service-1 softw-microservices-mysql-1)
  fi

  curl -fsS "$base_url/api/products/990001" >/dev/null
  stats_file="$prefix-stats.tsv"
  printf 'timestamp\tcontainer\tcpu\tmemory\n' > "$stats_file"
  (
    while :; do
      timestamp=$(date -Iseconds)
      docker stats --no-stream --format "$timestamp\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" "${containers[@]}" >> "$stats_file"
      sleep 1
    done
  ) &
  monitor_pid=$!

  echo "[$version][$endpoint][run $run]"
  if ! K6_NO_COLOR=true BASE_URL="$base_url" ENDPOINT="$endpoint" VUS=5 DURATION=20s \
    k6 run --summary-export "$prefix.json" "$ROOT/04_tests/performance/k6-interface-comparison.js" > "$prefix.txt" 2>&1; then
    kill "$monitor_pid" 2>/dev/null || true
    wait "$monitor_pid" 2>/dev/null || true
    cat "$prefix.txt"
    return 1
  fi
  kill "$monitor_pid" 2>/dev/null || true
  wait "$monitor_pid" 2>/dev/null || true
}

for run in 1 2 3; do
  versions=(monolith microservices)
  [[ $run == 2 ]] && versions=(microservices monolith)
  for version in "${versions[@]}"; do
    endpoints=(list search detail)
    [[ $run == 2 ]] && endpoints=(search detail list)
    [[ $run == 3 ]] && endpoints=(detail list search)
    for endpoint in "${endpoints[@]}"; do run_case "$version" "$endpoint" "$run"; done
  done
done

node "$ROOT/04_tests/performance/summarize-interface-comparison.js" "$RAW_DIR" "$CSV"
cleanup
trap - EXIT INT TERM
echo "性能对比完成：$CSV"
