const jwt = require('jsonwebtoken');

function getJwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return process.env.JWT_SECRET;
}

function decodeToken(req) {
  const authorization = req.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    const error = new Error('未提供认证令牌');
    error.status = 401;
    throw error;
  }

  try {
    return jwt.verify(authorization.slice(7), getJwtSecret());
  } catch (cause) {
    const error = new Error('无效的认证令牌');
    error.status = 401;
    throw error;
  }
}

function requireInternalToken(req, res, next) {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected) return res.status(503).json({ message: '内部服务凭据未配置' });
  if (req.get('x-internal-token') !== expected) {
    return res.status(403).json({ message: '内部服务凭据无效' });
  }
  return next();
}

module.exports = { decodeToken, getJwtSecret, requireInternalToken };
