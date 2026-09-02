const test = require('node:test');
const assert = require('node:assert/strict');

const shouldRun = process.env.RUN_API_E2E === '1';
const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
let userSequence = 0;

const request = async (method, path, { token, body, headers } = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined)
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  return { response, data };
};

const expectStatus = async (method, path, expected, options) => {
  const result = await request(method, path, options);
  assert.equal(result.response.status, expected,
    `${method} ${path} expected ${expected}, got ${result.response.status}: ${JSON.stringify(result.data)}`);
  return result.data;
};

const registerUser = async (kind) => {
  userSequence += 1;
  const suffix = `${runId}_${userSequence}`;
  const payload = {
    username: `api_${kind}_${suffix}`,
    email: `api_${kind}_${suffix}@example.com`,
    phone: `13${String(runId + userSequence).slice(-9).padStart(9, '0')}`,
    password: 'Pass123456'
  };
  const registered = await expectStatus('POST', '/api/users/register', 201, { body: payload });
  assert.ok(registered.token);
  return { ...payload, id: registered._id, token: registered.token };
};

const verifyShop = (user) => expectStatus('POST', '/api/shops/mine/verification', 200, {
  token: user.token,
  body: {
    legalName: `经营者${userSequence}`,
    idNumber: `ID${runId}${userSequence}`,
    verificationAddress: '软件工程测试路 2 号',
    businessLicenseImage: '/uploads/license.png',
    idCardImage: '/uploads/id-card.png'
  }
});

const createProduct = (seller, overrides = {}) => expectStatus('POST', '/api/products', 201, {
  token: seller.token,
  body: {
    name: `API 测试商品 ${runId}-${Math.random()}`,
    description: '用于业务场景自动化测试',
    images: ['/uploads/api-product.png'],
    price: 88.8,
    stock: 5,
    category: 'books',
    brand: '测试品牌',
    bargainEnabled: true,
    ...overrides
  }
});

const createOrder = (buyer, product, quantity = 1) => expectStatus('POST', '/api/orders', 201, {
  token: buyer.token,
  body: {
    items: [{ productId: product.id, quantity }],
    shippingAddress: { name: '测试买家', phone: '13800138000', address: '软件工程测试路 1 号' },
    paymentMethod: 'wechat'
  }
});

const completeOrder = async (buyer, seller, product) => {
  const order = await createOrder(buyer, product);
  await expectStatus('POST', `/api/orders/${order.id}/pay`, 200, { token: buyer.token });
  await expectStatus('POST', `/api/orders/${order.id}/ship`, 200, {
    token: seller.token,
    body: { company: '顺丰速运', trackingNumber: `SF${runId}${order.id}` }
  });
  return expectStatus('POST', `/api/orders/${order.id}/confirm`, 200, { token: buyer.token });
};

