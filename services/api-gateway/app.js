const express = require('express');
const { logError, requestContext } = require('../common/observability');
const {
  createCors,
  createRateLimiter,
  enforceContentLength,
  parseAllowedOrigins,
  parseByteLimit,
  securityHeaders
} = require('../common/security');

const app = express();
const serviceName = 'api-gateway';
const version = process.env.SERVICE_VERSION || '1.0.0';
const revision = process.env.SERVICE_REVISION || 'dev';
const buildTime = process.env.BUILD_TIME || 'unknown';
const proxyTimeoutMs = Math.max(Number(process.env.PROXY_TIMEOUT_MS || 3000), 100);
const maxBodyBytes = parseByteLimit(process.env.GATEWAY_BODY_LIMIT || '2mb');

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

app.disable('x-powered-by');
app.use(requestContext({ service: serviceName }));
app.use(securityHeaders);
app.use(createCors({ allowedOrigins: parseAllowedOrigins() }));
app.use(createRateLimiter({
  windowMs: Math.max(Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000), 1000),
  max: Math.max(Number(process.env.RATE_LIMIT_MAX || 120), 1)
}));
app.use(enforceContentLength(maxBodyBytes));
app.use(express.json({ limit: maxBodyBytes, type: 'application/json' }));

async function dependencyChecks() {
  const dependencies = [...new Set(routes.map(route => route.target))];
  return Promise.all(dependencies.map(async target => {
    try {
      const response = await fetch(new URL('/ready', target), { signal: AbortSignal.timeout(2000) });
      return { service: new URL(target).hostname, ready: response.ok };
    } catch (error) {
      return { service: new URL(target).hostname, ready: false };
    }
  }));
}

app.get('/live', (req, res) => {
  res.json({ status: 'alive', service: serviceName, uptime: process.uptime() });
});

app.get('/ready', async (req, res) => {
  const checks = await dependencyChecks();
  const ready = checks.every(check => check.ready);
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    service: serviceName,
    dependencies: checks
  });
});

app.get('/health', async (req, res) => {
  const checks = await dependencyChecks();
  const ready = checks.every(check => check.ready);
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    service: serviceName,
    version,
    revision,
    uptime: process.uptime(),
    readiness: ready ? 'ready' : 'not-ready',
    dependencies: checks
  });
});

app.get('/version', (req, res) => {
  res.json({ service: serviceName, version, revision, buildTime, routes });
});

app.use(async (req, res, next) => {
  const match = routes.find(route => req.originalUrl.startsWith(route.prefix));
  if (!match) return res.status(404).json({ message: '网关未配置该服务路由', requestId: req.requestId });

  const targetUrl = new URL(req.originalUrl, match.target);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), proxyTimeoutMs);

  try {
    const contentType = req.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const headers = {
      accept: req.get('accept') || 'application/json',
      'x-request-id': req.requestId
    };
    if (contentType) headers['content-type'] = contentType;
    if (req.get('authorization')) headers.authorization = req.get('authorization');
    if (req.get('idempotency-key')) headers['idempotency-key'] = req.get('idempotency-key');

    const bodyAllowed = !['GET', 'HEAD'].includes(req.method);
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyAllowed ? (isJson ? JSON.stringify(req.body || {}) : req) : undefined,
      duplex: bodyAllowed && !isJson ? 'half' : undefined,
      signal: controller.signal
    });

    const responseBody = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(responseBody);
  } catch (cause) {
    const error = new Error(cause.name === 'AbortError' ? 'upstream timeout' : 'upstream unavailable');
    error.status = cause.name === 'AbortError' ? 504 : 503;
    error.publicMessage = cause.name === 'AbortError' ? '依赖服务响应超时' : '依赖服务暂不可用';
    return next(error);
  } finally {
    clearTimeout(timeout);
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error.status || error.statusCode || 500);
  logError({ service: serviceName, requestId: req.requestId, error, statusCode: status });
  const message = error.publicMessage
    || (status === 413 ? '请求体超过大小限制' : status >= 500 ? '网关内部错误' : '请求格式不正确');
  return res.status(status).json({ message, requestId: req.requestId });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => console.log(`${serviceName} listening on ${port}`));
}

module.exports = app;
module.exports._internal = { dependencyChecks, routes };
