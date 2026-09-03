import { expect } from '@playwright/test';

export const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
export const TEST_IMAGE = '../backend/uploads/1780540436586-391031648.png';
const E2E_BASE_PATH = new URL(process.env.E2E_BASE_URL || 'http://localhost:8080').pathname
  .replace(/\/?$/, '/');

export const appPath = path => `${E2E_BASE_PATH}${path.replace(/^\//, '')}`;
export const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export async function apiResponse(method, path, { token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      // Separate fixture creation from browser traffic without disabling rate limiting.
      'X-Forwarded-For': '127.0.0.12',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  return { response, data };
}

export async function apiRequest(method, path, options) {
  const { response, data } = await apiResponse(method, path, options);
  if (!response.ok) {
    throw new Error(`${method} ${path} failed ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function expectApiStatus(method, path, status, options) {
  const { response, data } = await apiResponse(method, path, options);
  expect(response.status, `${method} ${path}: ${JSON.stringify(data)}`).toBe(status);
  return data;
}

export async function registerViaApi(kind, id) {
  const payload = {
    username: `e2e_${kind}_${id}`,
    email: `e2e_${kind}_${id}@example.com`,
    phone: `137${String(id).slice(-8).padStart(8, '0')}`,
    password: 'Pass123456'
  };
  await apiRequest('POST', '/api/users/register', { body: payload });
  const user = await apiRequest('POST', '/api/users/login', {
    body: { email: payload.email, password: payload.password }
  });
  return { ...payload, id: user._id, token: user.token };
}

export async function signIn(page, user) {
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

export async function verifySellerShop(seller, id) {
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

export async function createListedProduct(id, overrides = {}) {
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
      bargainEnabled: true,
      ...overrides
    }
  });
  return { seller, product };
}

export async function createPendingOrder(id, { productOverrides = {} } = {}) {
  const { seller, product } = await createListedProduct(id, productOverrides);
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
  return { seller, buyer, product, order };
}

export async function createCompletedOrder(id) {
  const context = await createPendingOrder(id);
  const { seller, buyer, order } = context;
  await apiRequest('POST', `/api/orders/${order.id}/pay`, { token: buyer.token });
  await apiRequest('POST', `/api/orders/${order.id}/ship`, {
    token: seller.token,
    body: { company: '顺丰速运', trackingNumber: `SF${id}` }
  });
  const finishedOrder = await apiRequest('POST', `/api/orders/${order.id}/confirm`, {
    token: buyer.token
  });
  return { ...context, order: finishedOrder };
}
