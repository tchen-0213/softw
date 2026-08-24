const test = require('node:test');
const assert = require('node:assert/strict');

process.env.PRODUCT_SERVICE_URL = 'http://127.0.0.1:1';

const app = require('./app');

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('order service keeps order query available when product dependency degrades', async () => {
  const server = await listen();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const orders = await fetch(`${baseUrl}/api/orders`).then(res => res.json());
    assert.equal(orders.service, 'order-service');
    assert.equal(orders.data[0].status, 'paid');

    const dependency = await fetch(`${baseUrl}/api/orders/health/dependencies`).then(res => res.json());
    assert.equal(dependency.status, 'degraded');
    assert.match(dependency.fallback, /订单核心查询/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
