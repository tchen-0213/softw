const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const databaseNames = {
  orders: process.env.D703_ORDERS_DB || 'softw_orders_test',
  catalog: process.env.D703_CATALOG_DB || 'softw_catalog_test',
  users: process.env.D703_USERS_DB || 'softw_users_test'
};
for (const name of Object.values(databaseNames)) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`不安全的数据库名称: ${name}`);
}

const output = process.env.D703_INDEX_OUTPUT || path.resolve(__dirname, '../../04_tests/reports/performance/raw/index-explain-2026-08-31.json');
const connectionOptions = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'softw',
  password: process.env.DB_PASSWORD
};
if (!connectionOptions.password) throw new Error('DB_PASSWORD is required');

const quote = name => `\`${name}\``;
const indexRows = rows => rows.map(row => ({ table: row.Table, name: row.Key_name, sequence: row.Seq_in_index, column: row.Column_name, unique: row.Non_unique === 0, cardinality: row.Cardinality }));

async function explain(connection, sql, params = []) {
  const [rows] = await connection.query(`EXPLAIN FORMAT=JSON ${sql}`, params);
  return JSON.parse(rows[0].EXPLAIN);
}

async function run() {
  const connection = await mysql.createConnection(connectionOptions);
  try {
    const [versionRows] = await connection.query('SELECT VERSION() AS version');
    const [orderIndexes] = await connection.query(`SHOW INDEX FROM Orders FROM ${quote(databaseNames.orders)}`);
    const [sellerIndexes] = await connection.query(`SHOW INDEX FROM OrderSellers FROM ${quote(databaseNames.orders)}`);
    const [productIndexes] = await connection.query(`SHOW INDEX FROM Products FROM ${quote(databaseNames.catalog)}`);
    const [userIndexes] = await connection.query(`SHOW INDEX FROM Users FROM ${quote(databaseNames.users)}`);
    const [addressIndexes] = await connection.query(`SHOW INDEX FROM Addresses FROM ${quote(databaseNames.users)}`);
    const result = {
      collectedAt: new Date().toISOString(),
      mysql: versionRows[0].version,
      databases: databaseNames,
      indexes: {
        Orders: indexRows(orderIndexes),
        OrderSellers: indexRows(sellerIndexes),
        Products: indexRows(productIndexes),
        Users: indexRows(userIndexes),
        Addresses: indexRows(addressIndexes)
      },
      explain: {
        sellerOrders: await explain(connection, `SELECT o.* FROM ${quote(databaseNames.orders)}.OrderSellers os JOIN ${quote(databaseNames.orders)}.Orders o ON o.id=os.orderId WHERE os.sellerId=? ORDER BY o.createdAt DESC LIMIT 20`, [2]),
        productFilter: await explain(connection, `SELECT * FROM ${quote(databaseNames.catalog)}.Products WHERE status='在售' AND category='performance-regression' ORDER BY price ASC LIMIT 20`),
        userLogin: await explain(connection, `SELECT * FROM ${quote(databaseNames.users)}.Users WHERE email=? LIMIT 1`, ['micro@example.com']),
        userAddresses: await explain(connection, `SELECT * FROM ${quote(databaseNames.users)}.Addresses WHERE userId=? ORDER BY isDefault DESC, updatedAt DESC`, [1])
      }
    };
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
    console.log(output);
  } finally {
    await connection.end();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
