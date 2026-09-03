import { expect, test } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const TEST_IMAGE = '../backend/uploads/1780540436586-391031648.png';
const E2E_BASE_PATH = new URL(process.env.E2E_BASE_URL || 'http://localhost:8080').pathname
  .replace(/\/?$/, '/');
const appPath = path => `${E2E_BASE_PATH}${path.replace(/^\//, '')}`;

const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function apiRequest(method, path, { token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${method} ${path} failed ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function registerViaApi(kind, id) {
  const payload = {
    username: `e2e_${kind}_${id}`,
    email: `e2e_${kind}_${id}@example.com`,
    phone: `137${String(id).slice(-8).padStart(8, '0')}`,
    password: 'Pass123456'
  };

  await apiRequest('POST', '/api/users/register', { body: payload });
  const user = await apiRequest('POST', '/api/users/login', {
    body: {
      email: payload.email,
      password: payload.password
    }
  });

  return { ...payload, id: user._id, token: user.token };
}

async function signIn(page, user) {
  await page.addInitScript(({ token, userData }) => {
    window.localStorage.setItem('token', token);
    window.localStorage.setItem('user', JSON.stringify(userData));
  }, {
    token: user.token,
    userData: {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      creditLevel: user.creditLevel,
      creditScore: user.creditScore,
      role: user.role
    }
  });
}

async function verifySellerShop(seller, id) {
  await apiRequest('POST', '/api/shops/mine/verification', {
    token: seller.token,
    body: {
      legalName: 'E2E 卖家',
      idNumber: `E2E${id}`,
      verificationAddress: 'E2E 测试路 2 号',
      businessLicenseImage: '/uploads/e2e-license.png',
      idCardImage: '/uploads/e2e-id-card.png'
    }
  });
}

async function createListedProduct(id) {
  const seller = await registerViaApi('seller', id);
  await verifySellerShop(seller, id);

  const product = await apiRequest('POST', '/api/products', {
    token: seller.token,
    body: {
      name: `E2E 自动化商品 ${id}`,
      description: '用于浏览器端到端测试的商品',
      images: ['/images/moyu-logo.png'],
      price: 66,
      stock: 3,
      category: 'books',
      brand: 'E2E',
      bargainEnabled: true
    }
  });

  return { seller, product };
}

async function createCompletedOrder(id) {
  const { seller, product } = await createListedProduct(id);
  const buyer = await registerViaApi('buyer', id);
  const order = await apiRequest('POST', '/api/orders', {
    token: buyer.token,
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: {
        id: `addr-${id}`,
        name: 'E2E 买家',
        phone: '13600136000',
        address: 'E2E 测试路 1 号',
        isDefault: true
      },
      paymentMethod: 'wechat'
    }
  });

  await apiRequest('POST', `/api/orders/${order.id}/pay`, { token: buyer.token });
  await apiRequest('POST', `/api/orders/${order.id}/ship`, {
    token: seller.token,
    body: { company: '顺丰速运', trackingNumber: `SF${id}` }
  });
  const finishedOrder = await apiRequest('POST', `/api/orders/${order.id}/confirm`, {
    token: buyer.token
  });

  return { seller, buyer, product, order: finishedOrder };
}

test('E2E-TC01: 用户注册并登录平台', async ({ page }) => {
  const id = unique();
  await page.goto(appPath('/register'));
  await page.locator('input[name="username"]').fill(`e2e_buyer_${id}`);
  await page.locator('input[name="phone"]').fill(`136${String(id).slice(-8).padStart(8, '0')}`);
  await page.locator('input[name="email"]').fill(`e2e_buyer_${id}@example.com`);
  await page.locator('input[name="password"]').fill('Pass123456');
  await page.getByRole('button', { name: '注册并登录' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(`e2e_buyer_${id}`)).toBeVisible();
});

test('E2E-TC02: 用户浏览并搜索商品', async ({ page }) => {
  const id = unique();
  const { product } = await createListedProduct(id);

  await page.goto(appPath(`/search?keyword=${encodeURIComponent(product.name)}`));
  const productCard = page.locator('.product-card').filter({ hasText: product.name });
  await expect(productCard).toBeVisible();
  await expect(productCard.getByText('¥66.00')).toBeVisible();
});

test('E2E-TC03: 用户查看商品详情并加入购物车', async ({ page }) => {
  const id = unique();
  const { product } = await createListedProduct(id);
  const buyer = await registerViaApi('buyer', id);
  await signIn(page, buyer);

  await page.goto(appPath(`/product/${product.id}`));
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: '加入购物车' }).click();
  await page.goto(appPath('/cart'));
  await expect(page.getByText(product.name)).toBeVisible();
});

