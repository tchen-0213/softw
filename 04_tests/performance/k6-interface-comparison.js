import http from 'k6/http';
import { check } from 'k6';

const ENDPOINT = __ENV.ENDPOINT || 'list';
const paths = {
  list: '/api/products?category=performance&page=1&limit=20&sort=price_asc',
  search: '/api/products/search?keyword=PERF-COMPARE-150&category=performance&page=1&limit=20',
  detail: '/api/products/990001'
};

if (!paths[ENDPOINT]) throw new Error(`Unsupported ENDPOINT: ${ENDPOINT}`);

export const options = {
  scenarios: {
    interface_comparison: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: __ENV.DURATION || '20s'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.99']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';

export default function () {
  const clientAddress = `198.18.${__VU}.${__ITER % 250}`;
  const response = http.get(`${BASE_URL}${paths[ENDPOINT]}`, {
    headers: { 'X-Forwarded-For': clientAddress },
    tags: { endpoint: ENDPOINT }
  });

  check(response, {
    'status is 200': (res) => res.status === 200,
    'response contains fixed dataset': (res) => {
      if (ENDPOINT === 'detail') return res.json('id') === 990001;
      return String(res.body).includes('PERF-COMPARE');
    }
  });
}
