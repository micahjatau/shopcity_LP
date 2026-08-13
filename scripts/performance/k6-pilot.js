import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const baseUrl = __ENV.K6_BASE_URL || 'http://127.0.0.1:3000';
const username = __ENV.K6_USERNAME || 'admin@shopcity.local';
const password = __ENV.K6_PASSWORD || 'Strong-password-123!';
const preissuedSessionToken = __ENV.K6_SESSION_TOKEN;
const preissuedCsrfToken = __ENV.K6_CSRF_TOKEN;
const cardSerial = __ENV.K6_CARD_SERIAL || 'SYNTHETIC-CARD-0001';
const customerId =
  __ENV.K6_CUSTOMER_ID || '00000000-0000-4000-8000-000000000201';
const runId = __ENV.K6_RUN_ID || `${Date.now()}`;
const reportBranchId =
  __ENV.K6_REPORT_BRANCH_ID || '00000000-0000-4000-8000-000000000203';
const earnAmountKobo = Number(__ENV.K6_EARN_AMOUNT_KOBO || '2500000');
const redeemAmountKobo = Number(__ENV.K6_REDEEM_AMOUNT_KOBO || '50000');
const isolationMultiplier = Number(
  __ENV.K6_REPORT_ISOLATION_MULTIPLIER || '1.5',
);

const syntheticFailureRate = new Rate('synthetic_failure_rate');
const invariantCheckFailures = new Counter('invariant_check_failures');

