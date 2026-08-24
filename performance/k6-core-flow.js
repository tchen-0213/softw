import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    product_list: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 20),
      duration: __ENV.DURATION || '2m'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const HEALTH_PATH = __ENV.HEALTH_PATH || '/api/health';

export default function () {
  const listRes = http.get(`${BASE_URL}/api/products?page=1&limit=20`);
  check(listRes, {
    'product list status is 200': (res) => res.status === 200,
    'product list has body': (res) => res.body && res.body.length > 0
  });

  const healthRes = http.get(`${BASE_URL}${HEALTH_PATH}`);
  check(healthRes, {
    'health endpoint is reachable': (res) => [200, 503].includes(res.status),
    'health returns body': (res) => res.body && res.body.length > 0
  });

  sleep(1);
}
