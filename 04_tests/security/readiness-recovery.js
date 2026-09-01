const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const composeArgs = [
  'compose', '--project-name', 'softw-d801', '--env-file', '.env',
  '-f', '03_devops/docker-compose.microservices.yml'
];
const probes = [
  { service: 'user-service', live: 'http://127.0.0.1:3101/live', ready: 'http://127.0.0.1:3101/ready' },
  { service: 'product-service', live: 'http://127.0.0.1:3102/live', ready: 'http://127.0.0.1:3102/ready' },
  { service: 'order-service', live: 'http://127.0.0.1:3103/live', ready: 'http://127.0.0.1:3103/ready' },
  { service: 'api-gateway', live: 'http://127.0.0.1:8081/live', ready: 'http://127.0.0.1:8081/ready' }
];

function docker(...args) {
  const result = spawnSync('docker', [...composeArgs, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'docker compose failed').trim());
}

async function status(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(3000) })).status;
  } catch {
    return 0;
  }
}

async function snapshot() {
  return Promise.all(probes.map(async probe => ({
    service: probe.service,
    live: await status(probe.live),
    ready: await status(probe.ready)
  })));
}

async function waitFor(predicate, timeoutMs, description) {
  const deadline = Date.now() + timeoutMs;
  let current;
  while (Date.now() < deadline) {
    current = await snapshot();
    if (predicate(current)) return current;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`${description}: ${JSON.stringify(current)}`);
}

async function main() {
  const report = { generatedAt: new Date().toISOString(), composeProject: 'softw-d801' };
  let mysqlStopped = false;
  try {
    report.baseline = await waitFor(
      rows => rows.every(row => row.live === 200 && row.ready === 200),
      30000,
      'baseline readiness did not become healthy'
    );

    docker('stop', 'mysql');
    mysqlStopped = true;
    report.databaseStoppedAt = new Date().toISOString();
    report.databaseUnavailable = await waitFor(
      rows => rows.every(row => row.live === 200 && row.ready === 503),
      45000,
      'readiness did not fail while liveness stayed healthy'
    );

    docker('start', 'mysql');
    mysqlStopped = false;
    report.databaseRestartedAt = new Date().toISOString();
    report.recovered = await waitFor(
      rows => rows.every(row => row.live === 200 && row.ready === 200),
      90000,
      'readiness did not recover automatically'
    );

    assert.ok(report.databaseUnavailable.every(row => row.live === 200 && row.ready === 503));
    assert.ok(report.recovered.every(row => row.live === 200 && row.ready === 200));
    report.passed = true;
  } finally {
    if (mysqlStopped) docker('start', 'mysql');
  }

  const outputArg = process.argv.find(argument => argument.startsWith('--output='));
  if (outputArg) {
    const outputPath = path.resolve(root, outputArg.slice('--output='.length));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
