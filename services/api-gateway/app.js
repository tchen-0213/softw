const express = require('express');

const app = express();
const version = process.env.SERVICE_VERSION || '1.0.0';

const routes = [
  { prefix: '/api/users', target: process.env.USER_SERVICE_URL || 'http://localhost:3101' },
  { prefix: '/api/products', target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102' },
  { prefix: '/api/secondhand', target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102' },
  { prefix: '/api/orders', target: process.env.ORDER_SERVICE_URL || 'http://localhost:3103' }
];

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', version });
});

app.get('/version', (req, res) => {
  res.json({ service: 'api-gateway', version, routes });
});

app.use('/api', async (req, res) => {
  const match = routes.find(route => req.originalUrl.startsWith(route.prefix));

  if (!match) {
    return res.status(404).json({ message: '网关未配置该服务路由' });
  }

  const targetUrl = new URL(req.originalUrl, match.target);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.PROXY_TIMEOUT_MS || 3000));

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'content-type': req.get('content-type') || 'application/json',
        authorization: req.get('authorization') || ''
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
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
