import { expect, test } from '@playwright/test';
import {
  apiRequest,
  appPath,
  createCompletedOrder,
  createListedProduct,
  createPendingOrder,
  expectApiStatus,
  registerViaApi,
  signIn,
  unique,
  verifySellerShop
} from './e2e-helpers.js';

async function createShippedOrder(id) {
  const context = await createPendingOrder(id);
  await apiRequest('POST', `/api/orders/${context.order.id}/pay`, { token: context.buyer.token });
  const order = await apiRequest('POST', `/api/orders/${context.order.id}/ship`, {
    token: context.seller.token,
    body: { company: '顺丰速运', trackingNumber: `SF${id}` }
  });
  return { ...context, order };
}

test('E2E-TC01-ALT01: 已注册用户可以从登录页登录', async ({ page }) => {
  const user = await registerViaApi('login_user', unique());
  await page.goto(appPath('/login'));
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(user.username)).toBeVisible();
});

test('E2E-TC01-ERR01: 登录页拒绝错误密码', async ({ page }) => {
  const user = await registerViaApi('wrong_password', unique());
  await page.goto(appPath('/login'));
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill('WrongPassword123');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByText('密码错误')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('E2E-TC01-ERR02: 注册页拒绝重复用户', async ({ page }) => {
  const user = await registerViaApi('duplicate_user', unique());
  await page.goto(appPath('/register'));
  await page.locator('input[name="username"]').fill(user.username);
  await page.locator('input[name="phone"]').fill(user.phone);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole('button', { name: '注册并登录' }).click();
  await expect(page.getByText('用户已存在')).toBeVisible();
});

test('E2E-TC02-ALT01: 搜索不存在的关键词显示空结果', async ({ page }) => {
  const keyword = `绝不存在商品-${unique()}`;
  await page.goto(appPath(`/search?keyword=${encodeURIComponent(keyword)}`));
  await expect(page.getByRole('heading', { name: `搜索结果: ${keyword}` })).toBeVisible();
  await expect(page.getByText('没有找到相关商品')).toBeVisible();
});

test('E2E-TC02-ALT02: 分类和价格条件可以联合筛选', async ({ page }) => {
  const id = unique();
  const name = `E2E 筛选商品 ${id}`;
  await createListedProduct(id, { name, price: 66, category: 'books' });
  await page.goto(appPath(`/search?keyword=${encodeURIComponent(name)}`));
  await page.locator('.filter-panel select').nth(0).selectOption('books');
  await page.locator('input[placeholder="最低"]').fill('60');
  await page.locator('input[placeholder="最高"]').fill('70');
  await page.getByRole('button', { name: '应用筛选' }).click();
  await expect(page.locator('.product-card').filter({ hasText: name })).toBeVisible();
  await expect(page).toHaveURL(/category=books/);
});

test('E2E-TC02-ALT03: 搜索结果支持价格升序排序', async ({ page }) => {
  const id = unique();
  const prefix = `E2E 排序商品 ${id}`;
  const { seller } = await createListedProduct(id, { name: `${prefix} 低价`, price: 10 });
  await apiRequest('POST', '/api/products', {
    token: seller.token,
    body: {
      name: `${prefix} 高价`, description: '排序测试', images: [], price: 90,
      stock: 2, category: 'books'
    }
  });
  await page.goto(appPath(`/search?keyword=${encodeURIComponent(prefix)}`));
  await page.getByText('价格从低到高', { exact: true }).click();
  const cards = page.locator('.product-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText(`${prefix} 低价`);
});

test('E2E-TC03-ERR01: 游客加入购物车时被登录门禁拦截', async ({ page }) => {
  const { product } = await createListedProduct(unique());
  await page.goto(appPath(`/product/${product.id}`));
  await page.getByRole('button', { name: '加入购物车' }).click();
  await expect(page.getByText('请先登录后再加入购物车')).toBeVisible();
});

test('E2E-TC03-ALT01: 购物车数量受库存上限约束且可删除商品', async ({ page }) => {
  const id = unique();
  const { product } = await createListedProduct(id, { stock: 3 });
  const buyer = await registerViaApi('cart_limit', id);
  await signIn(page, buyer);
  await page.goto(appPath(`/product/${product.id}`));
  await page.getByRole('button', { name: '加入购物车' }).click();
  await page.goto(appPath('/cart'));
  const quantity = page.locator('.qty-control');
  await quantity.getByRole('button', { name: '+' }).click();
  await quantity.getByRole('button', { name: '+' }).click();
  await expect(quantity.locator('input')).toHaveValue('3');
  await expect(quantity.getByRole('button', { name: '+' })).toBeDisabled();
  await quantity.getByRole('button', { name: '删除' }).click();
  await expect(page.getByText('购物车为空')).toBeVisible();
});

test('E2E-TC03-ALT02: 用户可以一键清空购物车', async ({ page }) => {
  const id = unique();
  const { product } = await createListedProduct(id);
  const buyer = await registerViaApi('clear_cart', id);
  await signIn(page, buyer);
  await page.goto(appPath(`/product/${product.id}`));
  await page.getByRole('button', { name: '加入购物车' }).click();
  await page.goto(appPath('/cart'));
  await page.getByRole('button', { name: '清空购物车' }).click();
  await expect(page.getByText('购物车为空')).toBeVisible();
});

test('E2E-TC04-ALT01: 买家可以支付待付款订单', async ({ page }) => {
  const context = await createPendingOrder(unique());
  await signIn(page, context.buyer);
  await page.goto(appPath('/order'));
  const card = page.locator('.order-card').filter({ hasText: context.product.name });
  await card.getByRole('button', { name: '立即支付' }).click();
  await expect(card.getByText('待发货')).toBeVisible();
});

test('E2E-TC04-ERR01: 空购物车不能进入结算', async ({ page }) => {
  const buyer = await registerViaApi('empty_checkout', unique());
  await signIn(page, buyer);
  await page.goto(appPath('/checkout'));
  await expect(page.getByText('购物车为空，无法结算')).toBeVisible();
});

test('E2E-TC04-ERR02: 未选择收货地址时不能提交订单', async ({ page }) => {
  const id = unique();
  const { product } = await createListedProduct(id);
  const buyer = await registerViaApi('no_address', id);
  await signIn(page, buyer);
  await page.goto(appPath(`/product/${product.id}`));
  await page.getByRole('button', { name: '加入购物车' }).click();
  await page.goto(appPath('/checkout'));
  await page.getByRole('button', { name: '提交订单' }).click();
  await expect(page.getByText('请先新增并选择收货地址')).toBeVisible();
});

test('E2E-TC05-ERR01: 未认证卖家不能发布商品', async ({ page }) => {
  const seller = await registerViaApi('unverified_seller', unique());
  await signIn(page, seller);
  await page.goto(appPath('/sell'));
  await expect(page.getByRole('heading', { name: '请先完成店铺验证' })).toBeVisible();
  await expect(page.getByRole('button', { name: '去验证店铺' })).toBeVisible();
});

test('E2E-TC06-ALT01: 卖家可以修改商品价格和状态', async ({ page }) => {
  const id = unique();
  const { seller, product } = await createListedProduct(id);
  await signIn(page, seller);
  await page.goto(appPath('/shop'));
  const row = page.locator('tr').filter({ hasText: product.name });
  await row.getByRole('button', { name: '编辑', exact: true }).click();
  await page.locator('input[name="price"]').fill('88');
  await page.locator('select[name="status"]').selectOption('下架');
  await page.getByRole('button', { name: '保存商品' }).click();
  await expect(row).toContainText('¥88.00');
  await expect(row).toContainText('下架');
});

test('E2E-TC06-ALT02: 卖家可以删除自己的商品', async ({ page }) => {
  const id = unique();
  const { seller, product } = await createListedProduct(id);
  await signIn(page, seller);
  await page.goto(appPath('/shop'));
  const row = page.locator('tr').filter({ hasText: product.name });
  page.once('dialog', dialog => dialog.accept());
  await row.getByRole('button', { name: '删除' }).click();
  await expect(page.getByText(product.name)).toHaveCount(0);
});

test('E2E-TC07-ERR01: 未完成订单不能评价', async () => {
  const context = await createPendingOrder(unique());
  const error = await expectApiStatus('POST', '/api/evaluations', 400, {
    token: context.buyer.token,
    body: { orderId: context.order.id, productId: context.product.id, rating: 5, content: '提前评价' }
  });
  expect(error.message).toBe('订单完成后才能评价');
});

test('E2E-TC07-ERR02: 同一商品不能重复评价', async () => {
  const context = await createCompletedOrder(unique());
  const body = {
    orderId: context.order.id, productId: context.product.id, rating: 5, content: '第一次评价'
  };
  await apiRequest('POST', '/api/evaluations', { token: context.buyer.token, body });
  const error = await expectApiStatus('POST', '/api/evaluations', 400, {
    token: context.buyer.token, body: { ...body, content: '重复评价' }
  });
  expect(error.message).toBe('已经评价过此商品');
});

test('E2E-TC08-ALT01: 卖家可以拒绝买家的议价申请', async ({ page }) => {
  const id = unique();
  const { seller, product } = await createListedProduct(id);
  const buyer = await registerViaApi('bargain_buyer', id);
  const conversation = await apiRequest('POST', '/api/chats/conversations', {
    token: buyer.token, body: { productId: product.id }
  });
  await apiRequest('POST', `/api/chats/conversations/${conversation.id}/messages`, {
    token: buyer.token, body: { type: 'bargain', amount: 50, content: '请求降价' }
  });
  await signIn(page, seller);
  await page.goto(appPath(`/chat/${conversation.id}`));
  await page.getByRole('button', { name: '拒绝' }).click();
  await expect(page.locator('.chat-request-status.status-rejected')).toHaveText('已拒绝');
});

test('E2E-TC08-ERR01: 卖家不能与自己的商品发起私聊', async ({ page }) => {
  const { seller, product } = await createListedProduct(unique());
  await signIn(page, seller);
  await page.goto(appPath(`/product/${product.id}`));
  await page.getByRole('button', { name: '私聊商家' }).click();
  await expect(page.getByText('这是你自己的商品，无需私聊自己')).toBeVisible();
});

test('E2E-TC09-ALT01: 多个地址可以切换默认地址', async ({ page }) => {
  const buyer = await registerViaApi('default_address', unique());
  await signIn(page, buyer);
  await page.goto(appPath('/user'));
  await page.getByRole('button', { name: '收货地址', exact: true }).click();
  for (const [name, address] of [['第一位收货人', '默认测试路 1 号'], ['第二位收货人', '默认测试路 2 号']]) {
    await page.getByRole('button', { name: '新增地址' }).click();
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="phone"]').fill('13600136000');
    await page.locator('textarea[name="address"]').fill(address);
    await page.getByRole('button', { name: '保存地址' }).click();
  }
  const second = page.locator('.address-item').filter({ hasText: '第二位收货人' });
  await second.getByRole('button', { name: '设为默认' }).click();
  await expect(second.getByText('默认', { exact: true })).toBeVisible();
});

test('E2E-TC09-ERR01: 地址接口拒绝错误数据格式', async () => {
  const buyer = await registerViaApi('invalid_address', unique());
  const error = await expectApiStatus('PUT', '/api/addresses', 400, {
    token: buyer.token, body: { malformed: true }
  });
  expect(error.message).toBe('地址数据格式错误');
});

test('E2E-TC10-ALT01: 个人中心物流页展示运输信息', async ({ page }) => {
  const id = unique();
  const context = await createShippedOrder(id);
  await signIn(page, context.buyer);
  await page.goto(appPath('/user'));
  await page.getByRole('button', { name: '物流跟踪', exact: true }).click();
  await expect(page.getByText(new RegExp(`顺丰速运.*SF${id}`))).toBeVisible();
});

test('E2E-TC10-ERR01: 其他用户不能查看订单详情', async () => {
  const context = await createPendingOrder(unique());
  const outsider = await registerViaApi('order_outsider', unique());
  const error = await expectApiStatus('GET', `/api/orders/${context.order.id}`, 403, {
    token: outsider.token
  });
  expect(error.message).toBe('无权查看此订单');
});

test('E2E-TC11-ERR01: 已发货订单不能由买家取消', async () => {
  const context = await createShippedOrder(unique());
  const error = await expectApiStatus('POST', `/api/orders/${context.order.id}/cancel`, 400, {
    token: context.buyer.token
  });
  expect(error.message).toBe('此订单状态无法取消');
});

test('E2E-TC11-ERR02: 其他用户不能取消订单', async () => {
  const context = await createPendingOrder(unique());
  const outsider = await registerViaApi('cancel_outsider', unique());
  const error = await expectApiStatus('POST', `/api/orders/${context.order.id}/cancel`, 403, {
    token: outsider.token
  });
  expect(error.message).toBe('无权取消此订单');
});

test('E2E-TC12-ALT01: 游客可从商品详情进入卖家公开店铺', async ({ page }) => {
  const { seller, product } = await createListedProduct(unique());
  await page.goto(appPath(`/product/${product.id}`));
  await page.locator('button[title="进入店铺"]').first().click();
  await expect(page).toHaveURL(new RegExp(`/shop/user/${seller.id}$`));
  await expect(page.getByText(product.name)).toBeVisible();
});

test('E2E-TC12-ALT02: 无在售商品的公开店铺显示空状态', async ({ page }) => {
  const id = unique();
  const seller = await registerViaApi('empty_shop_seller', id);
  await verifySellerShop(seller, id);
  const shop = await apiRequest('GET', `/api/shops/user/${seller.id}`);
  await page.goto(appPath(`/shop/user/${seller.id}`));
  await expect(page.getByRole('heading', { name: shop.name })).toBeVisible();
  await expect(page.getByText('在售商品 0 件')).toBeVisible();
  await expect(page.getByText('暂无商品')).toBeVisible();
});
