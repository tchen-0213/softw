const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getMigrationStatus,
  runMigrations,
  _internal
} = require('../database/migrate');

const createFakeSequelize = () => {
  const applied = new Set();
  return {
    applied,
    async query(sql, options = {}) {
      if (sql.includes('SELECT version')) {
        return [[...applied].sort().map(version => ({ version }))];
      }
      if (sql.startsWith('INSERT INTO schema_migrations')) {
        applied.add(options.replacements.version);
      }
      if (sql.startsWith('DELETE FROM schema_migrations')) {
        applied.delete(options.replacements.version);
      }
      return [[], undefined];
    }
  };
};

const silentLogger = { log() {} };

test('database migrations run once in version order and report status', async () => {
  const sequelize = createFakeSequelize();
  const calls = [];
  const migrations = [
    { version: '001-first', up: async () => calls.push('001') },
    { version: '002-second', up: async () => calls.push('002') }
  ];

  assert.deepEqual(await runMigrations(sequelize, { migrations, logger: silentLogger }), [
    '001-first',
    '002-second'
  ]);
  assert.deepEqual(calls, ['001', '002']);
  assert.deepEqual(await runMigrations(sequelize, { migrations, logger: silentLogger }), []);
  assert.deepEqual(calls, ['001', '002']);
  assert.deepEqual(await getMigrationStatus(sequelize, migrations), [
    { version: '001-first', status: 'applied' },
    { version: '002-second', status: 'applied' }
  ]);
});

test('failed migration is not recorded and stops later migrations', async () => {
  const sequelize = createFakeSequelize();
  let laterMigrationRan = false;
  const migrations = [
    { version: '001-fails', up: async () => { throw new Error('migration failed'); } },
    { version: '002-later', up: async () => { laterMigrationRan = true; } }
  ];

  await assert.rejects(
    runMigrations(sequelize, { migrations, logger: silentLogger }),
    /migration failed/
  );
  assert.equal(laterMigrationRan, false);
  assert.deepEqual([...sequelize.applied], []);
});

test('migration versions must be present and unique', () => {
  assert.throws(
    () => _internal.validateMigrations([{ version: '001' }, { version: '001' }]),
    /present and unique/
  );
  assert.throws(
    () => _internal.validateMigrations([{ up() {} }]),
    /present and unique/
  );
});
