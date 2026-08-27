const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

function listen(app) { return new Promise(resolve => { const server = app.listen(0, () => resolve(server)); }); }

test('api gateway exposes all business routes and degrades after upstream stops', async () => {
  const upstream = http.createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ service: 'user-service', path: req.url })); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  process.env.USER_SERVICE_URL = `http://127.0.0.1:${upstream.address().port}`;
  delete require.cache[require.resolve('./app')];
  const gateway = await listen(require('./app'));
  const base = `http://127.0.0.1:${gateway.address().port}`;
  try {
    const version = await fetch(`${base}/version`).then(response => response.json());
    for (const prefix of ['/api/users', '/api/addresses', '/api/products', '/api/orders', '/api/evaluations', '/api/chats']) assert.ok(version.routes.some(route => route.prefix === prefix));
    const forwarded = await fetch(`${base}/api/users/profile`);
    assert.equal(forwarded.status, 200);
    await new Promise(resolve => upstream.close(resolve));
    const degraded = await fetch(`${base}/api/users/profile`);
    assert.equal(degraded.status, 503);
  } finally {
    if (upstream.listening) await new Promise(resolve => upstream.close(resolve));
    await new Promise(resolve => gateway.close(resolve));
  }
});
