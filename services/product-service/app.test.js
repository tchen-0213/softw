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

    const bargainProduct = await models.Product.create({ name: '议价商品', description: '跨服务议价', price: 100, stock: 2, category: 'test', sellerId: 9, sellerName: '卖家' });
    const conversation = await models.ChatConversation.create({ buyerId: 3, sellerId: 9, productId: bargainProduct.id });
    const bargain = await models.ChatMessage.create({ conversationId: conversation.id, senderId: 3, type: 'bargain', amount: 80, requestStatus: 'accepted' });
    const bargainBody = { reservationId: 'bargain-r-1', buyerId: 3, items: [{ productId: bargainProduct.id, quantity: 1, bargainMessageId: bargain.id }] };
    const bargainResponse = await fetch(`${base}/internal/products/reservations`, { method: 'POST', headers, body: JSON.stringify(bargainBody) });
    assert.equal(bargainResponse.status, 201);
    const bargainReservation = await bargainResponse.json();
    assert.equal(Number(bargainReservation.items[0].price), 80);
    assert.equal(bargainReservation.items[0].priceSource, 'accepted_bargain');
    assert.equal((await fetch(`${base}/internal/products/reservations`, { method: 'POST', headers, body: JSON.stringify({ ...bargainBody, reservationId: 'bargain-r-2' }) })).status, 400);

    const restored = await fetch(`${base}/internal/products/reservations/bargain-r-1/release`, { method: 'POST', headers, body: JSON.stringify({ restoreBargains: true }) });
    assert.equal(restored.status, 200);
    await bargain.reload();
    assert.equal(bargain.redeemedAt, null, '订单创建失败补偿时应恢复议价兑换资格');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await sequelize.close();
  }
});
