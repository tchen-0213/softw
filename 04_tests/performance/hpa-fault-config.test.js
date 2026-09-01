const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('D8-02-CONFIG-01: HPA 与商品服务资源配置满足可观测扩缩容实验', () => {
  const hpa = read('03_devops/k8s/microservices/03-hpa.yaml');
  const services = read('03_devops/k8s/microservices/01-services.yaml');
  assert.match(hpa, /apiVersion: autoscaling\/v2/);
  assert.match(hpa, /minReplicas: 1/);
  assert.match(hpa, /maxReplicas: 5/);
  assert.match(hpa, /averageUtilization: 60/);
  assert.match(hpa, /scaleDown:[\s\S]*stabilizationWindowSeconds: 30/);
  assert.match(services, /name: product-service[\s\S]*requests:[\s\S]*cpu: 100m[\s\S]*limits:[\s\S]*cpu: 500m/);
  assert.match(services, /EXPERIMENT_CPU_BURN_ENABLED, value: "true"/);
});

test('D8-02-CONFIG-02: HPA 实验保存性能、资源与完整副本时间线并自动恢复', () => {
  const script = read('03_devops/scripts/run-hpa-experiment.sh');
  for (const evidence of ['hpa-timeline-', 'hpa-k6-summary-', 'hpa-k6-', 'hpa-state-']) {
    assert.match(script, new RegExp(evidence));
  }
  for (const metric of ['cpuPercent', 'cpuMillicores', 'memoryMi', 'desiredReplicas', 'currentReplicas', 'readyReplicas', 'actualPods']) {
    assert.match(script, new RegExp(metric));
  }
  assert.match(script, /trap restore EXIT INT TERM/);
  assert.match(script, /grafana\/k6:/);
  assert.match(script, /\[ "\$peak" -gt 1 \]/);
  assert.match(script, /\[ "\$desired" = "1" \]/);
});

test('D8-02-CONFIG-03: 故障脚本校验 503、206、服务存活与 HPA 恢复', () => {
  const script = read('03_devops/scripts/run-fault-isolation-experiment.sh');
  assert.match(script, /kubectl delete hpa product-service-hpa/);
  assert.match(script, /故障前商品服务未回到单 Pod 基线/);
  assert.match(script, /商品 Pod 未在 45 秒内优雅退出/);
  assert.match(script, /--grace-period=0 --force --wait=false/);
  assert.match(script, /deployment\/product-service[\s\S]*--replicas=0/);
  assert.match(script, /deployment\/user-service[\s\S]*\/live/);
  assert.match(script, /deployment\/order-service[\s\S]*\/live/);
  assert.match(script, /HTTP_STATUS=503/);
  assert.match(script, /HTTP_STATUS=206/);
  assert.match(script, /kubectl apply -f .*03-hpa\.yaml/);
  assert.match(script, /status\.desiredReplicas/);
  assert.match(script, /status\.readyReplicas/);
  assert.match(script, /trap restore EXIT INT TERM/);
});
