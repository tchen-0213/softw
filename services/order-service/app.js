const express = require('express');
const { createService } = require('../common/createService');

const serviceName = process.env.SERVICE_NAME || 'order-service';
const version = process.env.SERVICE_VERSION || '1.0.0';
const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102';

const orders = [
  {
    id: 1,
    userId: 1,
    productId: 1,
    status: 'paid',
    amount: 2999
  }
];

async function checkProductDependency() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`${productServiceUrl}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response.ok ? 'ok' : 'degraded';
  } catch (error) {
    clearTimeout(timeout);
    return 'degraded';
  }
}

const app = createService({
  express,
  name: serviceName,
  version,
  routes: (router) => {
    router.get('/api/orders', (req, res) => {
      res.json({ service: serviceName, data: orders });
    });

    router.get('/api/orders/health/dependencies', async (req, res) => {
      const productDependency = await checkProductDependency();
      res.status(productDependency === 'ok' ? 200 : 206).json({
        service: serviceName,
        status: productDependency === 'ok' ? 'ok' : 'degraded',
        dependencies: {
          productService: productDependency
        },
        fallback: productDependency === 'ok' ? null : '商品信息暂不可用，订单核心查询保持可用'
      });
    });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3103);
  app.listen(port, () => console.log(`${serviceName} listening on ${port}`));
}

module.exports = app;
