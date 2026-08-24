const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('./app');

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('product service exposes product and secondhand lists', async () => {
  const server = await listen();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const products = await fetch(`${baseUrl}/api/products`).then(res => res.json());
    assert.equal(products.service, 'product-service');
    assert.ok(products.data.length >= 2);

    const secondhand = await fetch(`${baseUrl}/api/secondhand`).then(res => res.json());
    assert.ok(secondhand.data.length >= 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
