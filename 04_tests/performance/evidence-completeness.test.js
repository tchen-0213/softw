const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const performanceRoot = path.join(root, '04_tests', 'reports', 'performance');
const comparisonRaw = path.join(performanceRoot, 'raw', 'interface-comparison-2026-08-28');
const read = filename => fs.readFileSync(filename, 'utf8');

test('EVIDENCE-PERF-01: 单体与微服务三个接口各保留三轮可复算结果', () => {
  const csv = read(path.join(performanceRoot, 'interface-comparison-2026-08-28.csv')).trim().split(/\r?\n/);
  const header = csv.shift().split(',');
  const rows = csv.map(line => Object.fromEntries(line.split(',').map((value, index) => [header[index], value])));
  assert.equal(rows.length, 18);

  const expected = new Set();
  for (const version of ['monolith', 'microservices']) {
    for (const endpoint of ['list', 'search', 'detail']) {
      for (const run of ['1', '2', '3']) expected.add(`${version}/${endpoint}/${run}`);
    }
  }
  assert.deepEqual(new Set(rows.map(row => `${row.version}/${row.endpoint}/${row.run}`)), expected);
  for (const row of rows) {
    assert.ok(Number(row.requests) > 0);
    assert.ok(Number(row.throughput) > 0);
    assert.ok(Number(row.p95Ms) > 0);
    assert.ok(Number(row.errorRate) < 0.05);
  }

  const files = fs.readdirSync(comparisonRaw);
  for (const suffix of ['json', 'txt', 'stats.tsv']) {
    const pattern = new RegExp(`^(monolith|microservices)-(list|search|detail)-run[123]${suffix === 'stats.tsv' ? '-stats\\.tsv' : `\\.${suffix}`}$`);
    assert.equal(files.filter(filename => pattern.test(filename)).length, 18, `${suffix} 原始证据应为 18 份`);
  }
  assert.match(read(path.join(comparisonRaw, 'dataset-verification.txt')), /monolith[\s\S]*microservices/);
});

test('EVIDENCE-HPA-01: 时间线证明扩容后恢复单副本且压力测试无错误', () => {
  const timeline = read(path.join(performanceRoot, 'raw', 'hpa-timeline-2026-09-01-d8-02.tsv'))
    .trim().split(/\r?\n/).slice(1).map(line => line.split('\t').map((value, index) => index === 0 ? value : Number(value)));
  assert.ok(timeline.length >= 20);
  assert.ok(Math.max(...timeline.map(row => row[7])) >= 3, '实际 Pod 数应发生扩容');
  assert.equal(timeline.at(-1)[4], 1, 'HPA 期望副本应恢复为 1');
  assert.equal(timeline.at(-1)[6], 1, 'Ready 副本应恢复为 1');
  assert.equal(timeline.at(-1)[7], 1, '实际 Pod 数应恢复为 1');

  const summary = JSON.parse(read(path.join(performanceRoot, 'raw', 'hpa-k6-summary-2026-09-01-d8-02.json')));
  assert.ok(summary.metrics.http_reqs.count > 0);
  assert.equal(summary.metrics.http_req_failed.value, 0);
  assert.equal(summary.metrics.checks.fails, 0);
  assert.ok(summary.metrics.http_req_duration['p(95)'] < 3000);
});

test('EVIDENCE-FAULT-01: 故障注入记录降级、隔离与最终恢复', () => {
  const evidence = read(path.join(performanceRoot, 'raw', 'fault-isolation-2026-09-01-d8-02.txt'));
  assert.match(evidence, /HTTP_STATUS=503/);
  assert.match(evidence, /HTTP_STATUS=206/);
  assert.match(evidence, /"status":"alive"/);
  assert.match(evidence, /horizontalpodautoscaler\.autoscaling\/product-service-hpa created/);
  assert.match(evidence, /== 恢复后商品接口 ==[\s\S]*HTTP_STATUS=200/);
  assert.match(evidence, /== 恢复后网关就绪 ==[\s\S]*HTTP_STATUS=200/);
});

test('EVIDENCE-K8S-01: 部署记录包含全部应用镜像与健康版本证据', () => {
  const evidenceRoot = path.join(root, '04_tests', 'reports', 'kubernetes-deployment', '2026-09-02-audit');
  const images = read(path.join(evidenceRoot, 'deployed-images.txt'));
  for (const image of ['backend', 'frontend', 'api-gateway', 'user-service', 'product-service', 'order-service', 'microservice-frontend']) {
    assert.match(images, new RegExp(`softw/${image}:c2c5dd284167-audit-20260902`));
  }
  assert.match(read(path.join(evidenceRoot, 'monolith-health.txt')), /"status":"ready"/);
  const microservices = read(path.join(evidenceRoot, 'microservices-health-version.txt'));
  for (const service of ['user-service', 'product-service', 'order-service', 'api-gateway']) {
    assert.match(microservices, new RegExp(`"service":"${service}"`));
  }
});
