const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createService } = require('../common/createService');
const { requestJson } = require('../common/httpClient');
const { requestContext, sanitizeText } = require('../common/observability');
const { createCors, createRateLimiter, requestBuckets, securityHeaders, validateProductionSecrets } = require('../common/security');

const originalInternalToken = process.env.INTERNAL_SERVICE_TOKEN;
test.beforeEach(() => { process.env.INTERNAL_SERVICE_TOKEN = 'internal-test'; });
test.after(() => {
  if (originalInternalToken === undefined) delete process.env.INTERNAL_SERVICE_TOKEN;
  else process.env.INTERNAL_SERVICE_TOKEN = originalInternalToken;
});

async function withServer(app, callback) {
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const { port } = server.address();
    return await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('MS-COMMON-01: 健康检查与就绪检查各自表达存活和依赖状态', async () => {
  let ready = false;
  const app = createService({ express, name: 'sample', version: '1.2.3', routes: () => {}, isReady: () => ready });
  await withServer(app, async baseUrl => {
    const live = await fetch(`${baseUrl}/live`);
    assert.equal(live.status, 200);
    assert.equal((await live.json()).status, 'alive');
    const starting = await fetch(`${baseUrl}/ready`);
    assert.equal(starting.status, 503);
    const startingBody = await starting.json();
    assert.equal(startingBody.status, 'not-ready');
    assert.equal(startingBody.database, 'starting');
    const degraded = await fetch(`${baseUrl}/health`);
    assert.equal(degraded.status, 503);
    assert.equal((await degraded.json()).status, 'degraded');
    ready = true;
    const healthy = await fetch(`${baseUrl}/ready`);
    const body = await healthy.json();
    assert.equal(healthy.status, 200);
    assert.equal(body.status, 'ready');
    assert.equal(body.service, 'sample');
    assert.equal(body.database, 'ok');
    assert.equal((await fetch(`${baseUrl}/health`)).status, 200);
  });
});

test('MS-COMMON-02: 版本端点返回服务名和版本', async () => {
  const app = createService({ express, name: 'gateway', version: '2.0.0', routes: () => {} });
  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/version`);
    assert.deepEqual(await response.json(), {
      service: 'gateway', version: '2.0.0', revision: 'dev', buildTime: 'unknown'
    });
  });
});

test('MS-COMMON-03: 统一错误处理中间件保留业务状态码和消息', async () => {
  const app = createService({
    express, name: 'sample', version: '1',
    routes: service => service.get('/fail', () => { const error = new Error('依赖失败'); error.status = 409; throw error; })
  });
  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/fail`);
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.message, '依赖失败');
    assert.match(body.requestId, /^[0-9a-f-]{36}$/);
  });
});

test('MS-HTTP-01: GET 请求注入内部服务凭据并解析 JSON', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let captured;
  global.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return { ok: true, json: async () => ({ ok: true }) };
  };
  assert.deepEqual(await requestJson('http://service.local/base/', '/health'), { ok: true });
  assert.equal(captured.url, 'http://service.local/health');
  assert.equal(captured.options.method, 'GET');
  assert.equal(captured.options.headers['x-internal-token'], 'internal-test');
  assert.equal(captured.options.body, undefined);
});

test('MS-HTTP-02: POST 请求序列化正文并允许覆盖请求头', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let captured;
  global.fetch = async (url, options) => {
    captured = options;
    return { ok: true, json: async () => ({ id: 1 }) };
  };
  await requestJson('http://service.local', '/orders', { method: 'POST', body: { quantity: 2 }, headers: { 'x-trace': 'abc' } });
  assert.equal(captured.body, JSON.stringify({ quantity: 2 }));
  assert.equal(captured.headers['x-trace'], 'abc');
});

test('MS-HTTP-03: 非 2xx 响应向上游传递状态和业务载荷', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({ ok: false, status: 404, json: async () => ({ message: '商品不存在', code: 'NOT_FOUND' }) });
  await assert.rejects(
    requestJson('http://service.local', '/products/404'),
    error => error.status === 404 && error.message === '商品不存在' && error.payload.code === 'NOT_FOUND'
  );
});

