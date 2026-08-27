const migrations = [
  require('./migrations/001-baseline-schema'),
  require('./migrations/002-marketplace-fields'),
  require('./migrations/003-bargain-redemption')
];

const loadAllModels = () => {
  require('../models/User');
  require('../models/Product');
  require('../models/Order');
  require('../models/Evaluation');
  require('../models/Shop');
  require('../models/Address');
  require('../models/ChatConversation');
  require('../models/ChatMessage');
};

const validateMigrations = migrationList => {
  const versions = migrationList.map(migration => migration.version);
  if (versions.some(version => !version) || new Set(versions).size !== versions.length) {
    throw new Error('Database migration versions must be present and unique');
  }
};

const ensureMigrationsTable = sequelize => sequelize.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(128) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const getAppliedVersions = async sequelize => {
  const [rows] = await sequelize.query(`
    SELECT version
    FROM schema_migrations
    ORDER BY version
  `);
  return new Set(rows.map(row => row.version));
};

const runMigrations = async (sequelize, options = {}) => {
  const migrationList = options.migrations || migrations;
  const logger = options.logger || console;

  validateMigrations(migrationList);
  loadAllModels();
  await ensureMigrationsTable(sequelize);
  const applied = await getAppliedVersions(sequelize);
  const executed = [];

  for (const migration of migrationList) {
    if (applied.has(migration.version)) {
      continue;
    }

    await migration.up({ sequelize });
    await sequelize.query(
      'INSERT INTO schema_migrations (version) VALUES (:version)',
      { replacements: { version: migration.version } }
    );
    executed.push(migration.version);
    logger.log(`Applied database migration ${migration.version}`);
  }

  return executed;
};

const getMigrationStatus = async (sequelize, migrationList = migrations) => {
  validateMigrations(migrationList);
  await ensureMigrationsTable(sequelize);
  const applied = await getAppliedVersions(sequelize);
  return migrationList.map(migration => ({
    version: migration.version,
    status: applied.has(migration.version) ? 'applied' : 'pending'
  }));
};

const rollbackLastMigration = async (sequelize, options = {}) => {
  const migrationList = options.migrations || migrations;
  const logger = options.logger || console;

  validateMigrations(migrationList);
  loadAllModels();
  await ensureMigrationsTable(sequelize);
  const applied = await getAppliedVersions(sequelize);
  const migration = [...migrationList].reverse().find(item => applied.has(item.version));

  if (!migration) {
    return null;
  }

  await migration.down({ sequelize });
  await sequelize.query(
    'DELETE FROM schema_migrations WHERE version = :version',
    { replacements: { version: migration.version } }
  );
  logger.log(`Rolled back database migration ${migration.version}`);
  return migration.version;
};

module.exports = {
  getMigrationStatus,
  rollbackLastMigration,
  runMigrations,
  _internal: {
    ensureMigrationsTable,
    getAppliedVersions,
    validateMigrations
  }
};
