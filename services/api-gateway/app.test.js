const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('./app');

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
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
