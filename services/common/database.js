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
  const queryInterface = sequelize.getQueryInterface();
  for (const model of Object.values(sequelize.models)) {
    const expected = (model.options.indexes || []).filter(index => index.name);
    if (!expected.length) continue;
    const existing = new Set((await queryInterface.showIndex(model.getTableName())).map(index => index.name));
    for (const index of expected) {
      if (existing.has(index.name)) continue;
      await queryInterface.addIndex(model.getTableName(), index.fields, {
        name: index.name,
        unique: Boolean(index.unique)
      });
    }
  }
}

module.exports = { createDatabase, initializeDatabase };
