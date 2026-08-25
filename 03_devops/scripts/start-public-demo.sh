#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

TUNNEL_CONTAINER="softw-public-tunnel"

docker compose -f 03_devops/docker-compose.yml up -d --build

if docker inspect "$TUNNEL_CONTAINER" >/dev/null 2>&1; then
  if [ "$(docker inspect -f '{{.State.Running}}' "$TUNNEL_CONTAINER")" != "true" ]; then
    docker start "$TUNNEL_CONTAINER" >/dev/null
  fi
else
  docker run -d \
    --name "$TUNNEL_CONTAINER" \
    --restart unless-stopped \
    cloudflare/cloudflared:latest \
    tunnel --no-autoupdate --url http://host.docker.internal:8080 >/dev/null
fi

for attempt in $(seq 1 30); do
  public_url=$(docker logs "$TUNNEL_CONTAINER" 2>&1 \
    | sed -n 's/.*\(https:\/\/[-a-z0-9]*\.trycloudflare\.com\).*/\1/p' \
    | tail -1)

  if [ -n "$public_url" ] && curl --fail --silent "$public_url/api/health" >/dev/null; then
    printf 'Public demo: %s\n' "$public_url"
    printf 'Health check: %s/api/health\n' "$public_url"
    exit 0
  fi

  sleep 2
done

docker logs "$TUNNEL_CONTAINER"
printf '%s\n' 'Public tunnel did not become healthy within 60 seconds.' >&2
exit 1
