function createService({ express, name, version, routes, isReady = () => true }) {
  const app = express();
  const revision = process.env.SERVICE_REVISION || 'dev';
  const buildTime = process.env.BUILD_TIME || 'unknown';
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: name,
      version,
      revision,
      uptime: process.uptime()
    });
  });

  app.get('/ready', (req, res) => {
    const ready = isReady();
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
    return res.status(error.status || 500).json({
      message: error.message || '服务器内部错误'
    });
  });

  return app;
}

module.exports = { createService };
