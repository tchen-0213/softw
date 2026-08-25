import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '90s', target: 40 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.05']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:30081';

export default function () {
  const response = http.get(`${BASE_URL}/api/products?burnMs=120`);
  check(response, {
    'product burn endpoint returns 200': (res) => res.status === 200
  });
  sleep(0.1);
}
