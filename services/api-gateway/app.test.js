const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('D8-GATEWAY-01: 网关安全、Trace ID、探针、限制、超时和降级行为', async () => {
  let capturedHeaders;
  const upstream = http.createServer((req, res) => {
    if (req.url === '/ready') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ status: 'ready' }));
    }
    if (req.url.includes('/slow')) {
      return setTimeout(() => {
        if (!res.destroyed) res.end(JSON.stringify({ late: true }));
      }, 300);
    }
    capturedHeaders = req.headers;
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ service: 'user-service', path: req.url }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const target = `http://127.0.0.1:${upstream.address().port}`;
  process.env.USER_SERVICE_URL = target;
  process.env.PRODUCT_SERVICE_URL = target;
  process.env.ORDER_SERVICE_URL = target;
  process.env.CORS_ORIGINS = 'https://allowed.example';
  process.env.GATEWAY_BODY_LIMIT = '1kb';
  process.env.PROXY_TIMEOUT_MS = '100';
  process.env.RATE_LIMIT_MAX = '100';
  delete require.cache[require.resolve('./app')];
  const gateway = await listen(require('./app'));
  const base = `http://127.0.0.1:${gateway.address().port}`;

  try {
    const live = await fetch(`${base}/live`);
    assert.equal(live.status, 200);
    assert.equal((await live.json()).status, 'alive');

    const ready = await fetch(`${base}/ready`);
    assert.equal(ready.status, 200);
    assert.equal((await ready.json()).status, 'ready');

    const version = await fetch(`${base}/version`).then(response => response.json());
    for (const prefix of ['/api/users', '/api/addresses', '/api/products', '/api/orders', '/api/evaluations', '/api/chats']) {
      assert.ok(version.routes.some(route => route.prefix === prefix));
    }

    const traceId = 'd8-trace-through-gateway';
    const forwarded = await fetch(`${base}/api/users/profile`, {
      headers: {
        origin: 'https://allowed.example',
        'x-request-id': traceId,
        'x-internal-token': 'must-not-be-forwarded'
      }
    });
    assert.equal(forwarded.status, 200);
    assert.equal(forwarded.headers.get('x-request-id'), traceId);
    assert.equal(forwarded.headers.get('access-control-allow-origin'), 'https://allowed.example');
    assert.equal(forwarded.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(forwarded.headers.get('x-frame-options'), 'DENY');
    assert.equal(capturedHeaders['x-request-id'], traceId);
    assert.equal(capturedHeaders['x-internal-token'], undefined);

    const rejectedOrigin = await fetch(`${base}/api/users/profile`, { headers: { origin: 'https://evil.example' } });
    assert.equal(rejectedOrigin.status, 403);

    const oversized = await fetch(`${base}/api/users/profile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(2048) })
    });
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).message, '请求体超过大小限制');

    const timedOut = await fetch(`${base}/api/users/slow`);
    assert.equal(timedOut.status, 504);
    const timeoutBody = await timedOut.json();
    assert.equal(timeoutBody.message, '依赖服务响应超时');
    assert.equal(timeoutBody.stack, undefined);

    await new Promise(resolve => upstream.close(resolve));
    const degraded = await fetch(`${base}/ready`);
    assert.equal(degraded.status, 503);
    assert.equal((await degraded.json()).status, 'not-ready');
    const unavailable = await fetch(`${base}/api/users/profile`);
    assert.equal(unavailable.status, 503);
    const unavailableBody = await unavailable.json();
    assert.equal(unavailableBody.message, '依赖服务暂不可用');
    assert.equal(unavailableBody.stack, undefined);
    assert.doesNotMatch(JSON.stringify(unavailableBody), /127\.0\.0\.1|upstream/i);
  } finally {
    if (upstream.listening) await new Promise(resolve => upstream.close(resolve));
    await new Promise(resolve => gateway.close(resolve));
  }
});
