const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: Number(process.env.DB_PORT || 3306)
  }
);

// 测试环境的单元测试不需要真实数据库连接，避免 CI 中产生噪声。
if (process.env.NODE_ENV !== 'test') {
  sequelize.authenticate()
    .then(() => console.log('MySQL connected'))
    .catch(err => console.error('MySQL connection error:', err));
}

module.exports = sequelize;
