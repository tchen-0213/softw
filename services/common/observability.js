const { AsyncLocalStorage } = require('async_hooks');
const { randomUUID } = require('crypto');

const requestStorage = new AsyncLocalStorage();
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;

function normalizeRequestId(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

function sanitizeText(value) {
  return String(value || '')
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/((?:password|passwd|secret|token|authorization|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/(mysql:\/\/[^:/\s]+:)[^@\s]+@/gi, '$1[REDACTED]@')
    .slice(0, 500);
}

function writeLog(logger, record) {
  const output = JSON.stringify(record);
  if (typeof logger === 'function') logger(output);
  else console.log(output);
}

function requestContext({ service, logger } = {}) {
  return (req, res, next) => {
    const requestId = normalizeRequestId(req.get?.('x-request-id') || req.headers?.['x-request-id']);
    const startedAt = process.hrtime.bigint();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    requestStorage.run({ requestId, service }, () => {
      res.once('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        writeLog(logger, {
          timestamp: new Date().toISOString(),
          level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
          event: 'http_request',
          service,
          requestId,
          method: req.method,
          path: String(req.originalUrl || req.url || '').split('?')[0],
          statusCode: res.statusCode,
          durationMs: Number(durationMs.toFixed(3))
        });
      });
      next();
    });
  };
}

function logError({ service, requestId, error, statusCode = 500, logger }) {
  writeLog(logger, {
    timestamp: new Date().toISOString(),
    level: 'error',
    event: 'request_error',
    service,
    requestId: requestId || getRequestId() || 'unknown',
    statusCode,
    errorName: sanitizeText(error?.name || 'Error'),
    errorMessage: sanitizeText(error?.message || 'unknown error')
  });
}

function getRequestId() {
  return requestStorage.getStore()?.requestId;
}

module.exports = {
  getRequestId,
  logError,
  normalizeRequestId,
  requestContext,
  sanitizeText
};
