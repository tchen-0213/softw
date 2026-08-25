const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('./app');
const userService = require('../user-service/app');

function listen(target = app) {
  return new Promise(resolve => {
    const server = target.listen(0, () => resolve(server));
  });
}

test('api gateway exposes health and configured route metadata', async () => {
  const server = await listen();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const health = await fetch(`${baseUrl}/health`).then(res => res.json());
    assert.equal(health.status, 'ok');
    assert.equal(health.service, 'api-gateway');

    const version = await fetch(`${baseUrl}/version`).then(res => res.json());
    assert.ok(version.routes.some(route => route.prefix === '/api/products'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('api gateway forwards a real upstream request and degrades after upstream stops', async () => {
  const upstream = await listen(userService);
  const previousUrl = process.env.USER_SERVICE_URL;
  process.env.USER_SERVICE_URL = `http://127.0.0.1:${upstream.address().port}`;
  delete require.cache[require.resolve('./app')];
  const gatewayApp = require('./app');
  const gateway = await new Promise(resolve => {
    const server = gatewayApp.listen(0, () => resolve(server));
  });
  const baseUrl = `http://127.0.0.1:${gateway.address().port}`;

  try {
    const forwardedResponse = await fetch(`${baseUrl}/api/users/1`);
    const forwarded = await forwardedResponse.json();
    assert.equal(forwardedResponse.status, 200);
    assert.equal(forwarded.service, 'user-service');
    assert.equal(forwarded.data.username, 'demo_buyer');

    await new Promise(resolve => upstream.close(resolve));
    const degradedResponse = await fetch(`${baseUrl}/api/users/1`);
    const degraded = await degradedResponse.json();
    assert.equal(degradedResponse.status, 503);
    assert.equal(degraded.route, '/api/users');
    assert.match(degraded.fallback, /其他服务保持可用/);
  } finally {
    if (upstream.listening) {
      await new Promise(resolve => upstream.close(resolve));
    }
    await new Promise(resolve => gateway.close(resolve));
    if (previousUrl === undefined) {
      delete process.env.USER_SERVICE_URL;
    } else {
      process.env.USER_SERVICE_URL = previousUrl;
    }
    delete require.cache[require.resolve('./app')];
  }
});
