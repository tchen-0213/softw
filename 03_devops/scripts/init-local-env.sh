#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
TARGET="$ROOT/.env"

if [ -f "$TARGET" ]; then
  echo "$TARGET 已存在，未覆盖"
  exit 0
fi

command -v openssl >/dev/null || { echo "需要 openssl 生成本地密钥" >&2; exit 1; }
umask 077
{
  printf 'SOFTW_MYSQL_ROOT_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  printf 'SOFTW_DB_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  printf 'SOFTW_JWT_SECRET=%s\n' "$(openssl rand -hex 32)"
  printf 'SOFTW_INTERNAL_SERVICE_TOKEN=%s\n' "$(openssl rand -hex 32)"
} > "$TARGET"
echo "已生成仅供本机使用的 $TARGET"
