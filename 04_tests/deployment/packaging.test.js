const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('DELIVERY-DOCKER-01: 单体和微服务七个镜像均可重复安装依赖并声明启动命令', () => {
  const dockerfiles = [
    'backend/Dockerfile', 'frontend/Dockerfile', 'frontend/Dockerfile.microservices',
    'services/api-gateway/Dockerfile', 'services/user-service/Dockerfile',
    'services/product-service/Dockerfile', 'services/order-service/Dockerfile'
  ];
  for (const filename of dockerfiles) {
    const source = read(filename);
    assert.match(source, /\b(?:RUN )?npm ci\b/, `${filename} 必须使用锁文件安装依赖`);
    assert.match(source, /(?:CMD \[|CMD nginx)/, `${filename} 缺少启动命令`);
    assert.doesNotMatch(source, /FROM\s+[^\s]+:latest\b/, `${filename} 基础镜像不能使用 latest`);
  }
  for (const service of ['api-gateway', 'user-service', 'product-service', 'order-service']) {
    assert.match(read(`services/${service}/Dockerfile`), /USER 1000/, `${service} 必须使用非 root 用户`);
  }
});

test('DELIVERY-COMPOSE-01: 三个业务服务独立构建、独立数据库且具有健康依赖链', () => {
  const compose = read('03_devops/docker-compose.microservices.yml');
  for (const service of ['user-service', 'product-service', 'order-service']) {
    assert.match(compose, new RegExp(`\\n  ${service}:[\\s\\S]*?dockerfile: ${service}/Dockerfile`));
    assert.match(compose, new RegExp(`\\n  ${service}:[\\s\\S]*?healthcheck:`));
  }
  for (const database of ['softw_users', 'softw_catalog', 'softw_orders']) assert.match(compose, new RegExp(`DB_NAME: ${database}`));
  assert.doesNotMatch(compose, /image:\s*[^\s#]+:latest\b/);
  assert.match(compose, /api-gateway:[\s\S]*?condition: service_healthy/);
});

test('DELIVERY-COMPOSE-02: Compose 不绑定全局容器名，可并行创建隔离验证环境', () => {
  const composeFiles = ['03_devops/docker-compose.yml', '03_devops/docker-compose.microservices.yml'];
  for (const filename of composeFiles) {
    assert.doesNotMatch(read(filename), /^\s*container_name:/m, `${filename} 不应声明 container_name`);
  }
  assert.match(read(composeFiles[0]), /MONOLITH_MYSQL_PORT:-3306/);
});

test('DELIVERY-TEST-RUNNER-01: 微服务集成测试使用随机口令、随机端口并保证清理', () => {
  const runner = read('04_tests/microservices/run-service-integration.js');
  assert.match(runner, /randomBytes/);
  assert.match(runner, /127\.0\.0\.1::3306/);
  assert.match(runner, /DB_NAME: 'softw_test'/);
  assert.match(runner, /finally\(\(\) =>/);
  assert.match(runner, /\['rm', '-f', containerName\]/);
  assert.doesNotMatch(runner, /password\s*=\s*['"][^'"]+['"]/i);
});

test('DELIVERY-DATABASE-01: 全新 MySQL 自动创建单体库、三个服务库和最小授权', () => {
  const sql = read('03_devops/database/init/001_database.sql');
  for (const database of ['shopping_platform', 'softw_users', 'softw_catalog', 'softw_orders']) {
    assert.match(sql, new RegExp(`CREATE DATABASE IF NOT EXISTS ${database}`));
  }
  for (const database of ['softw_users', 'softw_catalog', 'softw_orders']) {
    assert.match(sql, new RegExp(`GRANT ALL PRIVILEGES ON ${database}\\.\\* TO 'softw'@'%'`));
  }
});

test('DELIVERY-CI-01: lint、安全、三类测试失败都会阻止镜像和 Kubernetes 部署', () => {
  const workflow = read('.github/workflows/ci-cd.yml');
  assert.match(workflow, /frontend-build:[\s\S]*?npm run lint[\s\S]*?npm run test:coverage[\s\S]*?npm run build/);
  assert.match(workflow, /docker-build:[\s\S]*?needs: \[backend-test, frontend-build, security-scan, browser-e2e, microservice-test, microservice-api-e2e\]/);
  assert.match(workflow, /kubernetes-deploy:[\s\S]*?needs: docker-build/);
  assert.match(workflow, /tags: \$\{\{ env\.IMAGE_PREFIX \}\}\/\$\{\{ matrix\.image \}\}:\$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(workflow, /tags:[^\n]*:latest/);
});

test('DELIVERY-K8S-01: 业务服务具有资源边界、三类探针、HPA、部署和回滚脚本', () => {
  const services = read('03_devops/k8s/microservices/01-services.yaml');
  assert.equal((services.match(/kind: Deployment/g) || []).length, 3);
  assert.equal((services.match(/resources:/g) || []).length, 3);
  assert.equal((services.match(/readinessProbe:/g) || []).length, 3);
  assert.equal((services.match(/livenessProbe:/g) || []).length, 3);
  assert.equal((services.match(/startupProbe:/g) || []).length, 3);
  const hpa = read('03_devops/k8s/microservices/03-hpa.yaml');
  assert.match(hpa, /kind: HorizontalPodAutoscaler/);
  assert.match(hpa, /name: product-service/);
  assert.match(read('03_devops/scripts/deploy-k8s.sh'), /rollout status/);
  assert.match(read('03_devops/scripts/rollback-k8s.sh'), /rollout undo/);
});

test('DELIVERY-K8S-02: 单体后端也区分存活、就绪、健康和版本检查', () => {
  const app = read('backend/app.js');
  for (const endpoint of ['live', 'ready', 'health', 'version']) {
    assert.match(app, new RegExp(`app\\.get\\('/api/${endpoint}'`));
  }
  const deployment = read('03_devops/k8s/monolith/03-backend.yaml');
  assert.match(deployment, /readinessProbe:[\s\S]*?path: \/api\/ready/);
  assert.match(deployment, /livenessProbe:[\s\S]*?path: \/api\/live/);
  assert.match(deployment, /startupProbe:[\s\S]*?path: \/api\/ready/);
  const database = read('03_devops/k8s/monolith/02-mysql.yaml');
  assert.match(database, /kind: PersistentVolume/);
  assert.match(database, /kind: PersistentVolumeClaim/);
  assert.match(database, /persistentVolumeReclaimPolicy: Retain/);
  assert.match(database, /strategy:\s*\n\s*type: Recreate/);
  assert.match(read('03_devops/k8s/microservices/00a-database.yaml'), /strategy:\s*\n\s*type: Recreate/);
  assert.match(app, /Database migration error; retrying/);
});
