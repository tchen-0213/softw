const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const gateway = process.env.MICROSERVICE_GATEWAY_URL || 'http://127.0.0.1:8081';
const traceId = `d8-01-trace-${Date.now()}`;

async function request(method, pathname, { token, body, expected } = {}) {
  const response = await fetch(`${gateway}${pathname}`, {
    method,
    headers: {
      'x-request-id': traceId,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.status, expected, `${method} ${pathname}: ${JSON.stringify(payload)}`);
  assert.equal(response.headers.get('x-request-id'), traceId);
  return payload;
}

async function register(kind, suffix) {
  const email = `d8_trace_${kind}_${suffix}@example.com`;
  const password = 'Pass123456';
  await request('POST', '/api/users/register', {
    expected: 201,
    body: { username: `d8_trace_${kind}_${suffix}`, email, phone: `135${suffix.slice(-8)}`, password }
  });
  return request('POST', '/api/users/login', { expected: 200, body: { email, password } });
}

function collectLogs() {
  const output = execFileSync('docker', [
    'compose', '--project-name', 'softw-d801', '--env-file', '.env',
    '-f', '03_devops/docker-compose.microservices.yml', 'logs', '--no-color', '--since', '2m',
    'api-gateway', 'user-service', 'product-service', 'order-service'
  ], { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

  return output.split(/\r?\n/).filter(line => line.includes(traceId)).map(line => {
    const jsonStart = line.indexOf('{');
    const entry = JSON.parse(line.slice(jsonStart));
    return {
      timestamp: entry.timestamp,
      service: entry.service,
      event: entry.event,
      requestId: entry.requestId,
      method: entry.method,
      path: entry.path,
      statusCode: entry.statusCode,
      durationMs: entry.durationMs
    };
  });
}

async function main() {
  const suffix = String(Date.now());
  const seller = await register('seller', suffix);
  const buyer = await register('buyer', suffix);
  await request('POST', '/api/shops/mine/verification', {
    token: seller.token,
    expected: 200,
    body: {
      legalName: 'D8 Trace 卖家', idNumber: `D8${suffix}`,
      verificationAddress: '软件工程实践中心',
      businessLicenseImage: '/uploads/evidence-license.png',
      idCardImage: '/uploads/evidence-id.png'
    }
  });
  const product = await request('POST', '/api/products', {
    token: seller.token,
    expected: 201,
    body: {
      name: `D8 Trace 商品 ${suffix}`, description: 'D8-01 跨服务链路证据',
      images: ['/images/moyu-logo.png'], price: 10, stock: 2, category: 'books'
    }
  });
  const order = await request('POST', '/api/orders', {
    token: buyer.token,
    expected: 201,
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: { name: 'Trace 买家', phone: '13500000000', address: '软件工程实践中心' },
      paymentMethod: 'wechat'
    }
  });

  await new Promise(resolve => setTimeout(resolve, 250));
  const logs = collectLogs();
  const services = [...new Set(logs.map(entry => entry.service))].sort();
  assert.deepEqual(services, ['api-gateway', 'order-service', 'product-service', 'user-service']);
  assert.ok(logs.every(entry => entry.requestId === traceId));
  for (const forbidden of ['password', 'authorization', 'token', 'stack']) {
    assert.ok(!JSON.stringify(logs).toLowerCase().includes(forbidden), `日志证据不应包含 ${forbidden}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    traceId,
    orderId: order.id,
    services,
    logs,
    passed: true
  };
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
