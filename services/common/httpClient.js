async function requestJson(baseUrl, pathname, options = {}) {
  if (!process.env.INTERNAL_SERVICE_TOKEN) throw new Error('INTERNAL_SERVICE_TOKEN is required');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 3000));

  try {
    const response = await fetch(new URL(pathname, baseUrl), {
      method: options.method || 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN,
        ...(options.headers || {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || `依赖服务返回 HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  } catch (cause) {
    if (cause.name === 'AbortError') {
      const error = new Error('依赖服务请求超时');
      error.status = 503;
      throw error;
    }
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { requestJson };
