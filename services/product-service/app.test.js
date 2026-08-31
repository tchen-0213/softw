const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'softw_catalog_test';
process.env.INTERNAL_SERVICE_TOKEN = 'test_internal_token';
const { app, initialize, sequelize, models, experiment } = require('./app');

test('CPU burn experiment is disabled by default and capped when enabled', () => {
  delete process.env.EXPERIMENT_CPU_BURN_ENABLED;
  assert.equal(experiment.parseExperimentBurnMs('120'), 0);
  process.env.EXPERIMENT_CPU_BURN_ENABLED = 'true';
  assert.equal(experiment.parseExperimentBurnMs('120'), 120);
  assert.equal(experiment.parseExperimentBurnMs('999'), 250);
  assert.equal(experiment.parseExperimentBurnMs('invalid'), 0);
  delete process.env.EXPERIMENT_CPU_BURN_ENABLED;
});

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

    await models.Product.bulkCreate(Array.from({ length: 30 }, (_, index) => ({
      name: `分页性能商品-${index}`,
      description: '分页、筛选和推荐回归数据',
      price: 10 + index,
      stock: 10,
      category: 'performance-regression',
      sellerId: 9,
      sellerName: '卖家',
      status: index < 25 ? '在售' : '下架',
      sales: index,
      rating: 4
    })));
    const filtered = await fetch(`${base}/api/products?category=performance-regression&page=2&limit=10&sort=price_asc`).then(response => response.json());
    assert.equal(filtered.pagination.total, 25);
    assert.equal(filtered.products.length, 10, '分页查询不能返回超过 limit 的记录');
    assert.ok(filtered.products.every(item => item.category === 'performance-regression' && item.status === '在售'));
    assert.ok(filtered.products.every((item, index, rows) => index === 0 || Number(rows[index - 1].price) <= Number(item.price)), '筛选结果必须保持索引排序语义');

    const recommended = await fetch(`${base}/api/products/recommended`).then(response => response.json());
    assert.equal(recommended.length, 10, '推荐路径必须保持固定上限');
    assert.ok(recommended.every((item, index, rows) => index === 0 || Number(rows[index - 1].sales) >= Number(item.sales)), '推荐路径必须按销量降序');

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

    const concurrentProduct = await models.Product.create({ name: '并发库存商品', description: '只允许一个请求成功', price: 50, stock: 1, category: 'test', sellerId: 9, sellerName: '卖家' });
    const concurrentReserve = reservationId => fetch(`${base}/internal/products/reservations`, { method: 'POST', headers, body: JSON.stringify({ reservationId, items: [{ productId: concurrentProduct.id, quantity: 1 }] }) });
    const concurrentResponses = await Promise.all([concurrentReserve('concurrent-r-1'), concurrentReserve('concurrent-r-2')]);
    assert.deepEqual(concurrentResponses.map(response => response.status).sort(), [201, 400], '库存为 1 时只能有一个并发预留成功');
    await concurrentProduct.reload();
    assert.equal(concurrentProduct.stock, 0, '行锁事务不能造成超卖或负库存');
    assert.equal(await models.InventoryReservation.count({ where: { id: ['concurrent-r-1', 'concurrent-r-2'] } }), 1, '失败请求不能留下脏预留记录');

    const idempotentProduct = await models.Product.create({ name: '并发幂等商品', description: '同一幂等键只扣减一次', price: 60, stock: 2, category: 'test', sellerId: 9, sellerName: '卖家' });
    const sameIdReserve = () => fetch(`${base}/internal/products/reservations`, { method: 'POST', headers, body: JSON.stringify({ reservationId: 'same-id-concurrent', items: [{ productId: idempotentProduct.id, quantity: 1 }] }) });
    const sameIdResponses = await Promise.all([sameIdReserve(), sameIdReserve()]);
    assert.deepEqual(sameIdResponses.map(response => response.status).sort(), [200, 201], '并发重复幂等请求必须返回同一预留而不是 500');
    await idempotentProduct.reload();
    assert.equal(idempotentProduct.stock, 1, '并发重复幂等请求只能扣减一次库存');
    assert.equal(await models.InventoryReservation.count({ where: { id: 'same-id-concurrent' } }), 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await sequelize.close();
  }
});
