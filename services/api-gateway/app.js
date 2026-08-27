const express = require('express');

const app = express();
const version = process.env.SERVICE_VERSION || '1.0.0';

const routes = [
  { prefix: '/api/users', target: process.env.USER_SERVICE_URL || 'http://localhost:3101' },
  { prefix: '/api/addresses', target: process.env.USER_SERVICE_URL || 'http://localhost:3101' },
  { prefix: '/api/products', target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102' },
  { prefix: '/api/secondhand', target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102' },
  { prefix: '/api/shops', target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102' },
  { prefix: '/api/evaluations', target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102' },
  { prefix: '/api/chats', target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102' },
  { prefix: '/api/uploads', target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102' },
  { prefix: '/uploads', target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102' },
  { prefix: '/api/orders', target: process.env.ORDER_SERVICE_URL || 'http://localhost:3103' }
];

app.use(express.json({ limit: '2mb', type: 'application/json' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.get('origin') || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', version });
});

app.get('/version', (req, res) => {
  res.json({ service: 'api-gateway', version, routes });
});

app.use(async (req, res) => {
  const match = routes.find(route => req.originalUrl.startsWith(route.prefix));

  if (!match) {
    return res.status(404).json({ message: '网关未配置该服务路由' });
  }

  const targetUrl = new URL(req.originalUrl, match.target);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.PROXY_TIMEOUT_MS || 3000));

  try {
    const contentType = req.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'content-type': contentType || 'application/json',
        authorization: req.get('authorization') || '',
        'idempotency-key': req.get('idempotency-key') || ''
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : (isJson ? JSON.stringify(req.body || {}) : req),
      duplex: isJson || ['GET', 'HEAD'].includes(req.method) ? undefined : 'half',
      signal: controller.signal
    });
    clearTimeout(timeout);

    const text = await upstream.text();
    res.status(upstream.status);
    res.type(upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (error) {
    clearTimeout(timeout);
    return res.status(503).json({
      message: '依赖服务暂不可用',
      route: match.prefix,
      fallback: '请稍后重试，其他服务保持可用'
    });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => console.log(`api-gateway listening on ${port}`));
}

module.exports = app;
