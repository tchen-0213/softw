const fs = require('fs');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');

const databaseName = process.env.DB_NAME || '';
if (!/d703_benchmark$/i.test(databaseName)) {
  throw new Error('为避免清空业务数据，DB_NAME 必须以 d703_benchmark 结尾');
}

const { sequelize, models, queries } = require('./app');
const { Order, OrderSeller } = models;

const orderCount = Math.max(Number(process.env.D703_ORDER_COUNT || 20000), 1000);
const sellerCount = Math.max(Number(process.env.D703_SELLER_COUNT || 200), 10);
const targetSellerId = Number(process.env.D703_TARGET_SELLER_ID || 42);
const pageSize = 20;
const measuredRuns = 7;
const output = process.env.D703_BENCHMARK_OUTPUT || path.resolve(__dirname, '../../04_tests/reports/performance/raw/order-query-optimization-2026-08-31.json');

const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const percentile = (values, ratio) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(Math.ceil(sorted.length * ratio) - 1, sorted.length - 1)];
};
const round = value => Number(value.toFixed(3));

async function seed() {
  await sequelize.sync({ force: true });
  const batchSize = 1000;
  for (let start = 1; start <= orderCount; start += batchSize) {
    const orders = [];
    const links = [];
    for (let id = start; id < Math.min(start + batchSize, orderCount + 1); id += 1) {
      const sellerId = (id % sellerCount) + 1;
      const createdAt = new Date(Date.UTC(2026, 7, 1) + id * 1000);
      orders.push({
        id,
        userId: 100000 + (id % 500),
        reservationId: `D703-${String(id).padStart(6, '0')}`,
        items: [{ productId: id, sellerId, sellerName: `seller-${sellerId}`, name: `benchmark-product-${id}`, price: 10 + (id % 100), quantity: 1 }],
        totalAmount: 10 + (id % 100),
        status: ['待付款', '待发货', '待收货', '已完成'][id % 4],
        paymentStatus: id % 4 === 0 ? '未支付' : '已支付',
        createdAt,
        updatedAt: createdAt
      });
      links.push({ orderId: id, sellerId });
    }
    await Order.bulkCreate(orders, { validate: true });
    await OrderSeller.bulkCreate(links, { validate: true });
  }
}

async function baselineQuery() {
  const started = performance.now();
  const all = await Order.findAll({ order: [['createdAt', 'DESC']] });
  const rows = all.filter(order => (order.items || []).some(item => Number(item.sellerId) === targetSellerId)).slice(0, pageSize);
  return { elapsedMs: performance.now() - started, loadedRows: all.length, ids: rows.map(row => row.id) };
}

async function optimizedQuery() {
  const started = performance.now();
  const { rows, count } = await queries.fetchSellerOrders({ sellerId: targetSellerId, page: 1, limit: pageSize });
  return { elapsedMs: performance.now() - started, loadedRows: rows.length, matchedRows: count, ids: rows.map(row => row.id) };
}

async function explain(sql, replacements = []) {
  const [rows] = await sequelize.query(`EXPLAIN FORMAT=JSON ${sql}`, { replacements });
  return JSON.parse(rows[0].EXPLAIN);
}

async function run() {
  await sequelize.authenticate();
  await seed();

  await baselineQuery();
  await optimizedQuery();

  const baseline = [];
  const optimized = [];
  for (let run = 1; run <= measuredRuns; run += 1) {
    const before = await baselineQuery();
    const after = await optimizedQuery();
    if (before.ids.join(',') !== after.ids.join(',')) throw new Error(`第 ${run} 轮优化前后结果不一致`);
    baseline.push({ run, ...before, elapsedMs: round(before.elapsedMs) });
    optimized.push({ run, ...after, elapsedMs: round(after.elapsedMs) });
  }

  const baselineTimes = baseline.map(item => item.elapsedMs);
  const optimizedTimes = optimized.map(item => item.elapsedMs);
  const baselineMean = mean(baselineTimes);
  const optimizedMean = mean(optimizedTimes);
  const [mysqlVersionRows] = await sequelize.query('SELECT VERSION() AS version');
  const [orderIndexes] = await sequelize.query('SHOW INDEX FROM Orders');
  const [sellerIndexes] = await sequelize.query('SHOW INDEX FROM OrderSellers');
  const baselineSql = 'SELECT * FROM Orders ORDER BY createdAt DESC';
  const optimizedSql = 'SELECT o.* FROM OrderSellers os JOIN Orders o ON o.id = os.orderId WHERE os.sellerId = ? ORDER BY o.createdAt DESC LIMIT 20';
  const result = {
    runAt: new Date().toISOString(),
    environment: {
      platform: `${os.platform()} ${os.release()} ${os.arch()}`,
      cpu: `${os.cpus()[0]?.model || 'unknown'} / ${os.cpus().length} logical cores`,
      memoryGiB: round(os.totalmem() / 1024 / 1024 / 1024),
      node: process.version,
      mysql: mysqlVersionRows[0].version,
      database: databaseName
    },
    conditions: { orderCount, sellerCount, targetSellerId, pageSize, measuredRuns, sameDatabase: true, sameDataset: true, sameProcess: true },
    queries: { baselineSql, optimizedSql },
    baseline,
    optimized,
    summary: {
      baselineMeanMs: round(baselineMean),
      baselineP95Ms: round(percentile(baselineTimes, 0.95)),
      optimizedMeanMs: round(optimizedMean),
      optimizedP95Ms: round(percentile(optimizedTimes, 0.95)),
      meanLatencyReductionPercent: round((1 - optimizedMean / baselineMean) * 100),
      rowsLoadedReductionPercent: round((1 - optimized[0].loadedRows / baseline[0].loadedRows) * 100),
      sameResultIdsEveryRun: true
    },
    indexes: {
      Orders: orderIndexes.map(row => ({ name: row.Key_name, sequence: row.Seq_in_index, column: row.Column_name, unique: row.Non_unique === 0 })),
      OrderSellers: sellerIndexes.map(row => ({ name: row.Key_name, sequence: row.Seq_in_index, column: row.Column_name, unique: row.Non_unique === 0 }))
    },
    explain: {
      baseline: await explain(baselineSql),
      optimized: await explain(optimizedSql, [targetSellerId])
    }
  };

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ output, summary: result.summary }, null, 2));
}

run().finally(() => sequelize.close()).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
