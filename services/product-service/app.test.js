const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'softw_catalog_test';
process.env.INTERNAL_SERVICE_TOKEN = 'test_internal_token';
const { app, initialize, sequelize, models } = require('./app');

test('product service owns products and performs idempotent stock reservation', async () => {
  await initialize();
  await sequelize.sync({ force: true });
  const product = await models.Product.create({ name: '真实微服务商品', description: '数据库商品', price: 66, stock: 3, category: 'test', sellerId: 9, sellerName: '卖家' });
  const server = await new Promise(resolve => { const value = app.listen(0, () => resolve(value)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'content-type': 'application/json', 'x-internal-token': 'test_internal_token' };
  try {
    const list = await fetch(`${base}/api/products`).then(response => response.json());
    assert.equal(list.products[0].name, '真实微服务商品');

    const reserve = () => fetch(`${base}/internal/products/reservations`, { method: 'POST', headers, body: JSON.stringify({ reservationId: 'r-1', items: [{ productId: product.id, quantity: 2 }] }) });
    assert.equal((await reserve()).status, 201);
    assert.equal((await reserve()).status, 200);
    await product.reload();
    assert.equal(product.stock, 1, '重复幂等请求不能重复扣减库存');

    const released = await fetch(`${base}/internal/products/reservations/r-1/release`, { method: 'POST', headers });
    assert.equal(released.status, 200);
    await product.reload();
    assert.equal(product.stock, 3);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await sequelize.close();
  }
});