test('E2E-TC04: 用户创建订单并进入订单列表', async ({ page }) => {
  const id = unique();
  const { product } = await createListedProduct(id);
  const buyer = await registerViaApi('buyer', id);
  await apiRequest('PUT', '/api/addresses', {
    token: buyer.token,
    body: {
      addresses: [{
        id: `checkout-address-${id}`,
        name: 'E2E 买家',
        phone: '13600136000',
        address: 'E2E 测试路 1 号',
        isDefault: true
      }]
    }
  });
  await signIn(page, buyer);

  await page.goto(appPath(`/product/${product.id}`));
  await page.getByRole('button', { name: '加入购物车' }).click();
  await page.goto(appPath('/cart'));
  await page.getByRole('button', { name: '去结算' }).click();
  await expect(page.getByRole('heading', { name: '结算' })).toBeVisible();
  await expect(page.getByText('E2E 测试路 1 号')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '提交订单' }).click();

  await expect(page).toHaveURL(/\/order$/);
  await expect(page.getByText(product.name)).toBeVisible();
});

test('E2E-TC05: 用户发布二手商品', async ({ page }) => {
  const id = unique();
  const seller = await registerViaApi('seller', id);
  await verifySellerShop(seller, id);
  await signIn(page, seller);

  const secondhandName = `E2E 页面二手商品 ${id}`;
  await page.goto(appPath('/sell'));
  await expect(page.getByRole('heading', { name: '发布商品' })).toBeVisible();
  await page.locator('input[name="name"]').fill(secondhandName);
  await page.locator('input[name="price"]').fill('45');
  await page.locator('input[name="stock"]').fill('1');
  await page.locator('textarea[name="description"]').fill('用于 Playwright 二手发布专项测试');
  await page.locator('select[name="category"]').selectOption('books');
  await page.locator('input[name="location"]').fill('校内自提点');
  await page.locator('select[name="condition"]').selectOption('2');
  await page.locator('input[name="usageTime"]').fill('3 个月');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '发布商品' }).click();

  await expect(page).toHaveURL(/\/product\/\d+$/);
  await expect(page.getByRole('heading', { name: secondhandName, exact: true })).toBeVisible();
  await expect(page.getByText('二手商品信息')).toBeVisible();
});

test('E2E-TC06: 卖家认证并维护店铺信息', async ({ page }) => {
  const id = unique();
  const seller = await registerViaApi('seller', id);
  await signIn(page, seller);

  await page.goto(appPath('/shop'));
  await expect(page.getByRole('heading', { name: '店铺验证' })).toBeVisible();
  await page.locator('input[name="legalName"]').fill('E2E 页面卖家');
  await page.locator('input[name="idNumber"]').fill(`PAGE${id}`);
  await page.locator('textarea[name="verificationAddress"]').fill('E2E 页面测试路 2 号');
  await page.locator('input[type="file"]').nth(0).setInputFiles(TEST_IMAGE);
  await expect(page.getByAltText('营业执照预览')).toBeVisible();
  await page.locator('input[type="file"]').nth(1).setInputFiles(TEST_IMAGE);
  await expect(page.getByAltText('身份证预览')).toBeVisible();
  await page.getByRole('button', { name: '提交验证并开启店铺' }).click();

  await expect(page.getByRole('button', { name: '编辑店铺信息' })).toBeVisible();
  await page.getByRole('button', { name: '编辑店铺信息' }).click();
  await page.locator('input[name="name"]').fill(`E2E 页面店铺 ${id}`);
  await page.locator('textarea[name="description"]').fill('用于 Playwright 店铺管理专项测试');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText(`E2E 页面店铺 ${id}`)).toBeVisible();
  await expect(page.getByText('用于 Playwright 店铺管理专项测试')).toBeVisible();
});

test('E2E-TC07: 买家从已完成订单页面提交评价', async ({ page }) => {
  const id = unique();
  const { buyer, product, order } = await createCompletedOrder(id);
  await signIn(page, buyer);

  await page.goto(appPath(`/evaluation/${order.id}`));
  await expect(page.getByRole('heading', { name: '评价订单' })).toBeVisible();
  await expect(page.getByText(product.name)).toBeVisible();
  await page.locator('textarea').first().fill(`E2E 页面评价 ${id}`);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '提交评价' }).click();

  await expect(page).toHaveURL(/\/order$/);
  await expect(page.getByText(product.name)).toBeVisible();
});

