import { createHmac, randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const liveEnabled = process.env.SHOPCITY_LIVE_E2E === '1';
const backendBaseUrl =
  process.env.SHOPCITY_BACKEND_URL ?? 'http://127.0.0.1:3000';
const frontendBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';
const adminUsername =
  process.env.SHOPCITY_LIVE_ADMIN_USERNAME ?? 'admin@shopcity.local';
const adminPassword = process.env.SHOPCITY_LIVE_ADMIN_PASSWORD;
const cashierUsername =
  process.env.SHOPCITY_LIVE_CASHIER_USERNAME ?? 'cashier-live@shopcity.local';
const supervisorUsername =
  process.env.SHOPCITY_LIVE_SUPERVISOR_USERNAME ??
  'supervisor-live@shopcity.local';

function requireLive() {
  test.skip(
    !liveEnabled,
    'Set SHOPCITY_LIVE_E2E=1 to run the backend-connected E2E suite.',
  );

  if (!adminPassword) {
    throw new Error('SHOPCITY_LIVE_ADMIN_PASSWORD is required for live E2E.');
  }
}

function getAdminPassword() {
  if (!adminPassword) {
    throw new Error('SHOPCITY_LIVE_ADMIN_PASSWORD is required for live E2E.');
  }

  return adminPassword;
}

test.describe('backend-connected frontend flows', () => {
  test.beforeEach(() => {
    requireLive();
  });

  test('authenticates against a live backend and gates shells by role', async ({
    page,
  }) => {
    await ensureSeeded(page);

    await login(page, adminUsername, getAdminPassword());
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole('heading', { name: /admin shell/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: /primary/i }),
    ).toContainText(/admin/i);

    await page.goto('/cashier');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole('heading', { name: /admin shell/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', {
        name: /sign in to the shopcity retail operations shell/i,
      }),
    ).toBeVisible();
  });

  test('rejects invalid credentials and revokes live sessions', async ({
    page,
  }) => {
    await ensureSeeded(page);

    await login(page, adminUsername, 'wrong-password', 401);

    await login(page, adminUsername, getAdminPassword());
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (cookie) => cookie.name === 'shopcity_session',
    )?.value;
    const csrfCookie = cookies.find(
      (cookie) => cookie.name === 'shopcity_csrf',
    )?.value;

    expect(sessionCookie).toBeTruthy();
    expect(csrfCookie).toBeTruthy();

    const logoutResponse = await page.request.post('/api/v1/auth/logout', {
      headers: {
        Cookie: `shopcity_session=${sessionCookie}; shopcity_csrf=${csrfCookie}`,
        'x-csrf-token': csrfCookie ?? '',
      },
    });
    expect(logoutResponse.status()).toBe(200);

    const revokedSessionCheck = await page.request.get(
      `${backendBaseUrl}/api/v1/auth/me`,
      {
        headers: { Cookie: `shopcity_session=${sessionCookie}` },
      },
    );
    expect(revokedSessionCheck.status()).toBe(401);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', {
        name: /sign in to the shopcity retail operations shell/i,
      }),
    ).toBeVisible();
  });

  test('submits earn, redeem, approvals and admin changes against the backend', async ({
    page,
  }) => {
    await ensureSeeded(page);

    const adminSession = await login(page, adminUsername, getAdminPassword());
    const uniqueSuffix = Date.now().toString(36);
    const cashierAccount = `cashier-live-${uniqueSuffix}@shopcity.local`;
    const supervisorAccount = `supervisor-live-${uniqueSuffix}@shopcity.local`;
    const cashierPassword = 'Live-cashier-123!';
    const supervisorPassword = 'Live-supervisor-123!';

    const branch = await apiJson(page, '/api/v1/branches', adminSession, {
      method: 'POST',
      body: {
        name: `Live E2E Branch ${uniqueSuffix}`,
        timezone: 'Africa/Lagos',
        receiptWeekStartDay: 1,
      },
    });
    expect(branch.success).toBe(true);
    const liveBranchId = branch.data.id as string;

    const device = await apiJson(page, '/api/v1/devices', adminSession, {
      method: 'POST',
      body: {
        branchId: liveBranchId,
        name: `Live POS ${uniqueSuffix}`,
        fingerprintHash: `device-fingerprint-${uniqueSuffix}`,
      },
    });
    expect(device.success).toBe(true);

    const cashier = await apiJson(page, '/api/v1/users', adminSession, {
      method: 'POST',
      body: {
        username: cashierAccount,
        password: cashierPassword,
        role: 'CASHIER',
        branchId: liveBranchId,
      },
    });
    expect(cashier.success).toBe(true);

    const supervisor = await apiJson(page, '/api/v1/users', adminSession, {
      method: 'POST',
      body: {
        username: supervisorAccount,
        password: supervisorPassword,
        role: 'SUPERVISOR',
        branchId: liveBranchId,
      },
    });
    expect(supervisor.success).toBe(true);

    const customer = await apiJson(page, '/api/v1/customers', adminSession, {
      method: 'POST',
      body: {
        fullName: `Live E2E Customer ${uniqueSuffix}`,
        phone: `+234800${Date.now().toString().slice(-7).padStart(7, '0')}`,
        branchId: liveBranchId,
      },
    });
    expect(customer.success).toBe(true);

    const customerId = customer.data.id as string;
    const card = await apiJson(page, '/api/v1/cards', adminSession, {
      method: 'POST',
      body: {
        customerId,
        serialNumber: `CARD-LIVE-${Date.now()}`,
      },
    });
    expect(card.success).toBe(true);

    const cardSerialNumber = card.data.serialNumber as string;

    const cashierSession = await login(
      page,
      cashierAccount,
      cashierPassword,
      200,
      {
        id: device.data.id as string,
        attestationSecret: device.data.attestationSecret as string,
      },
    );
    await page.goto('/cashier');
    await expect(
      page.getByRole('heading', { name: /cashier shell/i }),
    ).toBeVisible();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/cashier$/);
    await expect(
      page.getByRole('heading', { name: /cashier shell/i }),
    ).toBeVisible();

    const earn = await apiJson(
      page,
      '/api/v1/transactions/earn',
      cashierSession,
      {
        method: 'POST',
        body: {
          cardSerialNumber,
          posReceiptNumber: `RCPT-${Date.now()}`,
          purchaseAmountKobo: 30_000_000,
          occurredAt: formatDateTimeLocal(new Date(Date.now() - 5 * 60_000)),
        },
      },
    );
    expect(earn.success).toBe(true);

    const approvalId = earn.data.approvalId as string | null;
    if (approvalId) {
      const approvalDecision = await apiJson(
        page,
        `/api/v1/approvals/${approvalId}/decision`,
        adminSession,
        {
          method: 'POST',
          body: {
            decision: 'APPROVED',
            reason: 'live e2e approval',
          },
        },
      );
      expect(approvalDecision.success).toBe(true);
    }

    const redeem = await apiJson(
      page,
      '/api/v1/transactions/redeem',
      cashierSession,
      {
        method: 'POST',
        body: {
          cardSerialNumber,
          posReceiptNumber: `RDM-${Date.now()}`,
          basketAmountKobo: 2_000_000,
          requestedRedemptionKobo: 550_000,
          occurredAt: formatDateTimeLocal(new Date(Date.now() - 2 * 60_000)),
        },
      },
    );
    expect(redeem.success).toBe(true);

    const supervisorSession = await login(
      page,
      supervisorAccount,
      supervisorPassword,
    );
    await page.goto('/supervisor');
    await expect(
      page.getByRole('heading', { name: /supervisor shell/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: /approvals panel/i }),
    ).toContainText(/loaded/i);
    await expect(
      page.getByRole('article', { name: /fraud review/i }),
    ).toContainText(/loaded/i);

    const fraudReview = page.getByRole('article', { name: /fraud review/i });
    const fraudDecision = fraudReview.getByRole('button', {
      name: /submit decision/i,
    });
    if (await fraudDecision.isEnabled()) {
      await fraudDecision.click();
      await expect(fraudReview).toContainText(/decision sent/i);
    } else {
      await expect(fraudReview).toContainText(
        /no fraud flags|loaded 0 fraud flags|fraud flags unavailable/i,
      );
    }

    await applySession(page, adminSession.cookies);
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { name: /admin shell/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: /admin contracts/i }),
    ).toContainText(/loaded/i);
  });
});

