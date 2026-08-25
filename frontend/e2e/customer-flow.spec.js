import { expect, test } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const TEST_IMAGE = '../backend/uploads/1780540436586-391031648.png';

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
  const shippingAddress = {
    id: `addr-${id}`,
    name: 'E2E 买家',
    phone: '13600136000',
    address: 'E2E 测试路 1 号',
    isDefault: true
  };

  const order = await apiRequest('POST', '/api/orders', {
    token: buyer.token,
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress,
      paymentMethod: 'wechat'
    }
  });

  await apiRequest('POST', `/api/orders/${order.id}/pay`, { token: buyer.token });
  await apiRequest('POST', `/api/orders/${order.id}/ship`, {
    token: seller.token,
    body: {
      company: '顺丰速运',
      trackingNumber: `SF${id}`
    }
  });
  const finishedOrder = await apiRequest('POST', `/api/orders/${order.id}/confirm`, { token: buyer.token });

  return { seller, buyer, product, order: finishedOrder };
}

test('E2E-TC01/02/03/04/09: 买家注册、检索、加购、维护地址并提交订单', async ({ page }) => {
  const id = unique();
  const { product } = await createListedProduct(id);

  await page.goto('/register');
  await page.locator('input[name="username"]').fill(`e2e_buyer_${id}`);
  await page.locator('input[name="phone"]').fill(`136${String(id).slice(-8).padStart(8, '0')}`);
  await page.locator('input[name="email"]').fill(`e2e_buyer_${id}@example.com`);
  await page.locator('input[name="password"]').fill('Pass123456');
  await page.getByRole('button', { name: '注册并登录' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(`e2e_buyer_${id}`)).toBeVisible();

  await page.goto(`/search?keyword=${encodeURIComponent(product.name)}`);
  const productCard = page.locator('.product-card').filter({ hasText: product.name });
  await expect(productCard).toBeVisible();
  await productCard.click();

  await expect(page).toHaveURL(new RegExp(`/product/${product.id}$`));
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: '加入购物车' }).click();

  await page.goto('/cart');
  await expect(page.getByText(product.name)).toBeVisible();
  await page.getByRole('button', { name: '去结算' }).click();

  await expect(page.getByRole('heading', { name: '结算' })).toBeVisible();
  await page.getByRole('button', { name: '新增地址' }).click();
  await page.locator('input[name="name"]').fill('E2E 买家');
  await page.locator('input[name="phone"]').fill('13600136000');
  await page.locator('textarea[name="address"]').fill('E2E 测试路 1 号');
  await page.getByRole('button', { name: '保存地址' }).click();

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '提交订单' }).click();
  await expect(page).toHaveURL(/\/order/);
  await expect(page.getByText(product.name)).toBeVisible();
});

test('E2E-TC05/06: 卖家认证维护店铺并发布二手商品', async ({ page }) => {
  const id = unique();
  const seller = await registerViaApi('seller', id);
  await signIn(page, seller);

  await page.goto('/shop');
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

  const secondhandName = `E2E 页面二手商品 ${id}`;
  await page.goto('/sell');
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

test('E2E-TC07: 买家从已完成订单页面提交评价', async ({ page }) => {
  const id = unique();
  const { buyer, product, order } = await createCompletedOrder(id);
  await signIn(page, buyer);

  await page.goto(`/evaluation/${order.id}`);
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
  await buyerPage.goto(`/product/${product.id}`);
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

  await buyerContext.close();
  await sellerContext.close();
});
