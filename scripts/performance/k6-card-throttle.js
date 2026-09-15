import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.K6_BASE_URL || 'http://127.0.0.1:3000';
const sessionToken = __ENV.K6_SESSION_TOKEN;
const csrfToken = __ENV.K6_CSRF_TOKEN;
const cardSerial = __ENV.K6_CARD_SERIAL || 'SYNTHETIC-CARD-0001';

export const options = {
  vus: 1,
  iterations: 31,
  thresholds: { http_req_failed: ['rate<1'] },
};

export default function () {
  const response = http.get(
    `${baseUrl}/api/v1/cards/lookup/${encodeURIComponent(cardSerial)}`,
    {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'x-csrf-token': csrfToken,
      },
    },
  );
  check(response, {
    'lookup is authorized or throttled': (res) =>
      res.status === 200 || res.status === 404 || res.status === 429,
  });
}
