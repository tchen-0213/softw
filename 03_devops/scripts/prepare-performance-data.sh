#!/bin/sh
set -eu

ACTION=${1:-seed}
MONOLITH_DB_CONTAINER=${MONOLITH_DB_CONTAINER:-softw-mysql}
MICROSERVICE_DB_CONTAINER=${MICROSERVICE_DB_CONTAINER:-softw-microservices-mysql-1}

command -v docker >/dev/null || { echo "docker 未安装" >&2; exit 1; }

monolith_mysql() {
  docker exec -i "$MONOLITH_DB_CONTAINER" sh -c \
    'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$@" shopping_platform' sh "$@"
}

microservice_mysql() {
  docker exec -i "$MICROSERVICE_DB_CONTAINER" sh -c \
    'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$@" softw_catalog' sh "$@"
}

cleanup() {
  printf "DELETE FROM Products WHERE id BETWEEN 990001 AND 990200 AND name LIKE 'PERF-COMPARE-%%';\n" | monolith_mysql
  printf "DELETE FROM Products WHERE id BETWEEN 990001 AND 990200 AND name LIKE 'PERF-COMPARE-%%';\n" | microservice_mysql
}

seed_monolith() {
  seller_id=$(printf 'SELECT id FROM Users ORDER BY id LIMIT 1;\n' | monolith_mysql -N)
  [ -n "$seller_id" ] || { echo "单体数据库没有可用卖家账号" >&2; exit 1; }
  monolith_mysql <<SQL
DELETE FROM Products WHERE id BETWEEN 990001 AND 990200;
INSERT INTO Products
  (id,name,description,images,videos,price,stock,category,subCategory,brand,sellerId,sellerName,status,sales,views,rating,reviewCount,isSecondhand,hasDefect,bargainEnabled,createdAt,updatedAt)
WITH RECURSIVE seq AS (
  SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 200
)
SELECT 990000+n, CONCAT('PERF-COMPARE-', LPAD(n,3,'0')), CONCAT('固定性能对比数据-', n),
  JSON_ARRAY('/images/moyu-logo.png'), JSON_ARRAY(), 10+n/10, 100+n, 'performance', 'fixed', 'SoftwPerf',
  $seller_id, '性能测试卖家', '在售', MOD(n,50), 0, 4.50, 0, 0, 0, 0,
  TIMESTAMP('2026-08-28 00:00:00') + INTERVAL n SECOND,
  TIMESTAMP('2026-08-28 00:00:00') + INTERVAL n SECOND
FROM seq;
SQL
}

seed_microservice() {
  microservice_mysql <<'SQL'
DELETE FROM Products WHERE id BETWEEN 990001 AND 990200;
INSERT INTO Products
  (id,name,description,images,videos,price,stock,category,subCategory,brand,sellerId,sellerName,status,sales,views,rating,reviewCount,isSecondhand,hasDefect,bargainEnabled,createdAt,updatedAt)
WITH RECURSIVE seq AS (
  SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 200
)
SELECT 990000+n, CONCAT('PERF-COMPARE-', LPAD(n,3,'0')), CONCAT('固定性能对比数据-', n),
  JSON_ARRAY('/images/moyu-logo.png'), JSON_ARRAY(), 10+n/10, 100+n, 'performance', 'fixed', 'SoftwPerf',
  1, '性能测试卖家', '在售', MOD(n,50), 0, 4.50, 0, 0, 0, 0,
  TIMESTAMP('2026-08-28 00:00:00') + INTERVAL n SECOND,
  TIMESTAMP('2026-08-28 00:00:00') + INTERVAL n SECOND
FROM seq;
SQL
}

verify() {
  query="SET SESSION group_concat_max_len=1000000; SELECT COUNT(*),MIN(id),MAX(id),MD5(GROUP_CONCAT(CONCAT_WS('|',id,name,description,price,stock,category,subCategory,brand,status,sales,rating,isSecondhand) ORDER BY id SEPARATOR ';')) FROM Products WHERE id BETWEEN 990001 AND 990200;"
  mono=$(printf '%s\n' "$query" | monolith_mysql -N)
  micro=$(printf '%s\n' "$query" | microservice_mysql -N)
  printf 'monolith\t%s\n' "$mono"
  printf 'microservices\t%s\n' "$micro"
  [ "$mono" = "$micro" ]
}

case "$ACTION" in
  seed) cleanup; seed_monolith; seed_microservice; verify ;;
  verify) verify ;;
  clean) cleanup ;;
  *) echo "用法: $0 seed|verify|clean" >&2; exit 2 ;;
esac
