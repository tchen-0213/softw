const { Sequelize } = require('sequelize');

function createDatabase(defaultName) {
  if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD is required');
  return new Sequelize(
    process.env.DB_NAME || defaultName,
    process.env.DB_USER || 'softw',
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      dialect: 'mysql',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      retry: { max: 10 }
    }
  );
}

async function initializeDatabase(sequelize) {
  await sequelize.authenticate();
  await sequelize.sync();
}

module.exports = { createDatabase, initializeDatabase };
