const express = require('express');
const { createService } = require('../common/createService');

const serviceName = process.env.SERVICE_NAME || 'user-service';
const version = process.env.SERVICE_VERSION || '1.0.0';

const users = [
  {
    id: 1,
    username: 'demo_buyer',
    role: 'buyer',
    creditLevel: '金牌'
  }
];

const app = createService({
  express,
  name: serviceName,
  version,
  routes: (router) => {
    router.get('/api/users', (req, res) => {
      res.json({ service: serviceName, data: users });
    });

    router.get('/api/users/:id', (req, res) => {
      const user = users.find(item => item.id === Number(req.params.id));
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      return res.json({ service: serviceName, data: user });
    });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3101);
  app.listen(port, () => console.log(`${serviceName} listening on ${port}`));
}

module.exports = app;
