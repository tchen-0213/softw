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
  const userServer = await fixture((req, res) => {
    const id = Number(req.url.split('/').pop()) || 1;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ id, username: id === 2 ? 'seller' : 'buyer', role: id === 2 ? 'seller' : 'user' }));
  });
  let reservationRequest;
  const productServer = await fixture((req, res) => { res.setHeader('content-type', 'application/json'); if (req.url === '/health') return res.end(JSON.stringify({ status: 'ok' })); let body = ''; req.on('data', chunk => { body += chunk; }); req.on('end', () => { reservationRequest = body ? JSON.parse(body) : null; res.statusCode = 201; res.end(JSON.stringify({ reservationId: 'order-reservation', status: 'reserved', items: [{ productId: 7, name: '跨服务商品', price: 40, priceSource: 'accepted_bargain', bargainMessageId: 21, quantity: 2, sellerId: 2, sellerName: 'seller' }] })); }); });
  process.env.USER_SERVICE_URL = `http://127.0.0.1:${userServer.address().port}`;
  process.env.PRODUCT_SERVICE_URL = `http://127.0.0.1:${productServer.address().port}`;
  const { app, initialize, sequelize, models, queries } = require('./app');
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

    assert.equal(await models.OrderSeller.count({ where: { orderId: order.id, sellerId: 2 } }), 1);
    const sellerToken = jwt.sign({ id: 2 }, 'test_microservice_secret');
    const sellerResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/orders/seller?page=1&limit=1`, { headers: { authorization: `Bearer ${sellerToken}` } });
    assert.equal(sellerResponse.status, 200);
    const sellerOrders = await sellerResponse.json();
    assert.equal(sellerOrders.pagination.total, 1);
    assert.equal(sellerOrders.orders.length, 1);
    assert.deepEqual(sellerOrders.orders[0].items.map(item => item.sellerId), [2]);

    const legacy = await models.Order.create({ userId: 3, reservationId: 'legacy-order', items: [{ productId: 8, sellerId: 2, quantity: 1 }], totalAmount: 20 });
    await queries.backfillOrderSellerLinks();
    assert.equal(await models.OrderSeller.count({ where: { orderId: legacy.id, sellerId: 2 } }), 1, '旧订单必须分批回填卖家查询映射');
    const pagedSellerResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/orders/seller?page=1&limit=1`, { headers: { authorization: `Bearer ${sellerToken}` } }).then(response => response.json());
    assert.equal(pagedSellerResponse.pagination.total, 2);
    assert.equal(pagedSellerResponse.orders.length, 1, '卖家订单查询必须在数据库层限制分页大小');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => userServer.close(resolve));
    await new Promise(resolve => productServer.close(resolve));
    await sequelize.close();
  }
});
