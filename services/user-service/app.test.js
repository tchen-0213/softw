const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('./app');

function listen() {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('user service exposes health and user detail', async () => {
  const server = await listen();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const health = await fetch(`${baseUrl}/health`).then(res => res.json());
    assert.equal(health.status, 'ok');
    assert.equal(health.service, 'user-service');

    const user = await fetch(`${baseUrl}/api/users/1`).then(res => res.json());
    assert.equal(user.data.username, 'demo_buyer');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
