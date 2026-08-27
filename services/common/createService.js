function createService({ express, name, version, routes, isReady = () => true }) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    const ready = isReady();
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'starting',
      service: name,
      version,
      database: ready ? 'ok' : 'starting',
      uptime: process.uptime()
    });
  });

  app.get('/version', (req, res) => {
    res.json({ service: name, version });
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