test('MS-HTTP-04: 网络异常保留原始错误供上层诊断', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => { throw new Error('ECONNREFUSED'); };
  await assert.rejects(
    requestJson('http://service.local', '/health'),
    error => error.message === 'ECONNREFUSED'
  );
});

test('MS-HTTP-05: 请求超时统一转换为 503', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      const error = new Error('aborted'); error.name = 'AbortError'; reject(error);
    });
  });
  await assert.rejects(
    requestJson('http://service.local', '/slow', { timeoutMs: 5 }),
    error => error.status === 503 && error.message === '依赖服务请求超时'
  );
});

test('D8-TRACE-01: 请求上下文将同一 X-Request-Id 注入跨服务调用', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let captured;
  global.fetch = async (url, options) => {
    captured = options;
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const middleware = requestContext({ service: 'trace-test', logger: () => {} });
  const req = { method: 'GET', originalUrl: '/trace', headers: { 'x-request-id': 'trace-d8-01' }, get: name => name === 'x-request-id' ? 'trace-d8-01' : undefined };
  const res = { statusCode: 200, setHeader() {}, once() {} };
  await new Promise((resolve, reject) => middleware(req, res, () => {
    requestJson('http://service.local', '/dependency').then(resolve, reject);
  }));
  assert.equal(captured.headers['x-request-id'], 'trace-d8-01');
});

test('D8-LOG-01: 结构化日志不包含请求正文、密码、Token 或堆栈', async () => {
  const lines = [];
  const app = createService({
    express,
    name: 'log-test',
    version: '1',
    logger: line => lines.push(line),
    routes: service => service.post('/login', (req, res) => res.json({ ok: true }))
  });
  await withServer(app, async baseUrl => {
    await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer secret-token-value' },
      body: JSON.stringify({ password: 'never-log-me', token: 'private-token' })
    });
  });
  assert.equal(lines.length, 1);
  assert.doesNotMatch(lines[0], /never-log-me|private-token|secret-token-value|stack/i);
  assert.match(lines[0], /"event":"http_request"/);
  assert.equal(sanitizeText('password=hunter2 token=abc'), 'password=[REDACTED] token=[REDACTED]');
});

test('D8-SECURITY-01: 安全头、受控 CORS 和限流均有明确断言', () => {
  const headers = {};
  const response = {
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    sendStatus(code) { this.statusCode = code; return this; }
  };
  securityHeaders({}, response, () => {});
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);

  let passed = false;
  createCors({ allowedOrigins: ['https://allowed.example'] })(
    { method: 'GET', requestId: 'cors-id', get: name => name === 'origin' ? 'https://evil.example' : undefined },
    response,
    () => { passed = true; }
  );
  assert.equal(passed, false);
  assert.equal(response.statusCode, 403);

  requestBuckets.clear();
  const limiter = createRateLimiter({ max: 1, windowMs: 1000 });
  const req = { path: '/api/products', ip: '127.0.0.1', requestId: 'rate-id', socket: {} };
  limiter(req, response, () => {});
  limiter(req, response, () => assert.fail('第二个请求不应放行'));
  assert.equal(response.statusCode, 429);
  assert.ok(headers['Retry-After']);
});

test('D8-SECRET-01: 生产环境拒绝缺失、默认或过短的服务秘密', (t) => {
  const previous = Object.fromEntries(['NODE_ENV', 'DB_PASSWORD', 'JWT_SECRET', 'INTERNAL_SERVICE_TOKEN'].map(name => [name, process.env[name]]));
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  process.env.NODE_ENV = 'production';
  process.env.DB_PASSWORD = 'strong-database-password';
  process.env.JWT_SECRET = 'please_change_this_secret';
  process.env.INTERNAL_SERVICE_TOKEN = 'strong-internal-service-token';
  assert.throws(() => validateProductionSecrets(), /JWT_SECRET/);
  process.env.JWT_SECRET = 'strong-jwt-secret-value';
  assert.doesNotThrow(() => validateProductionSecrets());
});
