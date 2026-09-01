const DEFAULT_MAX_REQUESTS = 120;
const DEFAULT_WINDOW_MS = 60 * 1000;
const requestBuckets = new Map();

function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

function parseAllowedOrigins(value = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN
  || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082') {
  return String(value).split(',').map(origin => origin.trim()).filter(Boolean);
}

function matchesAllowedOrigin(origin, allowedOrigin) {
  if (origin === allowedOrigin) return true;
  const marker = '://*.';
  const markerIndex = allowedOrigin.indexOf(marker);
  if (markerIndex < 0) return false;
  try {
    const parsed = new URL(origin);
    const protocol = `${allowedOrigin.slice(0, markerIndex)}:`;
    const suffix = allowedOrigin.slice(markerIndex + marker.length);
    return parsed.protocol === protocol && !parsed.port && parsed.hostname.endsWith(`.${suffix}`);
  } catch (error) {
    return false;
  }
}

function createCors({ allowedOrigins = parseAllowedOrigins() } = {}) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin) return next();
    if (!allowedOrigins.some(allowed => matchesAllowedOrigin(origin, allowed))) {
      return res.status(403).json({ message: '请求来源不在允许列表', requestId: req.requestId });
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key, X-Request-Id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  };
}

function createRateLimiter({ windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX_REQUESTS } = {}) {
  return (req, res, next) => {
    if (['/live', '/ready', '/health', '/version'].includes(req.path)) return next();
    const now = Date.now();
    for (const [key, bucket] of requestBuckets) {
      if (bucket.resetAt <= now) requestBuckets.delete(key);
    }
    const client = req.ip || req.socket?.remoteAddress || 'unknown';
    const bucket = requestBuckets.get(client) || { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    requestBuckets.set(client, bucket);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - bucket.count, 0)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1)));
      return res.status(429).json({ message: '请求过于频繁，请稍后再试', requestId: req.requestId });
    }
    return next();
  };
}

function parseByteLimit(value, fallback = 2 * 1024 * 1024) {
  const match = String(value || '').trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb)?$/i);
  if (!match) return fallback;
  const factors = { b: 1, kb: 1024, mb: 1024 * 1024 };
  return Math.floor(Number(match[1]) * factors[(match[2] || 'b').toLowerCase()]);
}

function enforceContentLength(maxBytes) {
  return (req, res, next) => {
    const length = Number(req.get('content-length') || 0);
    if (Number.isFinite(length) && length > maxBytes) {
      return res.status(413).json({ message: '请求体超过大小限制', requestId: req.requestId });
    }
    return next();
  };
}

function validateProductionSecrets(requiredNames = ['DB_PASSWORD', 'JWT_SECRET', 'INTERNAL_SERVICE_TOKEN']) {
  if (process.env.NODE_ENV !== 'production') return;
  const weakValues = new Set(['password', 'secret', 'changeme', 'please_change_this_secret', 'your-secret-key']);
  for (const name of requiredNames) {
    const value = String(process.env[name] || '');
    if (value.length < 16 || weakValues.has(value.toLowerCase())) {
      throw new Error(`生产环境必须通过环境变量或 Secret 配置强 ${name}`);
    }
  }
}

module.exports = {
  createCors,
  createRateLimiter,
  enforceContentLength,
  matchesAllowedOrigin,
  parseAllowedOrigins,
  parseByteLimit,
  requestBuckets,
  securityHeaders,
  validateProductionSecrets
};
