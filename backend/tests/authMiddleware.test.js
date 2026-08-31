const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { authorizeRoles, getJwtSecret, protect } = require('../middleware/auth');
const { requestId, securityHeaders } = require('../middleware/security');

const response = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  setHeader(name, value) { this.headers[name] = value; }
});

test('AUTH-01: 缺少 Bearer 令牌返回 401', async () => {
  const res = response();
  await protect({ headers: {} }, res, () => assert.fail('不应放行'));
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, '未提供认证令牌');
});

test('AUTH-02: 畸形和过期令牌返回 401', async () => {
  const res = response();
  await protect({ headers: { authorization: 'Bearer invalid-token' } }, res, () => assert.fail('不应放行'));
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, '无效的认证令牌');
});

test('AUTH-03: 有效令牌加载安全用户并放行', async (t) => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'auth-test-secret';
  t.after(() => { process.env.JWT_SECRET = previous; });
  const original = User.findByPk;
  User.findByPk = async (id, options) => ({ id, role: 'seller', options });
  t.after(() => { User.findByPk = original; });
  const req = { headers: { authorization: `Bearer ${jwt.sign({ id: 42 }, process.env.JWT_SECRET)}` } };
  const res = response();
  let called = false;
  await protect(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.user.id, 42);
  assert.deepEqual(req.user.options.attributes.exclude, ['password']);
});

test('AUTH-04: 已签发令牌对应用户不存在时拒绝访问', async (t) => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'auth-test-secret';
  t.after(() => { process.env.JWT_SECRET = previous; });
  const original = User.findByPk;
  User.findByPk = async () => null;
  t.after(() => { User.findByPk = original; });
  const token = jwt.sign({ id: 404 }, process.env.JWT_SECRET);
  const res = response();
  await protect({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('不应放行'));
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, '用户不存在或登录已失效');
});

test('AUTH-05: 角色中间件允许指定角色并拒绝其他角色', () => {
  const middleware = authorizeRoles('admin', 'seller');
  let passed = false;
  middleware({ user: { role: 'seller' } }, response(), () => { passed = true; });
  assert.equal(passed, true);
  const res = response();
  middleware({ user: { role: 'user' } }, res, () => assert.fail('不应放行'));
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, '无权执行此操作');
});

test('AUTH-06: 所有环境都拒绝缺失密钥并返回显式配置', (t) => {
  const previousEnv = process.env.NODE_ENV;
  const previousSecret = process.env.JWT_SECRET;
  t.after(() => { process.env.NODE_ENV = previousEnv; process.env.JWT_SECRET = previousSecret; });
  process.env.NODE_ENV = 'test';
  delete process.env.JWT_SECRET;
  assert.throws(() => getJwtSecret(), /JWT_SECRET 未配置/);
  process.env.JWT_SECRET = 'configured-test-secret';
  assert.equal(getJwtSecret(), 'configured-test-secret');
  process.env.NODE_ENV = 'production';
  delete process.env.JWT_SECRET;
  assert.throws(() => getJwtSecret(), /JWT_SECRET 未配置/);
});

test('SECURITY-REQUEST-ID-01: 复用合法请求标识并限制长度', () => {
  const req = { headers: { 'x-request-id': `  ${'x'.repeat(100)}  ` } };
  const res = response();
  let called = false;
  requestId(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.requestId.length, 80);
  assert.equal(res.headers['X-Request-Id'], req.requestId);
});

test('SECURITY-REQUEST-ID-02: 缺失请求标识时生成 UUID', () => {
  const req = { headers: {} };
  const res = response();
  requestId(req, res, () => {});
  assert.match(req.requestId, /^[0-9a-f-]{36}$/);
});

test('SECURITY-HEADERS-02: 返回完整浏览器安全响应头', () => {
  const res = response();
  securityHeaders({}, res, () => {});
  assert.equal(res.headers['Referrer-Policy'], 'no-referrer');
  assert.match(res.headers['Permissions-Policy'], /camera=\(\)/);
});
