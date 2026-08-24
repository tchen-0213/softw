const test = require('node:test');
const assert = require('node:assert/strict');

const shouldRun = process.env.RUN_API_E2E === '1';
const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001';

const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

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
  const data = text ? JSON.parse(text) : null;

  return { response, data };
};

const expectStatus = async (method, path, expected, options) => {
  const result = await request(method, path, options);
  assert.equal(
    result.response.status,
    expected,
    `${method} ${path} expected ${expected}, got ${result.response.status}: ${JSON.stringify(result.data)}`
  );
  return result.data;
};

const registerUser = async (kind) => {
  const payload = {
    username: `api_${kind}_${unique}`,
    email: `api_${kind}_${unique}@example.com`,
    phone: `139${String(unique).slice(-8).padStart(8, '0')}`,
    password: 'Pass123456'
  };

  const registered = await expectStatus('POST', '/api/users/register', 201, { body: payload });
  assert.ok(registered.token);

  const loggedIn = await expectStatus('POST', '/api/users/login', 200, {
    body: {
      email: payload.email,
      password: payload.password
    }
  });
  assert.ok(loggedIn.token);

  return {
    ...payload,
    id: loggedIn._id,
    token: loggedIn.token
  };
};

test('full REST API business flow covers auth, products, orders, evaluations, addresses, chat and upload validation', { skip: !shouldRun }, async () => {
  const seller = await registerUser('seller');
  const buyer = await registerUser('buyer');

  const profile = await expectStatus('GET', '/api/users/profile', 200, { token: buyer.token });
  assert.equal(profile.email, buyer.email);

  const updatedProfile = await expectStatus('PUT', '/api/users/profile', 200, {
    token: buyer.token,
    body: {
      nickname: `买家${unique}`,
      phone: buyer.phone
    }
  });
  assert.equal(updatedProfile.nickname, `买家${unique}`);

  const addresses = await expectStatus('PUT', '/api/addresses', 200, {
    token: buyer.token,
    body: {
      addresses: [
        {
          id: `addr-${unique}`,
          name: '测试买家',
          phone: '13800138000',
          address: '软件工程测试路 1 号',
          isDefault: true
        }
      ]
    }
  });
  assert.equal(addresses.length, 1);

  const shop = await expectStatus('POST', '/api/shops/mine/verification', 200, {
    token: seller.token,
    body: {
      legalName: '测试卖家',
      idNumber: `ID${unique}`,
      verificationAddress: '软件工程测试路 2 号',
      businessLicenseImage: '/uploads/license.png',
      idCardImage: '/uploads/id-card.png'
    }
  });
  assert.equal(shop.verificationStatus, '已认证');

  const product = await expectStatus('POST', '/api/products', 201, {
    token: seller.token,
    body: {
      name: `API 链路测试商品 ${unique}`,
      description: '用于自动化 API 链路测试的普通商品',
      images: ['/uploads/api-product.png'],
      price: 88.8,
      stock: 2,
      category: 'books',
      brand: '测试品牌',
      bargainEnabled: true
    }
  });
  assert.equal(product.status, '在售');

  const secondhand = await expectStatus('POST', '/api/secondhand', 201, {
    token: seller.token,
    body: {
      name: `API 二手测试商品 ${unique}`,
      description: '用于自动化 API 链路测试的二手商品',
      images: ['/uploads/api-secondhand.png'],
      price: 45,
      stock: 1,
      category: 'books',
      condition: 2,
      usageTime: '1 年',
      location: '校内',
      bargainEnabled: true
    }
  });
  assert.equal(Boolean(secondhand.isSecondhand), true);

  const productList = await expectStatus('GET', `/api/products?keyword=${encodeURIComponent(unique)}&includeUnavailable=true`, 200);
  assert.ok(productList.products.some(item => Number(item.id) === Number(product.id)));

  const secondhandList = await expectStatus('GET', `/api/secondhand?keyword=${encodeURIComponent(unique)}&includeUnavailable=true`, 200);
  assert.ok(secondhandList.products.some(item => Number(item.id) === Number(secondhand.id)));

  const detail = await expectStatus('GET', `/api/products/${product.id}`, 200);
  assert.equal(detail.name, product.name);

  const conversation = await expectStatus('POST', '/api/chats/conversations', 201, {
    token: buyer.token,
    body: { productId: product.id }
  });
  assert.equal(Number(conversation.productId), Number(product.id));

  const textMessage = await expectStatus('POST', `/api/chats/conversations/${conversation.id}/messages`, 201, {
    token: buyer.token,
    body: {
      type: 'text',
      content: '这件商品还在吗？'
    }
  });
  assert.equal(textMessage.type, 'text');

  const bargainMessage = await expectStatus('POST', `/api/chats/conversations/${conversation.id}/messages`, 201, {
    token: buyer.token,
    body: {
      type: 'bargain',
      amount: 80
    }
  });
  assert.equal(bargainMessage.requestStatus, 'pending');

  const decision = await expectStatus('PUT', `/api/chats/messages/${bargainMessage.id}/decision`, 200, {
    token: seller.token,
    body: { status: 'accepted' }
  });
  assert.equal(decision.request.requestStatus, 'accepted');

  const messages = await expectStatus('GET', `/api/chats/conversations/${conversation.id}`, 200, {
    token: buyer.token
  });
  assert.ok(messages.messages.length >= 3);

  const order = await expectStatus('POST', '/api/orders', 201, {
    token: buyer.token,
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: addresses[0],
      paymentMethod: 'wechat'
    }
  });
  assert.equal(order.status, '待付款');

  const paidOrder = await expectStatus('POST', `/api/orders/${order.id}/pay`, 200, { token: buyer.token });
  assert.equal(paidOrder.status, '待发货');

  const shippedOrder = await expectStatus('POST', `/api/orders/${order.id}/ship`, 200, {
    token: seller.token,
    body: {
      company: '顺丰速运',
      trackingNumber: `SF${unique}`
    }
  });
  assert.equal(shippedOrder.status, '待收货');

  const finishedOrder = await expectStatus('POST', `/api/orders/${order.id}/confirm`, 200, {
    token: buyer.token
  });
  assert.equal(finishedOrder.status, '已完成');

  const evaluation = await expectStatus('POST', '/api/evaluations', 201, {
    token: buyer.token,
    body: {
      orderId: order.id,
      productId: product.id,
      rating: 5,
      content: '自动化测试评价内容',
      images: []
    }
  });
  assert.equal(Number(evaluation.rating), 5);

  const repliedEvaluation = await expectStatus('PUT', `/api/evaluations/${evaluation.id}/reply`, 200, {
    token: seller.token,
    body: { reply: '感谢支持，自动化测试回复。' }
  });
  assert.equal(repliedEvaluation.reply, '感谢支持，自动化测试回复。');

  const sellerOrders = await expectStatus('GET', '/api/orders/seller', 200, { token: seller.token });
  assert.ok(sellerOrders.orders.some(item => Number(item.id) === Number(order.id)));

  const invalidUpload = new FormData();
  invalidUpload.append('images', new Blob(['console.log("bad")'], { type: 'text/javascript' }), 'bad.js');
  const uploadResult = await request('POST', '/api/uploads/images', {
    token: buyer.token,
    body: invalidUpload
  });
  assert.equal(uploadResult.response.status, 400);
  assert.match(uploadResult.data.message, /只支持上传/);
});
