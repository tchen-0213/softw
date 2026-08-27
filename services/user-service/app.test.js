const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_NAME = process.env.DB_NAME || 'softw_users_test';
process.env.JWT_SECRET = 'test_microservice_secret';
const { app, initialize, sequelize } = require('./app');

test('user service persists registration, authentication and addresses', async () => {
  await initialize();
  await sequelize.sync({ force: true });
  const server = await new Promise(resolve => { const value = app.listen(0, () => resolve(value)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const registeredResponse = await fetch(`${base}/api/users/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'micro_buyer', email: 'micro@example.com', phone: '13800000000', password: 'Secret123' }) });
    assert.equal(registeredResponse.status, 201);
    const registered = await registeredResponse.json();
    assert.ok(registered.token);
    assert.equal(registered.password, undefined);

    const savedResponse = await fetch(`${base}/api/addresses`, { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${registered.token}` }, body: JSON.stringify({ addresses: [{ name: '测试用户', phone: '13800000000', address: '测试路 1 号' }] }) });
    assert.equal(savedResponse.status, 200);
    const saved = await savedResponse.json();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].isDefault, true);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await sequelize.close();
  }
});
