const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createService } = require('../common/createService');
const { requestJson } = require('../common/httpClient');

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

test('MS-COMMON-01: 健康检查区分就绪和启动中状态', async () => {
  let ready = false;
  const app = createService({ express, name: 'sample', version: '1.2.3', routes: () => {}, isReady: () => ready });
  await withServer(app, async baseUrl => {
    const starting = await fetch(`${baseUrl}/health`);
    assert.equal(starting.status, 503);
    const startingBody = await starting.json();
    assert.equal(startingBody.status, 'starting');
    assert.equal(startingBody.database, 'starting');
    ready = true;
    const healthy = await fetch(`${baseUrl}/health`);
    const body = await healthy.json();
    assert.equal(healthy.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'sample');
    assert.equal(body.database, 'ok');
  });
});

test('MS-COMMON-02: 版本端点返回服务名和版本', async () => {
  const app = createService({ express, name: 'gateway', version: '2.0.0', routes: () => {} });
  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/version`);
    assert.deepEqual(await response.json(), { service: 'gateway', version: '2.0.0' });
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
    assert.deepEqual(await response.json(), { message: '依赖失败' });
  });
});

test('MS-HTTP-01: GET 请求注入内部服务凭据并解析 JSON', async (t) => {
  const originalFetch = global.fetch;
  const originalToken = process.env.INTERNAL_SERVICE_TOKEN;
  t.after(() => { global.fetch = originalFetch; process.env.INTERNAL_SERVICE_TOKEN = originalToken; });
  process.env.INTERNAL_SERVICE_TOKEN = 'internal-test';
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

test('MS-HTTP-04: 网络异常统一转换为 503', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => { throw new Error('ECONNREFUSED'); };
  await assert.rejects(
    requestJson('http://service.local', '/health'),
    error => error.status === 503 && error.message === '依赖服务暂不可用' && error.cause.message === 'ECONNREFUSED'
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
