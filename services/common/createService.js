const { logError, requestContext } = require('./observability');
const { securityHeaders } = require('./security');

function createService({ express, name, version, routes, isReady = () => true, logger }) {
  const app = express();
  const revision = process.env.SERVICE_REVISION || 'dev';
  const buildTime = process.env.BUILD_TIME || 'unknown';
  const configuredReadinessTimeout = Number(process.env.READINESS_TIMEOUT_MS || 1500);
  const readinessTimeoutMs = Number.isFinite(configuredReadinessTimeout)
    ? Math.max(100, configuredReadinessTimeout)
    : 1500;
  app.disable('x-powered-by');
  app.use(requestContext({ service: name, logger }));
  app.use(securityHeaders);
  app.use(express.json({ limit: process.env.SERVICE_BODY_LIMIT || '2mb' }));

  const readiness = async () => {
    let timeout;
    try {
      return await Promise.race([
        Promise.resolve().then(isReady).then(Boolean).catch(() => false),
        new Promise(resolve => {
          timeout = setTimeout(() => resolve(false), readinessTimeoutMs);
          timeout.unref?.();
        })
      ]);
    } catch (error) {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  };

  app.get('/live', (req, res) => {
    res.json({ status: 'alive', service: name, uptime: process.uptime() });
  });

  app.get('/health', async (req, res) => {
    const ready = await readiness();
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'degraded',
      service: name,
      version,
      revision,
      uptime: process.uptime(),
      readiness: ready ? 'ready' : 'not-ready'
    });
  });

  app.get('/ready', async (req, res) => {
    const ready = await readiness();
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not-ready',
      service: name,
      database: ready ? 'ok' : 'starting'
    });
  });

  app.get('/version', (req, res) => {
    res.json({ service: name, version, revision, buildTime });
  });

  routes(app);

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }
    const status = Number(error.status || error.statusCode || 500);
    logError({ service: name, requestId: req.requestId, error, statusCode: status, logger });
    return res.status(status).json({
      message: status >= 500 ? '服务器内部错误' : (error.message || '请求处理失败'),
      requestId: req.requestId
    });
  });

  return app;
}

module.exports = { createService };
