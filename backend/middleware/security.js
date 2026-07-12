const crypto = require('crypto');

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 120;

const requestBuckets = new Map();

const getClientKey = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  || req.ip
  || req.socket?.remoteAddress
  || 'unknown'
);

const pruneBuckets = (now) => {
  for (const [key, bucket] of requestBuckets.entries()) {
    if (bucket.resetAt <= now) {
      requestBuckets.delete(key);
    }
  }
};

const requestId = (req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  req.requestId = typeof incomingId === 'string' && incomingId.trim()
    ? incomingId.trim().slice(0, 80)
    : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

const createRateLimiter = ({
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX_REQUESTS,
  keyPrefix = 'global'
} = {}) => (req, res, next) => {
  const now = Date.now();
  const key = `${keyPrefix}:${getClientKey(req)}`;

  pruneBuckets(now);

  const bucket = requestBuckets.get(key) || {
    count: 0,
    resetAt: now + windowMs
  };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  requestBuckets.set(key, bucket);

  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(max - bucket.count, 0)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > max) {
    return res.status(429).json({ message: '请求过于频繁，请稍后再试' });
  }

  return next();
};

const requireProductionSecrets = () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'your-secret-key' || jwtSecret === 'please_change_this_secret') {
    throw new Error('生产环境必须配置安全的 JWT_SECRET');
  }
};

module.exports = {
  createRateLimiter,
  requestBuckets,
  requestId,
  requireProductionSecrets,
  securityHeaders
};

