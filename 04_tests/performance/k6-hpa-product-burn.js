import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 4 },
    { duration: '75s', target: 12 },
    { duration: '15s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:30081';
const BURN_MS = __ENV.BURN_MS || '80';

export default function () {
  const response = http.get(`${BASE_URL}/api/products?burnMs=${BURN_MS}`);
  check(response, {
    'product burn endpoint returns 200': (res) => res.status === 200,
    'product response remains valid': (res) => String(res.body).includes('products')
  });
  sleep(0.05);
}
