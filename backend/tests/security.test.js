const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createRateLimiter,
  requestBuckets,
  requireProductionSecrets,
  securityHeaders
} = require('../middleware/security');
const { _internal } = require('../controllers/userController');

const createMockResponse = () => {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
};

test('security headers are attached to responses', () => {
  const req = {};
  const res = createMockResponse();
  let called = false;

  securityHeaders(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['X-Frame-Options'], 'DENY');
});

test('rate limiter blocks requests above configured threshold', () => {
  requestBuckets.clear();
  const limiter = createRateLimiter({ windowMs: 1000, max: 2, keyPrefix: 'test' });
  const req = { ip: '127.0.0.1', headers: {}, socket: {} };
  const first = createMockResponse();
  const second = createMockResponse();
  const third = createMockResponse();
  let passed = 0;

  limiter(req, first, () => { passed += 1; });
  limiter(req, second, () => { passed += 1; });
  limiter(req, third, () => { passed += 1; });

  assert.equal(passed, 2);
  assert.equal(third.statusCode, 429);
  assert.equal(third.body.message, '请求过于频繁，请稍后再试');
});

test('production mode rejects default jwt secrets', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.JWT_SECRET;

  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'please_change_this_secret';

  assert.throws(() => requireProductionSecrets(), /JWT_SECRET/);

  process.env.JWT_SECRET = 'a-secure-secret-for-test';
  assert.doesNotThrow(() => requireProductionSecrets());

  process.env.NODE_ENV = previousNodeEnv;
  process.env.JWT_SECRET = previousSecret;
});

test('UNIT-TC01: register payload validation rejects weak inputs', () => {
  assert.equal(_internal.validateRegisterPayload({
    username: 'test',
    email: 'bad-email',
    phone: '13800138000',
    password: '123456'
  }), '邮箱格式不正确');

  assert.equal(_internal.validateRegisterPayload({
    username: 'test',
    email: 'test@example.com',
    phone: '13800138000',
    password: '123'
  }), '密码长度不能少于6位');

  assert.equal(_internal.validateRegisterPayload({
    username: 'test',
    email: 'test@example.com',
    phone: '13800138000',
    password: '123456'
  }), null);
});