async function ensureSeeded(page: Page) {
  const response = await page.request.get(`${backendBaseUrl}/api/v1/auth/me`);
  if (response.status() === 200 || response.status() === 401) {
    return;
  }

  throw new Error(
    `Live backend is not ready at ${backendBaseUrl}; run the backend and seed it before enabling SHOPCITY_LIVE_E2E.`,
  );
}

async function applySession(
  page: Page,
  cookies: Array<{ name: string; value: string }>,
) {
  if (cookies.length === 0) {
    return;
  }

  await page.context().addCookies(
    cookies.map((cookie) => ({
      domain: '127.0.0.1',
      path: '/',
      name: cookie.name,
      value: cookie.value,
    })),
  );

  const csrfCookie = cookies.find((cookie) => cookie.name === 'shopcity_csrf');
  if (csrfCookie) {
    await page.evaluate(({ name, value }) => {
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
    }, csrfCookie);
  }
}

async function login(
  page: Page,
  username: string,
  password: string,
  expectedStatus: 200 | 401 = 200,
  device?: { id: string; attestationSecret: string },
) {
  await page.goto('/login');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (device) {
    headers['x-device-id'] = device.id;
    headers['x-device-attestation'] = buildDeviceAttestation(
      device.id,
      device.attestationSecret,
    );
  }

  const response = await page.request.post(
    `${backendBaseUrl}/api/v1/auth/login`,
    {
      data: JSON.stringify({ username, password }),
      headers,
    },
  );

  expect(response.status()).toBe(expectedStatus);

  const setCookieHeaders =
    response.status() === 200
      ? response
          .headersArray()
          .filter(({ name }) => name.toLowerCase() === 'set-cookie')
          .map(({ value }) => value)
      : [];
  const cookies = setCookieHeaders.flatMap(parseSetCookie).filter(Boolean);

  if (cookies.length > 0) {
    await page.context().addCookies(
      cookies.map((cookie) => ({
        domain: '127.0.0.1',
        path: '/',
        name: cookie.name,
        value: cookie.value,
      })),
    );

    const csrfCookie = cookies.find(
      (cookie) => cookie.name === 'shopcity_csrf',
    );
    if (csrfCookie) {
      await page.evaluate(({ name, value }) => {
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
      }, csrfCookie);

      const cookieHeader = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      await page.unroute('**/api/v1/**').catch(() => undefined);
      await page.route('**/api/v1/**', async (route) => {
        const request = route.request();
        const headers = {
          ...request.headers(),
          Cookie: cookieHeader,
          'x-csrf-token': csrfCookie.value,
          ...(request.method() === 'GET' || request.method() === 'HEAD'
            ? {}
            : { 'Idempotency-Key': randomUUID() }),
        };
        await route.continue({ headers });
      });
    }
  }

  return {
    response,
    cookies,
  };
}

