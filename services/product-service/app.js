const express = require('express');
const { createService } = require('../common/createService');

const serviceName = process.env.SERVICE_NAME || 'product-service';
const version = process.env.SERVICE_VERSION || '1.0.0';

const products = [
  {
    id: 1,
    name: '校园二手笔记本',
    category: 'electronics',
    price: 2999,
    stock: 3
  },
  {
    id: 2,
    name: '算法教材',
    category: 'books',
    price: 45,
    stock: 12
  }
];

function burnCpu(milliseconds) {
  const duration = Math.min(Math.max(Number(milliseconds) || 0, 0), 500);
  const startedAt = Date.now();
  let value = 0;

  while (Date.now() - startedAt < duration) {
    value += Math.sqrt(value + Math.random());
  }

  return value;
}

const app = createService({
  express,
  name: serviceName,
  version,
  routes: (router) => {
    router.get('/api/products', (req, res) => {
      if (req.query.burnMs) {
        burnCpu(req.query.burnMs);
      }

      res.json({ service: serviceName, data: products });
    });

    router.get('/api/products/:id', (req, res) => {
      const product = products.find(item => item.id === Number(req.params.id));
      if (!product) {
        return res.status(404).json({ message: '商品不存在' });
      }

      return res.json({ service: serviceName, data: product });
    });

    router.get('/api/secondhand', (req, res) => {
      res.json({
        service: serviceName,
        data: products.filter(item => item.category !== 'new')
      });
    });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3102);
  app.listen(port, () => console.log(`${serviceName} listening on ${port}`));
}

module.exports = app;