test('UC01-UC12 完整 API 主成功、备选和异常流程', { skip: !shouldRun }, async (t) => {
  let seller;
  let buyer;
  let outsider;
  let product;
  let secondhand;
  let completedOrder;
  let evaluation;
  let conversation;
  let acceptedBargain;

  await t.test('INT-TC01-MAIN UC01 注册、登录并读取资料', async () => {
    seller = await registerUser('seller');
    buyer = await registerUser('buyer');
    outsider = await registerUser('outsider');
    const loggedIn = await expectStatus('POST', '/api/users/login', 200, {
      body: { email: buyer.email, password: buyer.password }
    });
    const profile = await expectStatus('GET', '/api/users/profile', 200, { token: loggedIn.token });
    assert.equal(profile.email, buyer.email);
    assert.equal(profile.password, undefined);
  });

  await t.test('INT-TC01-ALT UC01 修改资料和密码后重新登录', async () => {
    const nickname = `买家${runId}`;
    const profile = await expectStatus('PUT', '/api/users/profile', 200, {
      token: buyer.token, body: { nickname, phone: buyer.phone }
    });
    assert.equal(profile.nickname, nickname);
    await expectStatus('PUT', '/api/users/password', 200, {
      token: buyer.token, body: { oldPassword: buyer.password, newPassword: 'NextPass123' }
    });
    const login = await expectStatus('POST', '/api/users/login', 200, {
      body: { email: buyer.email, password: 'NextPass123' }
    });
    buyer.password = 'NextPass123';
    buyer.token = login.token;
  });

  await t.test('INT-TC01-ERR UC01 拒绝重复注册、错误密码和未授权访问', async () => {
    await expectStatus('POST', '/api/users/register', 400, { body: buyer });
    await expectStatus('POST', '/api/users/login', 401, {
      body: { email: buyer.email, password: 'WrongPassword' }
    });
    await expectStatus('GET', '/api/users/profile', 401);
    await expectStatus('POST', '/api/users/register', 400, {
      body: { username: '', email: 'bad', phone: '', password: '1' }
    });
  });

  await t.test('INT-TC02-MAIN UC02 关键词、分类、价格和排序检索', async () => {
    assert.equal((await verifyShop(seller)).verificationStatus, '已认证');
    product = await createProduct(seller, { name: `检索教材 ${runId}`, price: 88.8 });
    secondhand = await expectStatus('POST', '/api/secondhand', 201, {
      token: seller.token,
      body: {
        name: `二手教材 ${runId}`, description: '九成新教材', images: ['/uploads/api-secondhand.png'],
        price: 45, stock: 1, category: 'books', condition: 2, usageTime: '1 年',
        location: '校内', bargainEnabled: true
      }
    });
    const list = await expectStatus('GET',
      `/api/products?keyword=${encodeURIComponent(runId)}&category=books&minPrice=40&maxPrice=100&sort=price_asc`, 200);
    assert.ok(list.products.length >= 2);
    assert.ok(Number(list.products[0].price) <= Number(list.products[1].price));
  });

  await t.test('INT-TC02-ALT UC02 二手专区和空结果查询', async () => {
    const list = await expectStatus('GET', `/api/secondhand?keyword=${encodeURIComponent(runId)}`, 200);
    assert.ok(list.products.some(item => Number(item.id) === Number(secondhand.id)));
    assert.ok(list.products.every(item => item.isSecondhand === true));
    const empty = await expectStatus('GET', `/api/products?keyword=not-found-${runId}`, 200);
    assert.equal(empty.pagination.total, 0);
    assert.deepEqual(empty.products, []);
  });

  await t.test('INT-TC02-ERR UC02 非法分页参数会被安全归一化', async () => {
    const list = await expectStatus('GET', '/api/products?page=-3&limit=999', 200);
    assert.equal(list.pagination.page, 1);
    assert.equal(list.pagination.limit, 100);
  });

  await t.test('INT-TC03-MAIN UC03 查看商品详情并验证卖家及图片信息', async () => {
    const detail = await expectStatus('GET', `/api/products/${product.id}`, 200);
    assert.equal(detail.name, product.name);
    assert.equal(Number(detail.seller.id), Number(seller.id));
    assert.ok(Array.isArray(detail.images));
  });

  await t.test('INT-TC03-ALT UC03 重复查看累计浏览量并获得推荐', async () => {
    const before = await expectStatus('GET', `/api/products/${product.id}`, 200);
    const after = await expectStatus('GET', `/api/products/${product.id}`, 200);
    assert.ok(Number(after.views) > Number(before.views));
    const recommended = await expectStatus('GET', '/api/products/recommended?limit=10', 200);
    assert.ok(Array.isArray(recommended.products || recommended));
  });

  await t.test('INT-TC03-ERR UC03 不存在的商品返回 404', async () => {
    await expectStatus('GET', '/api/products/999999999', 404);
  });

  await t.test('INT-TC04-MAIN UC04 下单、支付、发货、确认收货完整流转', async () => {
    completedOrder = await completeOrder(buyer, seller, product);
    assert.equal(completedOrder.status, '已完成');
    assert.equal(completedOrder.paymentStatus, '已支付');
    assert.equal(completedOrder.logisticsInfo.status, '已签收');
    const sellerOrders = await expectStatus('GET', '/api/orders/seller', 200, { token: seller.token });
    assert.ok(sellerOrders.orders.some(item => Number(item.id) === Number(completedOrder.id)));
  });

  await t.test('INT-TC04-ALT UC04 取消待付款订单并恢复库存', async () => {
    const cancellable = await createProduct(seller, { name: `取消订单商品 ${runId}`, stock: 2 });
    const order = await createOrder(buyer, cancellable);
    assert.equal((await expectStatus('GET', `/api/products/${cancellable.id}`, 200)).stock, 1);
    const cancelled = await expectStatus('POST', `/api/orders/${order.id}/cancel`, 200, { token: buyer.token });
    assert.equal(cancelled.status, '已取消');
    assert.equal((await expectStatus('GET', `/api/products/${cancellable.id}`, 200)).stock, 2);
  });

  await t.test('INT-TC04-ERR UC04 拒绝超库存、越权支付、缺失物流和重复支付', async () => {
    await expectStatus('POST', '/api/orders', 400, {
      token: buyer.token, body: { items: [{ productId: product.id, quantity: 1 }] }
    });
    await expectStatus('POST', '/api/orders', 400, {
      token: buyer.token,
      body: {
        items: [{ productId: product.id, quantity: 999 }],
        shippingAddress: { name: '测试买家', phone: '13800138000', address: '软件工程测试路 1 号' }
      }
    });
    const order = await createOrder(buyer, product);
    await expectStatus('POST', `/api/orders/${order.id}/pay`, 403, { token: outsider.token });
    await expectStatus('POST', `/api/orders/${order.id}/pay`, 200, { token: buyer.token });
    await expectStatus('POST', `/api/orders/${order.id}/pay`, 400, { token: buyer.token });
    await expectStatus('POST', `/api/orders/${order.id}/ship`, 400, {
      token: seller.token, body: { company: '', trackingNumber: '' }
    });
  });

  await t.test('INT-TC05-MAIN UC05 发布二手商品并在专区查看', async () => {
    const detail = await expectStatus('GET', `/api/secondhand/${secondhand.id}`, 200);
    assert.equal(detail.isSecondhand, true);
    assert.equal(detail.condition, '9成新');
  });

  await t.test('INT-TC05-ALT UC05 关闭议价并下架自己的二手商品', async () => {
    const updated = await expectStatus('PUT', `/api/secondhand/${secondhand.id}`, 200, {
      token: seller.token, body: { bargainEnabled: false, status: '下架' }
    });
    assert.equal(updated.bargainEnabled, false);
    assert.equal(updated.status, '下架');
    const mine = await expectStatus('GET', '/api/products/mine?includeUnavailable=true', 200, { token: seller.token });
    assert.ok(mine.products.some(item => Number(item.id) === Number(secondhand.id)));
  });

  await t.test('INT-TC05-ERR UC05 拒绝未认证发布、他人修改和非法状态', async () => {
    const unverified = await registerUser('unverified_secondhand');
    await expectStatus('POST', '/api/secondhand', 403, {
      token: unverified.token, body: { name: '未认证商品', price: 10, stock: 1 }
    });
    await expectStatus('PUT', `/api/secondhand/${secondhand.id}`, 403, {
      token: outsider.token, body: { status: '下架' }
    });
    await expectStatus('PUT', `/api/secondhand/${secondhand.id}`, 400, {
      token: seller.token, body: { status: '不存在的状态' }
    });
  });

  let shopOwner;
  let ownerShop;
  await t.test('INT-TC06-MAIN UC06 创建、认证并维护店铺', async () => {
    shopOwner = await registerUser('shop_owner');
    const initial = await expectStatus('GET', '/api/shops/mine', 200, { token: shopOwner.token });
    assert.equal(initial.verificationStatus, '未认证');
    ownerShop = await verifyShop(shopOwner);
    assert.equal(ownerShop.status, '营业中');
    ownerShop = await expectStatus('PUT', '/api/shops/mine', 200, {
      token: shopOwner.token, body: { name: `自动化店铺 ${runId}`, description: '已通过自动化维护' }
    });
    assert.equal(ownerShop.name, `自动化店铺 ${runId}`);
  });

  await t.test('INT-TC06-ALT UC06 通过店铺和用户入口公开查看', async () => {
    const byId = await expectStatus('GET', `/api/shops/${ownerShop.id}`, 200);
    const byUser = await expectStatus('GET', `/api/shops/user/${shopOwner.id}`, 200);
    assert.equal(byId.id, byUser.id);
    assert.equal(byUser.name, ownerShop.name);
  });

  await t.test('INT-TC06-ERR UC06 拒绝缺少材料，未认证店铺不能发布', async () => {
    const unverified = await registerUser('unverified_shop');
    await expectStatus('POST', '/api/shops/mine/verification', 400, {
      token: unverified.token, body: { legalName: '材料不全' }
    });
    await expectStatus('POST', '/api/products', 403, {
      token: unverified.token, body: { name: '不能发布', price: 1, stock: 1 }
    });
    await expectStatus('GET', '/api/shops/999999999', 404);
  });

  await t.test('INT-TC07-MAIN UC07 完成订单后评价商品', async () => {
    const evaluatedProduct = await createProduct(seller, { name: `评价商品 ${runId}`, stock: 2 });
    completedOrder = await completeOrder(buyer, seller, evaluatedProduct);
    evaluation = await expectStatus('POST', '/api/evaluations', 201, {
      token: buyer.token,
      body: {
        orderId: completedOrder.id, productId: evaluatedProduct.id, rating: 5,
        content: '自动化测试评价内容', images: ['/uploads/evaluation.png']
      }
    });
    assert.equal(Number(evaluation.rating), 5);
    assert.deepEqual(evaluation.images, ['/uploads/evaluation.png']);
  });

  await t.test('INT-TC07-ALT UC07 买卖双方查询评价且卖家回复', async () => {
    const productList = await expectStatus('GET', `/api/evaluations/product?productId=${evaluation.productId}`, 200);
    const userList = await expectStatus('GET', '/api/evaluations/user', 200, { token: buyer.token });
    const sellerList = await expectStatus('GET', '/api/evaluations/seller', 200, { token: seller.token });
    assert.ok(productList.evaluations.some(item => Number(item.id) === Number(evaluation.id)));
    assert.ok(userList.evaluations.some(item => Number(item.id) === Number(evaluation.id)));
    assert.ok(sellerList.pendingReplyCount >= 1);
    const replied = await expectStatus('PUT', `/api/evaluations/${evaluation.id}/reply`, 200, {
      token: seller.token, body: { reply: '感谢支持，自动化测试回复。' }
    });
    assert.equal(replied.reply, '感谢支持，自动化测试回复。');
  });

  await t.test('INT-TC07-ERR UC07 拒绝重复评价、越权回复和空回复', async () => {
    await expectStatus('POST', '/api/evaluations', 400, {
      token: buyer.token,
      body: { orderId: completedOrder.id, productId: evaluation.productId, rating: 5, content: '重复评价' }
    });
    await expectStatus('PUT', `/api/evaluations/${evaluation.id}/reply`, 403, {
      token: outsider.token, body: { reply: '越权回复' }
    });
    await expectStatus('PUT', `/api/evaluations/${evaluation.id}/reply`, 400, {
      token: seller.token, body: { reply: '   ' }
    });
  });

  await t.test('INT-TC08-MAIN UC08 建立会话、发送消息和接受议价', async () => {
    conversation = await expectStatus('POST', '/api/chats/conversations', 201, {
      token: buyer.token, body: { productId: product.id }
    });
    const textMessage = await expectStatus('POST', `/api/chats/conversations/${conversation.id}/messages`, 201, {
      token: buyer.token, body: { type: 'text', content: '这件商品还在吗？' }
    });
    assert.equal(textMessage.type, 'text');
    acceptedBargain = await expectStatus('POST', `/api/chats/conversations/${conversation.id}/messages`, 201, {
      token: buyer.token, body: { type: 'bargain', amount: 80 }
    });
    const decision = await expectStatus('PUT', `/api/chats/messages/${acceptedBargain.id}/decision`, 200, {
      token: seller.token, body: { status: 'accepted' }
    });
    assert.equal(decision.request.requestStatus, 'accepted');

    const bargainOrderPayload = {
      items: [{ productId: product.id, quantity: 1, bargainMessageId: acceptedBargain.id }],
      shippingAddress: { name: '议价买家', phone: '13800138000', address: '软件工程测试路 1 号' },
      paymentMethod: 'wechat'
    };
    await expectStatus('POST', '/api/orders', 403, {
      token: outsider.token,
      body: bargainOrderPayload
    });
    const bargainOrder = await expectStatus('POST', '/api/orders', 201, {
      token: buyer.token,
      body: bargainOrderPayload
    });
    assert.equal(Number(bargainOrder.totalAmount), 80);
    assert.equal(Number(bargainOrder.items[0].price), 80);
    assert.equal(bargainOrder.items[0].priceSource, 'accepted_bargain');
    await expectStatus('POST', '/api/orders', 400, {
      token: buyer.token,
      body: bargainOrderPayload
    });
  });

  await t.test('INT-TC08-ALT UC08 复用会话并拒绝另一条议价', async () => {
    const reused = await expectStatus('POST', '/api/chats/conversations', 201, {
      token: buyer.token, body: { productId: product.id }
    });
    assert.equal(reused.id, conversation.id);
    const bargain = await expectStatus('POST', `/api/chats/conversations/${conversation.id}/messages`, 201, {
      token: buyer.token, body: { type: 'bargain', amount: 70 }
    });
    const rejected = await expectStatus('PUT', `/api/chats/messages/${bargain.id}/decision`, 200, {
      token: seller.token, body: { status: 'rejected' }
    });
    assert.equal(rejected.request.requestStatus, 'rejected');
    const messages = await expectStatus('GET', `/api/chats/conversations/${conversation.id}`, 200, { token: buyer.token });
    assert.ok(messages.messages.length >= 5);
    assert.ok(messages.messages.some(item => (
      Number(item.id) === Number(bargain.id) && item.requestStatus === 'rejected'
    )));
  });

  await t.test('INT-TC08-ERR UC08 拒绝自聊、非成员访问、非法金额和重复处理', async () => {
    await expectStatus('POST', '/api/chats/conversations', 400, {
      token: seller.token, body: { productId: product.id }
    });
    await expectStatus('GET', `/api/chats/conversations/${conversation.id}`, 403, { token: outsider.token });
    await expectStatus('POST', `/api/chats/conversations/${conversation.id}/messages`, 400, {
      token: buyer.token, body: { type: 'bargain', amount: -1 }
    });
    await expectStatus('PUT', `/api/chats/messages/${acceptedBargain.id}/decision`, 400, {
      token: seller.token, body: { status: 'accepted' }
    });
  });

  await t.test('INT-TC09-MAIN UC09 保存、读取并自动确定默认地址', async () => {
    const addresses = await expectStatus('PUT', '/api/addresses', 200, {
      token: buyer.token,
      body: { addresses: [
        { id: `addr-a-${runId}`, name: '测试买家', phone: '13800138000', address: '教学楼 101' },
        { id: `addr-b-${runId}`, name: '测试买家', phone: '13800138001', address: '宿舍楼 202' }
      ] }
    });
    assert.equal(addresses.length, 2);
    assert.equal(addresses.filter(item => item.isDefault).length, 1);
    assert.equal((await expectStatus('GET', '/api/addresses', 200, { token: buyer.token })).length, 2);
  });

  await t.test('INT-TC09-ALT UC09 修改、删除地址并切换默认项', async () => {
    const addresses = await expectStatus('PUT', '/api/addresses', 200, {
      token: buyer.token,
      body: [{ id: `addr-b-${runId}`, name: '修改后的买家', phone: '13800138001',
        address: '宿舍楼 303', isDefault: true }]
    });
    assert.equal(addresses.length, 1);
    assert.equal(addresses[0].name, '修改后的买家');
    assert.equal(addresses[0].isDefault, true);
  });

  await t.test('INT-TC09-ERR UC09 拒绝错误格式、未授权访问并隔离用户数据', async () => {
    await expectStatus('PUT', '/api/addresses', 400, { token: buyer.token, body: { bad: true } });
    await expectStatus('GET', '/api/addresses', 401);
    assert.deepEqual(await expectStatus('GET', '/api/addresses', 200, { token: outsider.token }), []);
    const filtered = await expectStatus('PUT', '/api/addresses', 200, {
      token: outsider.token, body: [{ name: '缺少字段' }]
    });
    assert.deepEqual(filtered, []);
  });

  await t.test('INT-PUBLIC-01 商品与二手商品公开路由逐项回归', async () => {
    const productSearch = await expectStatus('GET', `/api/products/search?keyword=${encodeURIComponent(runId)}`, 200);
    assert.ok(productSearch.products.some(item => Number(item.id) === Number(product.id)));

    const disposableProduct = await createProduct(seller, { name: `待更新删除商品 ${runId}`, stock: 1 });
    const updatedProduct = await expectStatus('PUT', `/api/products/${disposableProduct.id}`, 200, {
      token: seller.token, body: { name: `已更新商品 ${runId}`, price: 99 }
    });
    assert.equal(updatedProduct.name, `已更新商品 ${runId}`);
    await expectStatus('DELETE', `/api/products/${disposableProduct.id}`, 200, { token: seller.token });
    await expectStatus('GET', `/api/products/${disposableProduct.id}`, 404);

    const disposableSecondhand = await expectStatus('POST', '/api/secondhand', 201, {
      token: seller.token,
      body: { name: `待删除二手商品 ${runId}`, description: '公开路由回归', price: 12, stock: 1,
        category: 'books', condition: 3, bargainEnabled: true }
    });
    const secondhandSearch = await expectStatus('GET', `/api/secondhand/search?keyword=${encodeURIComponent(`待删除二手商品 ${runId}`)}`, 200);
    assert.ok(secondhandSearch.products.some(item => Number(item.id) === Number(disposableSecondhand.id)));
    await expectStatus('DELETE', `/api/secondhand/${disposableSecondhand.id}`, 200, { token: seller.token });
    await expectStatus('GET', `/api/secondhand/${disposableSecondhand.id}`, 404);
  });

  await t.test('INT-PUBLIC-02 订单列表、详情与兼容状态更新路由逐项回归', async () => {
    const orders = await expectStatus('GET', '/api/orders', 200, { token: buyer.token });
    assert.ok(orders.orders.some(item => Number(item.id) === Number(completedOrder.id)));
    const detail = await expectStatus('GET', `/api/orders/${completedOrder.id}`, 200, { token: buyer.token });
    assert.equal(Number(detail.id), Number(completedOrder.id));

    const compatibleProduct = await createProduct(seller, { name: `兼容更新订单商品 ${runId}`, stock: 1 });
    const compatibleOrder = await createOrder(buyer, compatibleProduct);
    await expectStatus('POST', `/api/orders/${compatibleOrder.id}/pay`, 200, { token: buyer.token });
    const shipped = await expectStatus('PUT', `/api/orders/${compatibleOrder.id}`, 200, {
      token: seller.token,
      body: { status: '待收货', logisticsInfo: { company: '顺丰速运', trackingNumber: `PUT${runId}` } }
    });
    assert.equal(shipped.status, '待收货');
    const confirmed = await expectStatus('PUT', `/api/orders/${compatibleOrder.id}`, 200, {
      token: buyer.token, body: { status: '已完成' }
    });
    assert.equal(confirmed.status, '已完成');
  });

  await t.test('INT-PUBLIC-03 会话列表、评价审核权限、成功上传与健康检查', async () => {
    const buyerConversations = await expectStatus('GET', '/api/chats/conversations?role=buyer', 200, { token: buyer.token });
    const sellerConversations = await expectStatus('GET', '/api/chats/conversations?role=seller', 200, { token: seller.token });
    assert.ok(buyerConversations.conversations.some(item => Number(item.id) === Number(conversation.id)));
    assert.ok(sellerConversations.conversations.some(item => Number(item.id) === Number(conversation.id)));
    await expectStatus('PUT', `/api/evaluations/${evaluation.id}/approve`, 403, { token: seller.token });

    const validUpload = new FormData();
    validUpload.append('images', new Blob(['png-test'], { type: 'image/png' }), 'test.png');
    const uploaded = await expectStatus('POST', '/api/uploads/images', 201, { token: buyer.token, body: validUpload });
    assert.equal(uploaded.urls.length, 1);
    assert.match(uploaded.urls[0], /^\/uploads\//);
    const uploadedAsset = await request('GET', uploaded.urls[0]);
    assert.equal(uploadedAsset.response.status, 200);
    assert.match(uploadedAsset.response.headers.get('content-type') || '', /^image\/png/);

    const healthPath = process.env.HEALTH_PATH || (BASE_URL.includes(':8081') ? '/health' : '/api/health');
    const health = await expectStatus('GET', healthPath, 200);
    assert.equal(health.status, 'ok');
    assert.equal(health.readiness, 'ready');

    const operationsPrefix = BASE_URL.includes(':8081') ? '' : '/api';
    const live = await expectStatus('GET', `${operationsPrefix}/live`, 200);
    const ready = await expectStatus('GET', `${operationsPrefix}/ready`, 200);
    const version = await expectStatus('GET', `${operationsPrefix}/version`, 200);
    assert.equal(live.status, 'alive');
    assert.equal(ready.status, 'ready');
    assert.equal(ready.database, 'ok');
    assert.ok(version.service);
    assert.ok(version.version);
    assert.ok(version.revision);
  });

  await t.test('INT-SEC-01 上传接口拒绝非图片文件', async () => {
    const invalidUpload = new FormData();
    invalidUpload.append('images', new Blob(['bad'], { type: 'text/javascript' }), 'bad.js');
    await expectStatus('POST', '/api/uploads/images', 400, { token: buyer.token, body: invalidUpload });
  });
});
