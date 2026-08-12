import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const baseUrl = __ENV.K6_BASE_URL || 'http://127.0.0.1:3000';
const csrfToken = __ENV.K6_CSRF_TOKEN || 'synthetic-csrf-token';
const bearerToken = __ENV.K6_BEARER_TOKEN || 'synthetic-session-token';
const cardSerial = __ENV.K6_CARD_SERIAL || 'SYNTHETIC-CARD-0001';
const customerId = __ENV.K6_CUSTOMER_ID || '00000000-0000-4000-8000-000000000201';
const deviceId = __ENV.K6_DEVICE_ID || '00000000-0000-4000-8000-000000000202';
const reportBranchId = __ENV.K6_REPORT_BRANCH_ID || '00000000-0000-4000-8000-000000000203';
const earnAmountKobo = Number(__ENV.K6_EARN_AMOUNT_KOBO || '250000');
const redeemAmountKobo = Number(__ENV.K6_REDEEM_AMOUNT_KOBO || '50000');
const isolationMultiplier = Number(__ENV.K6_REPORT_ISOLATION_MULTIPLIER || '1.5');

const syntheticFailureRate = new Rate('synthetic_failure_rate');
const invariantCheckFailures = new Counter('invariant_check_failures');

export const options = {
  scenarios: {
    card_lookup: {
      executor: 'constant-vus',
      exec: 'lookupScenario',
      vus: Number(__ENV.K6_LOOKUP_VUS || '5'),
      duration: __ENV.K6_LOOKUP_DURATION || '30s',
    },
    earn_checkout: {
      executor: 'constant-vus',
      exec: 'earnScenario',
      vus: Number(__ENV.K6_EARN_VUS || '3'),
      duration: __ENV.K6_EARN_DURATION || '30s',
      startTime: '5s',
    },
    redeem_checkout: {
      executor: 'constant-vus',
      exec: 'redeemScenario',
      vus: Number(__ENV.K6_REDEEM_VUS || '3'),
      duration: __ENV.K6_REDEEM_DURATION || '30s',
      startTime: '10s',
    },
    report_isolation: {
      executor: 'constant-vus',
      exec: 'reportIsolationScenario',
      vus: Number(__ENV.K6_REPORT_VUS || '2'),
      duration: __ENV.K6_REPORT_DURATION || '30s',
      startTime: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    synthetic_failure_rate: ['rate<0.01'],
    'http_req_duration{scenario:card_lookup}': ['p(95)<500'],
    'http_req_duration{scenario:earn_checkout}': ['p(95)<1200'],
    'http_req_duration{scenario:redeem_checkout}': ['p(95)<1200'],
    'http_req_duration{scenario:report_isolation}': [`p(95)<${Math.round(1200 * isolationMultiplier)}`],
    invariant_check_failures: ['count==0'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

function headers() {
  return {
    Authorization: `Bearer ${bearerToken}`,
    'x-csrf-token': csrfToken,
    'content-type': 'application/json',
  };
}

export function setup() {
  return {
    baseUrl,
    headers: headers(),
  };
}

export function lookupScenario(data) {
  const response = http.get(
    `${data.baseUrl}/api/v1/cards/lookup/${encodeURIComponent(cardSerial)}`,
    { headers: data.headers, tags: { scenario: 'card_lookup' } },
  );

  recordOutcome(response, 'lookup');
  sleep(1);
}

export function earnScenario(data) {
  const requestId = `synthetic-earn-${__VU}-${__ITER}`;
  const response = http.post(
    `${data.baseUrl}/api/v1/transactions/earn`,
    JSON.stringify({
      cardSerialNumber: cardSerial,
      deviceId,
      posReceiptNumber: requestId,
      purchaseAmountKobo: earnAmountKobo,
      occurredAt: new Date().toISOString(),
    }),
    {
      headers: {
        ...data.headers,
        'idempotency-key': requestId,
      },
      tags: { scenario: 'earn_checkout' },
    },
  );

  recordOutcome(response, 'earn');
  sleep(1);
}

export function redeemScenario(data) {
  const requestId = `synthetic-redeem-${__VU}-${__ITER}`;
  const response = http.post(
    `${data.baseUrl}/api/v1/transactions/redeem`,
    JSON.stringify({
      cardSerialNumber: cardSerial,
      deviceId,
      requestedAmountKobo: redeemAmountKobo,
      basketAmountKobo: earnAmountKobo,
      occurredAt: new Date().toISOString(),
    }),
    {
      headers: {
        ...data.headers,
        'idempotency-key': requestId,
      },
      tags: { scenario: 'redeem_checkout' },
    },
  );

  recordOutcome(response, 'redeem');
  sleep(1);
}

export function reportIsolationScenario(data) {
  const response = http.get(
    `${data.baseUrl}/api/v1/reports/executive-summary?branchId=${encodeURIComponent(reportBranchId)}`,
    { headers: data.headers, tags: { scenario: 'report_isolation' } },
  );

  recordOutcome(response, 'report');
  sleep(1);
}

export function teardown(data) {
  const response = http.get(
    `${data.baseUrl}/api/v1/reports/pilot-operations-summary`,
    { headers: data.headers, tags: { scenario: 'post_load_reconciliation' } },
  );

  const ok = check(response, {
    'pilot operations summary returned 200': (res) => res.status === 200,
    'pilot reconciliation remains healthy': (res) => {
      const body = safeJson(res);
      return body?.data?.reconciliation?.healthy === true;
    },
  });

  if (!ok) {
    invariantCheckFailures.add(1);
  }
}

export function handleSummary(summary) {
  return {
    'tmp/k6-pilot-summary.json': JSON.stringify(summary, null, 2),
  };
}

function recordOutcome(response, label) {
  const ok = check(response, {
    [`${label} returned success envelope`]: (res) => res.status >= 200 && res.status < 300,
  });
  syntheticFailureRate.add(!ok);
}

function safeJson(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}