test('E2E-TC08: 买家页面议价且卖家页面接受申请', async ({ browser }) => {
  const id = unique();
  const { seller, product } = await createListedProduct(id);
  const buyer = await registerViaApi('buyer', id);
  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await signIn(buyerPage, buyer);
  await buyerPage.goto(appPath(`/product/${product.id}`));
  await expect(buyerPage.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  await buyerPage.getByRole('button', { name: '私聊商家' }).click();
  await expect(buyerPage).toHaveURL(/\/chat\/\d+$/);
  const chatUrl = buyerPage.url();

  await buyerPage.locator('textarea[placeholder="输入聊天内容"]').fill(`这个还在吗 ${id}`);
  await buyerPage.getByRole('button', { name: '发送', exact: true }).click();
  await expect(buyerPage.getByText(`这个还在吗 ${id}`)).toBeVisible();
  await buyerPage.locator('input[placeholder="输入想要的金额"]').fill('55');
  await buyerPage.locator('input[placeholder="补充说明（可选）"]').fill('页面专项议价');
  await buyerPage.getByRole('button', { name: '发送议价申请' }).click();
  await expect(buyerPage.getByText('待商家处理')).toBeVisible();

  const sellerContext = await browser.newContext();
  const sellerPage = await sellerContext.newPage();
  await signIn(sellerPage, seller);
  await sellerPage.goto(chatUrl);
  await expect(sellerPage.getByText(`这个还在吗 ${id}`)).toBeVisible();
  await expect(sellerPage.getByText('待商家处理')).toBeVisible();
  await sellerPage.getByRole('button', { name: '同意' }).click();
  await expect(sellerPage.locator('.chat-request-status.status-accepted')).toHaveText('已同意');

  await apiRequest('PUT', '/api/addresses', {
    token: buyer.token,
    body: {
      addresses: [{
        id: `bargain-address-${id}`,
        name: '议价买家',
        phone: '13800138000',
        address: '议价测试路 1 号',
        isDefault: true
      }]
    }
  });
  await buyerPage.reload();
  await buyerPage.getByRole('button', { name: '以议价 ¥55.00 购买' }).click();
  await expect(buyerPage).toHaveURL(/\/checkout$/);
  await expect(buyerPage.getByText('¥55.00', { exact: true }).first()).toBeVisible();
  await expect(buyerPage.getByText('议价成交价')).toBeVisible();
  await expect(buyerPage.getByText('议价买家')).toBeVisible();
  buyerPage.once('dialog', dialog => dialog.accept());
  await buyerPage.getByRole('button', { name: '提交订单' }).click();
  await expect(buyerPage).toHaveURL(/\/order$/);
  await expect(buyerPage.getByText(product.name)).toBeVisible();

  await buyerContext.close();
  await sellerContext.close();
});

test('E2E-TC09: 用户新增、编辑并删除收货地址', async ({ page }) => {
  const id = unique();
  const buyer = await registerViaApi('address_buyer', id);
  await signIn(page, buyer);

  await page.goto(appPath('/user'));
  await page.getByRole('button', { name: '收货地址', exact: true }).click();
  await page.getByRole('button', { name: '新增地址' }).click();
  await page.locator('input[name="name"]').fill('地址测试买家');
  await page.locator('input[name="phone"]').fill('13600136000');
  await page.locator('textarea[name="address"]').fill('地址测试路 1 号');
  await page.getByRole('button', { name: '保存地址' }).click();
  await expect(page.getByText('地址测试路 1 号')).toBeVisible();

  await page.getByRole('button', { name: '编辑' }).click();
  await page.locator('textarea[name="address"]').fill('地址测试路 2 号');
  await page.getByRole('button', { name: '保存地址' }).click();
  await expect(page.getByText('地址测试路 2 号')).toBeVisible();

  await page.getByRole('button', { name: '删除' }).click();
  await expect(page.getByText('暂无收货地址，请新增后再结算。')).toBeVisible();
});

test('E2E-TC10: 用户查询本人订单与物流', async ({ page }) => {
  const id = unique();
  const { seller, product } = await createListedProduct(id);
  const buyer = await registerViaApi('logistics_buyer', id);
  const order = await apiRequest('POST', '/api/orders', {
    token: buyer.token,
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: { name: '物流买家', phone: '13800138001', address: '物流测试路 2 号' },
      paymentMethod: 'wechat'
    }
  });
  await apiRequest('POST', `/api/orders/${order.id}/pay`, { token: buyer.token });
  await apiRequest('POST', `/api/orders/${order.id}/ship`, {
    token: seller.token,
    body: { company: '顺丰速运', trackingNumber: `SF${id}` }
  });
  await signIn(page, buyer);

  await page.goto(appPath('/order'));
  const orderCard = page.locator('.order-card').filter({ hasText: product.name });
  await expect(orderCard.getByText('待收货')).toBeVisible();
  await expect(orderCard.getByText(new RegExp(`顺丰速运 SF${id}`))).toBeVisible();
});

