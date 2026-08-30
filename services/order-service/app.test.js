const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.DB_NAME = process.env.DB_NAME || 'softw_orders_test';
process.env.JWT_SECRET = 'test_microservice_secret';
process.env.INTERNAL_SERVICE_TOKEN = 'test_internal_token';

function fixture(handler) {
  const server = http.createServer(handler);
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('order service persists order snapshots through product service API', async () => {
  const userServer = await fixture((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ id: 1, username: 'buyer', role: 'user' })); });
  let reservationRequest;
  const productServer = await fixture((req, res) => { res.setHeader('content-type', 'application/json'); if (req.url === '/health') return res.end(JSON.stringify({ status: 'ok' })); let body = ''; req.on('data', chunk => { body += chunk; }); req.on('end', () => { reservationRequest = body ? JSON.parse(body) : null; res.statusCode = 201; res.end(JSON.stringify({ reservationId: 'order-reservation', status: 'reserved', items: [{ productId: 7, name: '跨服务商品', price: 40, priceSource: 'accepted_bargain', bargainMessageId: 21, quantity: 2, sellerId: 2, sellerName: 'seller' }] })); }); });
  process.env.USER_SERVICE_URL = `http://127.0.0.1:${userServer.address().port}`;
  process.env.PRODUCT_SERVICE_URL = `http://127.0.0.1:${productServer.address().port}`;
  const { app, initialize, sequelize } = require('./app');
  await initialize();
  await sequelize.sync({ force: true });
  const server = await new Promise(resolve => { const value = app.listen(0, () => resolve(value)); });
  try {
    const token = jwt.sign({ id: 1 }, 'test_microservice_secret');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/orders`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': 'order-reservation' }, body: JSON.stringify({ items: [{ productId: 7, quantity: 2, bargainMessageId: 21 }], shippingAddress: { address: '测试地址' } }) });
    assert.equal(response.status, 201);
    const order = await response.json();
    assert.equal(Number(order.totalAmount), 80);
    assert.equal(order.items[0].name, '跨服务商品');
    assert.equal(order.items[0].priceSource, 'accepted_bargain');
    assert.equal(reservationRequest.buyerId, 1);
    assert.equal(reservationRequest.items[0].bargainMessageId, 21);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => userServer.close(resolve));
    await new Promise(resolve => productServer.close(resolve));
    await sequelize.close();
  }
});
