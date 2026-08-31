const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { publicApis, routeKey } = require('./public-api-manifest');

const gateway = process.env.MICROSERVICE_GATEWAY_URL || 'http://127.0.0.1:8081';
const services = {
  'user-service': process.env.USER_SERVICE_URL || 'http://127.0.0.1:3101',
  'product-service': process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3102',
  'order-service': process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:3103',
  'api-gateway': gateway
};
const runId = `${Date.now()}-${process.pid}`;
const observedPublicApis = new Set();

function routePattern(path) {
  const segments = path.split('/').map(segment => segment.startsWith(':')
    ? '[^/]+'
    : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${segments.join('/')}$`);
}

function recordPublicApi(method, pathname) {
  const cleanPath = new URL(pathname, 'http://gateway.invalid').pathname;
  const match = publicApis.find(api => api.method === method.toUpperCase() && routePattern(api.path).test(cleanPath));
  assert.ok(match, `D6-02 公开 API 清单缺少 ${method.toUpperCase()} ${cleanPath}`);
  observedPublicApis.add(routeKey(match));
}

async function request(method, pathname, { token, body, headers = {}, expected = 200 } = {}) {
  if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) recordPublicApi(method, pathname);
  const response = await fetch(`${gateway}${pathname}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.status, expected, `${method} ${pathname}: ${JSON.stringify(payload)}`);
  return payload;
}