test('E2E-TC11: 用户取消订单并恢复库存', async ({ page }) => {
  const id = unique();
  const { product } = await createListedProduct(id);
  const buyer = await registerViaApi('cancel_buyer', id);
  const order = await apiRequest('POST', '/api/orders', {
    token: buyer.token,
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: { name: '订单买家', phone: '13800138000', address: '订单测试路 1 号' },
      paymentMethod: 'wechat'
    }
  });
  await signIn(page, buyer);

  await page.goto(appPath('/order'));
  const orderCard = page.locator('.order-card').filter({ hasText: product.name });
  await expect(orderCard.getByText('待付款')).toBeVisible();
  await orderCard.getByRole('button', { name: '取消订单' }).click();
  await expect(orderCard.getByText('已取消')).toBeVisible();

  const restored = await apiRequest('GET', `/api/products/${product.id}`);
  expect(restored.stock).toBe(3);
  const cancelled = await apiRequest('GET', `/api/orders/${order.id}`, { token: buyer.token });
  expect(cancelled.status).toBe('已取消');
});

test('E2E-TC12: 游客查看公开店铺、卖家信用和在售商品', async ({ page }) => {
  const id = unique();
  const { seller, product } = await createListedProduct(id);
  const shop = await apiRequest('GET', `/api/shops/user/${seller.id}`);

  await page.goto(appPath(`/shop/user/${seller.id}`));
  await expect(page.getByRole('heading', { name: shop.name })).toBeVisible();
  await expect(page.getByText(product.name)).toBeVisible();
  await expect(page.getByText(/在售商品 1 件/)).toBeVisible();
  await expect(page.locator('.credit-badge').first()).toBeVisible();
});

test('E2E-TC01/02/03/04/09: 组合流程：注册、检索、加购、维护地址并提交订单', async ({ page }) => {
  const id = unique();
  const { product } = await createListedProduct(id);

  await page.goto(appPath('/register'));
  await page.locator('input[name="username"]').fill(`e2e_buyer_${id}`);
  await page.locator('input[name="phone"]').fill(`136${String(id).slice(-8).padStart(8, '0')}`);
  await page.locator('input[name="email"]').fill(`e2e_buyer_${id}@example.com`);
  await page.locator('input[name="password"]').fill('Pass123456');
  await page.getByRole('button', { name: '注册并登录' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto(appPath(`/search?keyword=${encodeURIComponent(product.name)}`));
  const productCard = page.locator('.product-card').filter({ hasText: product.name });
  await expect(productCard).toBeVisible();
  await productCard.click();
  await expect(page).toHaveURL(new RegExp(`/product/${product.id}$`));
  await page.getByRole('button', { name: '加入购物车' }).click();

  await page.goto(appPath('/cart'));
  await expect(page.getByText(product.name)).toBeVisible();
  await page.getByRole('button', { name: '去结算' }).click();
  await page.getByRole('button', { name: '新增地址' }).click();
  await page.locator('input[name="name"]').fill('E2E 组合流程买家');
  await page.locator('input[name="phone"]').fill('13600136000');
  await page.locator('textarea[name="address"]').fill('E2E 组合测试路 1 号');
  await page.getByRole('button', { name: '保存地址' }).click();

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '提交订单' }).click();
  await expect(page).toHaveURL(/\/order$/);
  await expect(page.getByText(product.name)).toBeVisible();
});

