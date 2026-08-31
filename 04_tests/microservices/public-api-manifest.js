const publicApis = [
  { service: 'user-service', method: 'POST', path: '/api/users/register', testIds: ['MS-E2E-TC01'] },
  { service: 'user-service', method: 'POST', path: '/api/users/login', testIds: ['MS-E2E-TC01'] },
  { service: 'user-service', method: 'GET', path: '/api/users/profile', testIds: ['MS-E2E-TC01'] },
  { service: 'user-service', method: 'PUT', path: '/api/users/profile', testIds: ['MS-E2E-TC01'] },
  { service: 'user-service', method: 'PUT', path: '/api/users/password', testIds: ['MS-E2E-TC01'] },
  { service: 'user-service', method: 'GET', path: '/api/addresses', testIds: ['MS-E2E-TC09'] },
  { service: 'user-service', method: 'PUT', path: '/api/addresses', testIds: ['MS-E2E-TC09'] },

  { service: 'product-service', method: 'GET', path: '/api/products', testIds: ['MS-E2E-TC02/03'] },
  { service: 'product-service', method: 'GET', path: '/api/products/search', testIds: ['MS-E2E-TC02/03'] },
  { service: 'product-service', method: 'GET', path: '/api/products/recommended', testIds: ['MS-E2E-TC02/03'] },
  { service: 'product-service', method: 'GET', path: '/api/products/mine', testIds: ['MS-E2E-TC02/03'] },
  { service: 'product-service', method: 'GET', path: '/api/products/:id', testIds: ['MS-E2E-TC02/03'] },
  { service: 'product-service', method: 'POST', path: '/api/products', testIds: ['MS-E2E-TC02/03'] },
  { service: 'product-service', method: 'PUT', path: '/api/products/:id', testIds: ['MS-E2E-TC02/03'] },
  { service: 'product-service', method: 'DELETE', path: '/api/products/:id', testIds: ['MS-E2E-TC02/03'] },

  { service: 'product-service', method: 'GET', path: '/api/secondhand', testIds: ['MS-E2E-TC05'] },
  { service: 'product-service', method: 'GET', path: '/api/secondhand/search', testIds: ['MS-E2E-TC05'] },
  { service: 'product-service', method: 'GET', path: '/api/secondhand/:id', testIds: ['MS-E2E-TC05'] },
  { service: 'product-service', method: 'POST', path: '/api/secondhand', testIds: ['MS-E2E-TC05'] },
  { service: 'product-service', method: 'PUT', path: '/api/secondhand/:id', testIds: ['MS-E2E-TC05'] },
  { service: 'product-service', method: 'DELETE', path: '/api/secondhand/:id', testIds: ['MS-E2E-TC05'] },

  { service: 'product-service', method: 'GET', path: '/api/shops/mine', testIds: ['MS-E2E-TC06'] },
  { service: 'product-service', method: 'PUT', path: '/api/shops/mine', testIds: ['MS-E2E-TC06'] },
  { service: 'product-service', method: 'POST', path: '/api/shops/mine/verification', testIds: ['MS-E2E-TC06'] },
  { service: 'product-service', method: 'GET', path: '/api/shops/user/:userId', testIds: ['MS-E2E-TC06'] },
  { service: 'product-service', method: 'GET', path: '/api/shops/:id', testIds: ['MS-E2E-TC06'] },

  { service: 'product-service', method: 'POST', path: '/api/evaluations', testIds: ['MS-E2E-TC07'] },
  { service: 'product-service', method: 'GET', path: '/api/evaluations/product', testIds: ['MS-E2E-TC07'] },
  { service: 'product-service', method: 'GET', path: '/api/evaluations/user', testIds: ['MS-E2E-TC07'] },
  { service: 'product-service', method: 'GET', path: '/api/evaluations/seller', testIds: ['MS-E2E-TC07'] },
  { service: 'product-service', method: 'PUT', path: '/api/evaluations/:id/approve', testIds: ['MS-E2E-TC07'] },
  { service: 'product-service', method: 'PUT', path: '/api/evaluations/:id/reply', testIds: ['MS-E2E-TC07'] },

  { service: 'product-service', method: 'POST', path: '/api/chats/conversations', testIds: ['MS-E2E-TC08'] },
  { service: 'product-service', method: 'GET', path: '/api/chats/conversations', testIds: ['MS-E2E-TC08'] },
  { service: 'product-service', method: 'GET', path: '/api/chats/conversations/:id', testIds: ['MS-E2E-TC08'] },
  { service: 'product-service', method: 'POST', path: '/api/chats/conversations/:id/messages', testIds: ['MS-E2E-TC08'] },
  { service: 'product-service', method: 'PUT', path: '/api/chats/messages/:id/decision', testIds: ['MS-E2E-TC08'] },

  { service: 'product-service', method: 'POST', path: '/api/uploads/images', testIds: ['MS-API-UPLOAD'] },
  { service: 'product-service', method: 'GET', path: '/uploads/:filename', testIds: ['MS-API-UPLOAD'], source: 'static' },

  { service: 'order-service', method: 'POST', path: '/api/orders', testIds: ['MS-E2E-TC04'] },
  { service: 'order-service', method: 'GET', path: '/api/orders', testIds: ['MS-E2E-TC04'] },
  { service: 'order-service', method: 'GET', path: '/api/orders/seller', testIds: ['MS-E2E-TC04'] },
  { service: 'order-service', method: 'GET', path: '/api/orders/health/dependencies', testIds: ['MS-E2E-TC04'] },
  { service: 'order-service', method: 'GET', path: '/api/orders/:id', testIds: ['MS-E2E-TC04'] },
  { service: 'order-service', method: 'POST', path: '/api/orders/:id/pay', testIds: ['MS-E2E-TC04'] },
  { service: 'order-service', method: 'POST', path: '/api/orders/:id/cancel', testIds: ['MS-E2E-TC04'] },
  { service: 'order-service', method: 'POST', path: '/api/orders/:id/ship', testIds: ['MS-E2E-TC04'] },
  { service: 'order-service', method: 'POST', path: '/api/orders/:id/confirm', testIds: ['MS-E2E-TC04'] },
  { service: 'order-service', method: 'PUT', path: '/api/orders/:id', testIds: ['MS-E2E-TC04'] }
];

