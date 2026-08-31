const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { publicApis, scenarioCoverage, routeKey } = require('./public-api-manifest');

const root = resolve(__dirname, '..', '..');
const serviceSources = [
  ['user-service', resolve(root, 'services/user-service/app.js')],
  ['product-service', resolve(root, 'services/product-service/app.js')],
  ['order-service', resolve(root, 'services/order-service/app.js')]
];

function extractPublicRoutes(service, filename) {
  const source = readFileSync(filename, 'utf8');
  const routes = [];
  const pattern = /router\.(get|post|put|delete)\(\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    if (match[2].startsWith('/api/')) routes.push({ service, method: match[1].toUpperCase(), path: match[2] });
  }
  return routes;
}

test('D6-02 public API manifest matches code, docs and UC01-UC09 flow mapping', () => {
  const manifestKeys = publicApis.map(routeKey);
  assert.equal(new Set(manifestKeys).size, manifestKeys.length, '公开 API 清单存在重复项');
  for (const api of publicApis) {
    assert.ok(api.service, `${routeKey(api)} 缺少归属服务`);
    assert.ok(api.testIds.length, `${routeKey(api)} 缺少自动化测试编号`);
  }

  const sourceRoutes = serviceSources.flatMap(([service, filename]) => extractPublicRoutes(service, filename));
  const sourceKeys = sourceRoutes.map(routeKey).sort();
  const routerManifestKeys = publicApis.filter(api => api.source !== 'static').map(routeKey).sort();
  assert.deepEqual(routerManifestKeys, sourceKeys, '业务服务公开路由与 D6-02 清单不一致');

  const expectedUcs = Array.from({ length: 9 }, (_, index) => `UC${String(index + 1).padStart(2, '0')}`);
  assert.deepEqual(scenarioCoverage.map(item => item.uc).sort(), expectedUcs);
  for (const scenario of scenarioCoverage) {
    assert.deepEqual([...scenario.flows].sort(), ['ALT', 'ERR', 'MAIN']);
  }

  const e2eSource = readFileSync(resolve(root, '04_tests/microservices/api-e2e.test.js'), 'utf8');
  for (const scenario of scenarioCoverage) {
    assert.ok(e2eSource.includes(`${scenario.testId} ${scenario.titleMarker} MAIN/ALT/ERR`), `${scenario.uc} 未声明 MAIN/ALT/ERR 回归`);
  }

  const mappingDoc = readFileSync(resolve(root, '02_docs/微服务公开API测试映射.md'), 'utf8');
  for (const api of publicApis) {
    assert.ok(mappingDoc.includes(`\`${routeKey(api)}\``), `${routeKey(api)} 未写入公开 API 映射表`);
  }
});
