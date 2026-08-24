function createService({ express, name, version, routes }) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: name,
      version,
      uptime: process.uptime()
    });
  });

  app.get('/version', (req, res) => {
    res.json({ service: name, version });
  });

  routes(app);

  return app;
}

module.exports = { createService };