function parseSetCookie(header: string) {
  const [nameValue] = header.split(';').map((part) => part.trim());
  const [name, ...valueParts] = nameValue.split('=');
  if (!name) {
    return [] as Array<{ name: string; value: string }>;
  }

  return [
    {
      name,
      value: valueParts.join('='),
    },
  ];
}

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildDeviceAttestation(deviceId: string, attestationSecret: string) {
  const timestamp = Date.now();
  const nonce = randomUUID();
  const signature = createHmac('sha256', attestationSecret)
    .update(`${deviceId}.${timestamp}.${nonce}`)
    .digest('base64url');

  return `${timestamp}.${nonce}.${signature}`;
}

async function apiJson(
  page: Page,
  path: string,
  auth: { cookies: Array<{ name: string; value: string }> },
  init: { method: 'POST' | 'PATCH' | 'PUT'; body: Record<string, unknown> },
) {
  const csrf = auth.cookies.find(
    (cookie) => cookie.name === 'shopcity_csrf',
  )?.value;
  const cookieHeader = auth.cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  return page.request
    .fetch(`${backendBaseUrl}${path}`, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        ...(csrf ? { 'x-csrf-token': csrf } : {}),
        'Idempotency-Key': randomUUID(),
      },
      data: init.body,
    })
    .then(async (response) => {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    });
}