test('E2E-TC05/06: 组合流程：卖家认证、维护店铺并发布二手商品', async ({ page }) => {
  const id = unique();
  const seller = await registerViaApi('seller', id);
  await signIn(page, seller);

  await page.goto(appPath('/shop'));
  await page.locator('input[name="legalName"]').fill('E2E 组合流程卖家');
  await page.locator('input[name="idNumber"]').fill(`GROUP${id}`);
  await page.locator('textarea[name="verificationAddress"]').fill('E2E 组合测试路 2 号');
  await page.locator('input[type="file"]').nth(0).setInputFiles(TEST_IMAGE);
  await page.locator('input[type="file"]').nth(1).setInputFiles(TEST_IMAGE);
  await page.getByRole('button', { name: '提交验证并开启店铺' }).click();

  await page.getByRole('button', { name: '编辑店铺信息' }).click();
  await page.locator('input[name="name"]').fill(`E2E 组合店铺 ${id}`);
  await page.locator('textarea[name="description"]').fill('用于 Playwright 组合流程测试');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText(`E2E 组合店铺 ${id}`)).toBeVisible();

  const secondhandName = `E2E 组合二手商品 ${id}`;
  await page.goto(appPath('/sell'));
  await page.locator('input[name="name"]').fill(secondhandName);
  await page.locator('input[name="price"]').fill('45');
  await page.locator('input[name="stock"]').fill('1');
  await page.locator('textarea[name="description"]').fill('用于 Playwright 组合流程测试');
  await page.locator('select[name="category"]').selectOption('books');
  await page.locator('input[name="location"]').fill('校内自提点');
  await page.locator('select[name="condition"]').selectOption('2');
  await page.locator('input[name="usageTime"]').fill('3 个月');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '发布商品' }).click();

  await expect(page).toHaveURL(/\/product\/\d+$/);
  await expect(page.getByRole('heading', { name: secondhandName, exact: true })).toBeVisible();
});

test('E2E-TC10/11: 组合流程：查询订单物流并取消待付款订单恢复库存', async ({ page }) => {
  const id = unique();
  const { seller, product: cancellableProduct } = await createListedProduct(id);
  const buyer = await registerViaApi('order_buyer', id);
  const cancellableOrder = await apiRequest('POST', '/api/orders', {
    token: buyer.token,
    body: {
      items: [{ productId: cancellableProduct.id, quantity: 1 }],
      shippingAddress: { name: '订单买家', phone: '13800138000', address: '订单测试路 1 号' },
      paymentMethod: 'wechat'
    }
  });

  const logisticsProduct = await apiRequest('POST', '/api/products', {
    token: seller.token,
    body: {
      name: `E2E 物流商品 ${id}`,
      description: '用于订单与物流查询组合测试',
      images: ['/images/moyu-logo.png'],
      price: 77,
      stock: 2,
      category: 'books'
    }
  });
  const logisticsOrder = await apiRequest('POST', '/api/orders', {
    token: buyer.token,
    body: {
      items: [{ productId: logisticsProduct.id, quantity: 1 }],
      shippingAddress: { name: '物流买家', phone: '13800138001', address: '物流测试路 2 号' },
      paymentMethod: 'wechat'
    }
  });
  await apiRequest('POST', `/api/orders/${logisticsOrder.id}/pay`, { token: buyer.token });
  await apiRequest('POST', `/api/orders/${logisticsOrder.id}/ship`, {
    token: seller.token,
    body: { company: '顺丰速运', trackingNumber: `SF${id}` }
  });

  await signIn(page, buyer);
  await page.goto(appPath('/order'));
  const logisticsCard = page.locator('.order-card').filter({ hasText: logisticsProduct.name });
  await expect(logisticsCard.getByText('待收货')).toBeVisible();
  await expect(logisticsCard.getByText(new RegExp(`顺丰速运 SF${id}`))).toBeVisible();

  const cancellableCard = page.locator('.order-card').filter({ hasText: cancellableProduct.name });
  await expect(cancellableCard.getByText('待付款')).toBeVisible();
  await cancellableCard.getByRole('button', { name: '取消订单' }).click();
  await expect(cancellableCard.getByText('已取消')).toBeVisible();

  const restored = await apiRequest('GET', `/api/products/${cancellableProduct.id}`);
  expect(restored.stock).toBe(3);
  const cancelled = await apiRequest('GET', `/api/orders/${cancellableOrder.id}`, { token: buyer.token });
  expect(cancelled.status).toBe('已取消');
});
