const dotenv = require('dotenv');
const sequelize = require('../config/database');
const {
  getMigrationStatus,
  rollbackLastMigration,
  runMigrations
} = require('../database/migrate');

dotenv.config();

const command = process.argv[2] || 'up';

const main = async () => {
  if (command === 'up') {
    const executed = await runMigrations(sequelize);
    console.log(executed.length ? `Applied ${executed.length} migration(s).` : 'Database is up to date.');
    return;
  }

  if (command === 'status') {
    const status = await getMigrationStatus(sequelize);
    for (const migration of status) {
      console.log(`${migration.status.padEnd(7)} ${migration.version}`);
    }
    return;
  }

  if (command === 'down') {
    const version = await rollbackLastMigration(sequelize);
    console.log(version ? `Rolled back ${version}.` : 'No migration to roll back.');
    return;
  }

  throw new Error(`Unknown migration command: ${command}`);
};

main()
  .then(async () => {
    await sequelize.close();
  })
  .catch(async error => {
    console.error('Database migration failed:', error);
    await sequelize.close();
    process.exitCode = 1;
  });