const scenarioCoverage = [
  { uc: 'UC01', testId: 'MS-E2E-TC01', titleMarker: 'UC01 registration', flows: ['MAIN', 'ALT', 'ERR'] },
  { uc: 'UC02', testId: 'MS-E2E-TC02/03', titleMarker: 'UC02-03 product', flows: ['MAIN', 'ALT', 'ERR'] },
  { uc: 'UC03', testId: 'MS-E2E-TC02/03', titleMarker: 'UC02-03 product', flows: ['MAIN', 'ALT', 'ERR'] },
  { uc: 'UC04', testId: 'MS-E2E-TC04', titleMarker: 'UC04 order', flows: ['MAIN', 'ALT', 'ERR'] },
  { uc: 'UC05', testId: 'MS-E2E-TC05', titleMarker: 'UC05 secondhand', flows: ['MAIN', 'ALT', 'ERR'] },
  { uc: 'UC06', testId: 'MS-E2E-TC06', titleMarker: 'UC06 shop', flows: ['MAIN', 'ALT', 'ERR'] },
  { uc: 'UC07', testId: 'MS-E2E-TC07', titleMarker: 'UC07 evaluation', flows: ['MAIN', 'ALT', 'ERR'] },
  { uc: 'UC08', testId: 'MS-E2E-TC08', titleMarker: 'UC08 chat', flows: ['MAIN', 'ALT', 'ERR'] },
  { uc: 'UC09', testId: 'MS-E2E-TC09', titleMarker: 'UC09 address', flows: ['MAIN', 'ALT', 'ERR'] }
];

const routeKey = ({ method, path }) => `${method.toUpperCase()} ${path}`;

module.exports = { publicApis, scenarioCoverage, routeKey };