async function register(kind) {
  const suffix = `${kind}_${runId}_${randomUUID().slice(0, 8)}`;
  return request('POST', '/api/users/register', {
    expected: 201,
    body: {
      username: `ms_${suffix}`,
      email: `ms_${suffix}@example.com`,
      phone: `139${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
      password: 'Pass123456'
    }
  });
}

async function verifyShop(user) {
  return request('POST', '/api/shops/mine/verification', {
    token: user.token,
    body: {
      legalName: `微服务卖家-${runId}`,
      idNumber: '310101199001011234',
      verificationAddress: '软件工程实践中心',
      businessLicenseImage: '/uploads/license.png',
      idCardImage: '/uploads/id-card.png'
    }
  });
}

async function createProduct(seller, overrides = {}) {
  return request('POST', '/api/products', {
    token: seller.token,
    expected: 201,
    body: {
      name: `微服务回归商品 ${runId}`,
      description: '从 API 网关贯穿三个业务微服务的自动化测试商品',
      images: ['/uploads/microservice-product.png'],
      price: 88,
      stock: 8,
      category: 'books',
      brand: 'SoftwMS',
      bargainEnabled: true,
      ...overrides
    }
  });
}

async function createOrder(buyer, product, idempotencyKey = randomUUID()) {
  return request('POST', '/api/orders', {
    token: buyer.token,
    expected: 201,
    headers: { 'idempotency-key': idempotencyKey },
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: { name: '微服务买家', phone: '13800138000', address: '测试楼 101' },
      paymentMethod: 'wechat'
    }
  });
}

test('MS-E2E UC01-UC09 and every public microservice API through gateway', async t => {
  let seller;
  let buyer;
  let outsider;
  let product;
  let completedOrder;
  let evaluation;
  let conversation;

  await t.test('OPS-TC01 health, readiness and immutable version are observable', async () => {
    for (const [name, baseUrl] of Object.entries(services)) {
      const health = await fetch(`${baseUrl}/health`);
      assert.equal(health.status, 200, `${name} health`);
      assert.equal((await health.json()).service, name);
      const ready = await fetch(`${baseUrl}/ready`);
      assert.equal(ready.status, 200, `${name} readiness`);
      const version = await fetch(`${baseUrl}/version`).then(response => response.json());
      assert.equal(version.service, name);
      assert.ok(version.version);
      assert.ok(version.revision);
    }
    const preflight = await fetch(`${gateway}/api/products`, {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:8082', 'access-control-request-method': 'GET' }
    });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get('access-control-allow-methods') || '', /GET/);
    await request('GET', '/not-configured', { expected: 404 });
  });

  await t.test('MS-E2E-TC01 UC01 registration MAIN/ALT/ERR, login, profile and password branches', async () => {
    seller = await register('seller');
    buyer = await register('buyer');
    outsider = await register('outsider');
    await request('POST', '/api/users/register', {
      expected: 400,
      body: { username: seller.username, email: seller.email, phone: seller.phone, password: 'Pass123456' }
    });
    await request('POST', '/api/users/login', {
      expected: 401,
      body: { email: buyer.email, password: 'wrong-password' }
    });
    const login = await request('POST', '/api/users/login', {
      body: { email: buyer.email, password: 'Pass123456' }
    });
    assert.ok(login.token);
    const profile = await request('PUT', '/api/users/profile', {
      token: buyer.token,
      body: { nickname: '微服务回归买家', phone: '13800138001' }
    });
    assert.equal(profile.nickname, '微服务回归买家');
    assert.equal((await request('GET', '/api/users/profile', { token: buyer.token })).password, undefined);
    await request('PUT', '/api/users/password', {
      token: buyer.token,
      expected: 401,
      body: { oldPassword: 'wrong-password', newPassword: 'NextPass123' }
    });
    await request('PUT', '/api/users/password', {
      token: buyer.token,
      body: { oldPassword: 'Pass123456', newPassword: 'NextPass123' }
    });
    buyer.token = (await request('POST', '/api/users/login', {
      body: { email: buyer.email, password: 'NextPass123' }
    })).token;
  });

  await t.test('MS-E2E-TC09 UC09 address MAIN/ALT/ERR save, list, replace and authorization', async () => {
    const saved = await request('PUT', '/api/addresses', {
      token: buyer.token,
      body: { addresses: [
        { id: `a-${runId}`, name: '买家 A', phone: '13800138000', address: '教学楼 101' },
        { id: `b-${runId}`, name: '买家 B', phone: '13800138001', address: '宿舍楼 202' }
      ] }
    });
    assert.equal(saved.length, 2);
    assert.equal(saved.filter(address => address.isDefault).length, 1);
    assert.equal((await request('GET', '/api/addresses', { token: buyer.token })).length, 2);
    await request('PUT', '/api/addresses', { token: buyer.token, expected: 400, body: { invalid: true } });
    await request('GET', '/api/addresses', { expected: 401 });
    const replaced = await request('PUT', '/api/addresses', {
      token: buyer.token,
      body: [{ id: `b-${runId}`, name: '买家 B', phone: '13800138001', address: '宿舍楼 303', isDefault: true }]
    });
    assert.equal(replaced.length, 1);
  });

  await t.test('MS-E2E-TC06 UC06 shop MAIN/ALT/ERR creation, verification, update and public queries', async () => {
    const initial = await request('GET', '/api/shops/mine', { token: seller.token });
    assert.equal(initial.verificationStatus, '未认证');
    await request('POST', '/api/shops/mine/verification', {
      token: seller.token,
      expected: 400,
      body: { legalName: '材料不完整' }
    });
    const verified = await verifyShop(seller);
    assert.equal(verified.verificationStatus, '已认证');
    const updated = await request('PUT', '/api/shops/mine', {
      token: seller.token,
      body: { name: `微服务自动化店铺 ${runId}`, description: '已完成认证和维护' }
    });
    assert.equal((await request('GET', `/api/shops/${updated.id}`)).name, updated.name);
    assert.equal((await request('GET', `/api/shops/user/${seller.id}`)).userId, seller.id);
    await request('GET', '/api/shops/999999999', { expected: 404 });
  });

  await t.test('MS-API-UPLOAD public upload and static file interfaces', async () => {
    const form = new FormData();
    form.append('images', new Blob([Buffer.from('microservice-image')], { type: 'image/png' }), 'test.png');
    recordPublicApi('POST', '/api/uploads/images');
    const response = await fetch(`${gateway}/api/uploads/images`, {
      method: 'POST', headers: { authorization: `Bearer ${seller.token}` }, body: form
    });
    const responseText = await response.text();
    assert.equal(response.status, 201, responseText);
    const payload = JSON.parse(responseText);
    assert.equal(payload.urls.length, 1);
    recordPublicApi('GET', payload.urls[0]);
    assert.equal((await fetch(`${gateway}${payload.urls[0]}`)).status, 200);
  });

  await t.test('MS-E2E-TC02/03 UC02-03 product MAIN/ALT/ERR CRUD, search, recommendation and authorization', async () => {
    product = await createProduct(seller);
    const list = await request('GET', `/api/products?keyword=${encodeURIComponent(runId)}&category=books&sortBy=price_asc`);
    assert.ok(list.products.some(item => item.id === product.id));
    assert.ok((await request('GET', `/api/products/search?keyword=${encodeURIComponent(runId)}`)).products.length >= 1);
    assert.ok(Array.isArray(await request('GET', '/api/products/recommended')));
    assert.equal((await request('GET', `/api/products/${product.id}`)).name, product.name);
    assert.ok((await request('GET', '/api/products/mine', { token: seller.token })).products.some(item => item.id === product.id));
    await request('PUT', `/api/products/${product.id}`, { token: outsider.token, expected: 403, body: { price: 1 } });
    product = await request('PUT', `/api/products/${product.id}`, { token: seller.token, body: { price: 89, stock: 8 } });
    assert.equal(Number(product.price), 89);
    await request('PUT', `/api/products/${product.id}`, { token: seller.token, expected: 400, body: { status: '非法状态' } });
    const disposable = await createProduct(seller, { name: `待删除商品 ${runId}` });
    await request('DELETE', `/api/products/${disposable.id}`, { token: outsider.token, expected: 403 });
    await request('DELETE', `/api/products/${disposable.id}`, { token: seller.token });
    await request('GET', `/api/products/${disposable.id}`, { expected: 404 });
  });

  await t.test('MS-E2E-TC05 UC05 secondhand MAIN/ALT/ERR publish, list, update, errors and delete', async () => {
    const secondhand = await request('POST', '/api/secondhand', {
      token: seller.token,
      expected: 201,
      body: { name: `微服务二手商品 ${runId}`, description: '二手流程', price: 45, stock: 1,
        category: 'books', condition: '9成新', usageTime: '3个月', bargainEnabled: true }
    });
    assert.equal((await request('GET', `/api/secondhand/${secondhand.id}`)).isSecondhand, true);
    assert.ok((await request('GET', '/api/secondhand')).products.some(item => item.id === secondhand.id));
    assert.ok((await request('GET', `/api/secondhand/search?keyword=${encodeURIComponent(runId)}`)).products.length >= 1);
    const updated = await request('PUT', `/api/secondhand/${secondhand.id}`, {
      token: seller.token, body: { bargainEnabled: false, status: '下架' }
    });
    assert.equal(updated.bargainEnabled, false);
    await request('PUT', `/api/secondhand/${secondhand.id}`, { token: outsider.token, expected: 403, body: { price: 1 } });
    await request('DELETE', `/api/secondhand/${secondhand.id}`, { token: seller.token });
    await request('GET', `/api/secondhand/${secondhand.id}`, { expected: 404 });
  });

  await t.test('MS-E2E-TC04 UC04 order MAIN/ALT/ERR create, idempotency, pay, ship, confirm, cancel and errors', async () => {
    await request('POST', '/api/orders', { token: buyer.token, expected: 400, body: { items: [] } });
    await request('POST', '/api/orders', {
      token: buyer.token, expected: 400,
      body: { items: [{ productId: product.id, quantity: 999 }] }
    });
    const key = randomUUID();
    completedOrder = await createOrder(buyer, product, key);
    const repeated = await request('POST', '/api/orders', {
      token: buyer.token,
      headers: { 'idempotency-key': key },
      body: { items: [{ productId: product.id, quantity: 1 }] }
    });
    assert.equal(repeated.id, completedOrder.id);
    assert.ok((await request('GET', '/api/orders', { token: buyer.token })).orders.some(order => order.id === completedOrder.id));
    assert.ok((await request('GET', '/api/orders/seller', { token: seller.token })).orders.some(order => order.id === completedOrder.id));
    assert.equal((await request('GET', `/api/orders/${completedOrder.id}`, { token: buyer.token })).id, completedOrder.id);
    await request('GET', `/api/orders/${completedOrder.id}`, { token: outsider.token, expected: 403 });
    await request('POST', `/api/orders/${completedOrder.id}/pay`, { token: outsider.token, expected: 403 });
    completedOrder = await request('POST', `/api/orders/${completedOrder.id}/pay`, { token: buyer.token });
    await request('POST', `/api/orders/${completedOrder.id}/ship`, { token: seller.token, expected: 400, body: {} });
    completedOrder = await request('POST', `/api/orders/${completedOrder.id}/ship`, {
      token: seller.token, body: { company: '顺丰', trackingNumber: `SF${runId}` }
    });
    completedOrder = await request('POST', `/api/orders/${completedOrder.id}/confirm`, { token: buyer.token });
    assert.equal(completedOrder.status, '已完成');

    const cancellable = await createOrder(buyer, product);
    assert.equal((await request('POST', `/api/orders/${cancellable.id}/cancel`, { token: buyer.token })).status, '已取消');

    const putOrder = await createOrder(buyer, product);
    await request('POST', `/api/orders/${putOrder.id}/pay`, { token: buyer.token });
    await request('PUT', `/api/orders/${putOrder.id}`, {
      token: seller.token,
      body: { status: '待收货', logisticsInfo: { company: '圆通', trackingNumber: `YT${runId}` } }
    });
    assert.equal((await request('PUT', `/api/orders/${putOrder.id}`, {
      token: buyer.token, body: { status: '已完成' }
    })).status, '已完成');
    assert.equal((await request('GET', '/api/orders/health/dependencies')).status, 'ok');
  });

  await t.test('MS-E2E-TC07 UC07 evaluation MAIN/ALT/ERR create, three lists, approve, reply and errors', async () => {
    evaluation = await request('POST', '/api/evaluations', {
      token: buyer.token,
      expected: 201,
      body: { orderId: completedOrder.id, productId: product.id, rating: 5,
        content: '微服务端到端评价', images: ['/uploads/evaluation.png'] }
    });
    await request('POST', '/api/evaluations', {
      token: buyer.token, expected: 400,
      body: { orderId: completedOrder.id, productId: product.id, rating: 5, content: '重复评价' }
    });
    assert.ok((await request('GET', `/api/evaluations/product?productId=${product.id}`)).evaluations.length >= 1);
    assert.ok((await request('GET', '/api/evaluations/user', { token: buyer.token })).evaluations.length >= 1);
    assert.ok((await request('GET', '/api/evaluations/seller', { token: seller.token })).evaluations.length >= 1);
    await request('PUT', `/api/evaluations/${evaluation.id}/approve`, {
      token: seller.token, expected: 403, body: {}
    });
    await request('PUT', `/api/evaluations/${evaluation.id}/reply`, { token: outsider.token, expected: 403, body: { reply: '越权' } });
    const replied = await request('PUT', `/api/evaluations/${evaluation.id}/reply`, {
      token: seller.token, body: { reply: '感谢支持' }
    });
    assert.equal(replied.reply, '感谢支持');
  });

  await t.test('MS-E2E-TC08 UC08 chat MAIN/ALT/ERR, text, bargain, refund, decisions and authorization', async () => {
    conversation = await request('POST', '/api/chats/conversations', {
      token: buyer.token, expected: 201, body: { productId: product.id }
    });
    await request('POST', '/api/chats/conversations', {
      token: seller.token, expected: 400, body: { productId: product.id }
    });
    assert.ok((await request('GET', '/api/chats/conversations?role=buyer', { token: buyer.token })).conversations.length >= 1);
    assert.ok((await request('GET', '/api/chats/conversations?role=seller', { token: seller.token })).conversations.length >= 1);
    await request('GET', `/api/chats/conversations/${conversation.id}`, { token: outsider.token, expected: 403 });
    await request('POST', `/api/chats/conversations/${conversation.id}/messages`, {
      token: buyer.token, expected: 201, body: { type: 'text', content: '商品还在吗？' }
    });
    await request('POST', `/api/chats/conversations/${conversation.id}/messages`, {
      token: buyer.token, expected: 400, body: { type: 'bargain', amount: -1 }
    });
    const bargain = await request('POST', `/api/chats/conversations/${conversation.id}/messages`, {
      token: buyer.token, expected: 201, body: { type: 'bargain', amount: 70 }
    });
    const accepted = await request('PUT', `/api/chats/messages/${bargain.id}/decision`, {
      token: seller.token, body: { status: 'accepted' }
    });
    assert.equal(accepted.request.requestStatus, 'accepted');
    await request('PUT', `/api/chats/messages/${bargain.id}/decision`, {
      token: seller.token, expected: 400, body: { status: 'accepted' }
    });
    const refund = await request('POST', `/api/chats/conversations/${conversation.id}/messages`, {
      token: buyer.token, expected: 201, body: { type: 'refund', amount: 20 }
    });
    assert.equal(refund.type, 'refund');
    assert.ok((await request('GET', `/api/chats/conversations/${conversation.id}`, { token: buyer.token })).messages.length >= 4);
  });

  await t.test('MS-COVERAGE D6-02 public API inventory has no uncovered route', () => {
    const missing = publicApis.map(routeKey).filter(key => !observedPublicApis.has(key));
    assert.deepEqual(missing, []);
  });
});