export const options = {
  scenarios: {
    card_lookup: {
      executor: 'constant-vus',
      exec: 'lookupScenario',
      vus: Number(__ENV.K6_LOOKUP_VUS || '1'),
      duration: __ENV.K6_LOOKUP_DURATION || '20s',
    },
    earn_checkout: {
      executor: 'constant-vus',
      exec: 'earnScenario',
      vus: Number(__ENV.K6_EARN_VUS || '1'),
      duration: __ENV.K6_EARN_DURATION || '20s',
      startTime: '5s',
    },
    redeem_checkout: {
      executor: 'constant-vus',
      exec: 'redeemScenario',
      vus: Number(__ENV.K6_REDEEM_VUS || '1'),
      duration: __ENV.K6_REDEEM_DURATION || '20s',
      startTime: '10s',
    },
    report_isolation: {
      executor: 'constant-vus',
      exec: 'reportIsolationScenario',
      vus: Number(__ENV.K6_REPORT_VUS || '1'),
      duration: __ENV.K6_REPORT_DURATION || '20s',
      startTime: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    synthetic_failure_rate: ['rate<0.01'],
    'http_req_duration{scenario:card_lookup}': ['p(95)<500'],
    'http_req_duration{scenario:earn_checkout}': ['p(95)<1200'],
    'http_req_duration{scenario:redeem_checkout}': ['p(95)<1200'],
    'http_req_duration{scenario:report_isolation}': [
      `p(95)<${Math.round(1200 * isolationMultiplier)}`,
    ],
    invariant_check_failures: ['count==0'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

function requestParams(data, scenario) {
  return {
    headers: {
      Authorization: `Bearer ${data.sessionToken}`,
      'x-csrf-token': data.csrfToken,
      'content-type': 'application/json',
    },
    tags: { scenario },
  };
}

export function setup() {
  const session =
    preissuedSessionToken && preissuedCsrfToken
      ? {
          sessionToken: preissuedSessionToken,
          csrfToken: preissuedCsrfToken,
          source: 'preissued',
        }
      : login();

  const verificationResponse = http.get(
    `${baseUrl}/api/v1/auth/me`,
    requestParams(session, 'auth_verify'),
  );

  assertAccessible(verificationResponse);

  if (verificationResponse.status !== 200) {
    throw new Error(
      `auth verification failed with status ${verificationResponse.status} using ${session.source} session: ${safeText(verificationResponse)}`,
    );
  }

  const cardWarmupResponse = http.get(
    `${baseUrl}/api/v1/cards/lookup/${encodeURIComponent(cardSerial)}`,
    requestParams(session, 'auth_warmup'),
  );

  if (cardWarmupResponse.status !== 200) {
    throw new Error(
      `card lookup warmup failed with status ${cardWarmupResponse.status}: ${safeText(cardWarmupResponse)}`,
    );
  }

  return {
    baseUrl,
    sessionToken: session.sessionToken,
    csrfToken: session.csrfToken,
  };
}

function login() {
  if (!password) {
    throw new Error('K6_PASSWORD is required');
  }

  const loginResponse = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({
      username,
      password,
    }),
    {
      headers: { 'content-type': 'application/json' },
      tags: { scenario: 'auth_login' },
    },
  );

  assertAccessible(loginResponse);

  if (loginResponse.status !== 200) {
    throw new Error(
      `login failed with status ${loginResponse.status}: ${safeText(loginResponse)}`,
    );
  }

  return {
    sessionToken: cookieValue(loginResponse, 'shopcity_session'),
    csrfToken: cookieValue(loginResponse, 'shopcity_csrf'),
    source: 'login',
  };
}

export function lookupScenario(data) {
  const response = http.get(
    `${data.baseUrl}/api/v1/cards/lookup/${encodeURIComponent(cardSerial)}`,
    requestParams(data, 'card_lookup'),
  );

  recordOutcome(response, 'lookup');
  sleep(1);
}

export function earnScenario(data) {
  const requestId = `synthetic-earn-${runId}-${__VU}-${__ITER}`;
  const response = http.post(
    `${data.baseUrl}/api/v1/transactions/earn`,
    JSON.stringify({
      cardSerialNumber: cardSerial,
      posReceiptNumber: requestId,
      purchaseAmountKobo: earnAmountKobo,
      occurredAt: new Date().toISOString(),
    }),
    withIdempotencyKey(data, 'earn_checkout', requestId),
  );

  recordOutcome(response, 'earn');
  sleep(1);
}

export function redeemScenario(data) {
  const requestId = `synthetic-redeem-${runId}-${__VU}-${__ITER}`;
  const response = http.post(
    `${data.baseUrl}/api/v1/transactions/redeem`,
    JSON.stringify({
      cardSerialNumber: cardSerial,
      posReceiptNumber: requestId,
      requestedRedemptionKobo: redeemAmountKobo,
      basketAmountKobo: earnAmountKobo,
      occurredAt: new Date().toISOString(),
    }),
    withIdempotencyKey(data, 'redeem_checkout', requestId),
  );

  recordOutcome(response, 'redeem');
  sleep(1);
}

export function reportIsolationScenario(data) {
  const response = http.get(
    `${data.baseUrl}/api/v1/reports/executive-summary?branchId=${encodeURIComponent(reportBranchId)}`,
    requestParams(data, 'report_isolation'),
  );

  recordOutcome(response, 'report');
  sleep(1);
}

export function teardown(data) {
  const response = http.get(
    `${data.baseUrl}/api/v1/reports/pilot-operations-summary`,
    requestParams(data, 'post_load_reconciliation'),
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
    [`${label} returned success envelope`]: (res) =>
      res.status >= 200 && res.status < 300,
  });
  syntheticFailureRate.add(!ok);
}

function withIdempotencyKey(data, scenario, requestId) {
  const params = requestParams(data, scenario);
  params.headers['idempotency-key'] = requestId;
  return params;
}

function assertAccessible(response) {
  if (
    response.status === 401 &&
    safeText(response).includes('Protected deployment')
  ) {
    throw new Error(
      `K6_BASE_URL is protected by Vercel auth; use an accessible staging URL instead: ${baseUrl}`,
    );
  }
}

function safeJson(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

function safeText(response) {
  try {
    return response.body || '';
  } catch {
    return '';
  }
}

function cookieValue(response, name) {
  const cookies = response.cookies?.[name];
  if (!cookies || cookies.length === 0 || !cookies[0]?.value) {
    throw new Error(`login response missing ${name} cookie`);
  }

  return cookies[0].value;
}
