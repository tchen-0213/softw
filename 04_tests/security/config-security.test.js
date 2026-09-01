const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('D8-CONFIG-01: Kubernetes 明确区分存活、就绪和启动探针', () => {
  const services = read('03_devops/k8s/microservices/01-services.yaml');
  const gateway = read('03_devops/k8s/microservices/02-gateway.yaml');
  for (const manifest of [services, gateway]) {
    assert.match(manifest, /readinessProbe:[\s\S]*?path: \/ready/);
    assert.match(manifest, /livenessProbe:[\s\S]*?path: \/live/);
    assert.match(manifest, /startupProbe:[\s\S]*?path: \/live/);
  }
  assert.equal((services.match(/path: \/ready/g) || []).length, 3);
  assert.equal((services.match(/path: \/live/g) || []).length, 6);
});

test('D8-CONFIG-02: 工作负载使用非 root 容器且秘密只引用 Kubernetes Secret', () => {
  const services = read('03_devops/k8s/microservices/01-services.yaml');
  const database = read('03_devops/k8s/microservices/00a-database.yaml');
  const gateway = read('03_devops/k8s/microservices/02-gateway.yaml');
  assert.equal((services.match(/runAsNonRoot: true/g) || []).length, 3);
  assert.equal((services.match(/allowPrivilegeEscalation: false/g) || []).length, 3);
  assert.equal((gateway.match(/runAsNonRoot: true/g) || []).length, 1);
  for (const name of ['DB_PASSWORD', 'JWT_SECRET', 'INTERNAL_SERVICE_TOKEN']) {
    assert.match(services, new RegExp(`name: ${name}[\\s\\S]{0,120}secretKeyRef:`));
  }
  assert.match(database, /name: MYSQL_ROOT_PASSWORD[\s\S]{0,120}secretKeyRef:/);
  assert.doesNotMatch(`${services}\n${database}`, /(?:DB_PASSWORD|JWT_SECRET|INTERNAL_SERVICE_TOKEN).*value:\s*["']?[^$\s{]/);
  for (const dockerfile of ['api-gateway', 'user-service', 'product-service', 'order-service']) {
    assert.match(read(`services/${dockerfile}/Dockerfile`), /USER node/);
  }
});

test('D8-CONFIG-03: Compose 与 CI 强制外部秘密并执行依赖和历史密钥扫描', () => {
  const compose = read('03_devops/docker-compose.microservices.yml');
  for (const variable of ['SOFTW_DB_PASSWORD', 'SOFTW_JWT_SECRET', 'SOFTW_INTERNAL_SERVICE_TOKEN']) {
    assert.match(compose, new RegExp(`\\$\\{${variable}:\\?`));
  }
  const workflow = read('.github/workflows/ci-cd.yml');
  assert.match(workflow, /security-scan:/);
  assert.match(workflow, /run-security-scan\.js/);
  assert.match(workflow, /gitleaks\/gitleaks-action@v2/);
});
