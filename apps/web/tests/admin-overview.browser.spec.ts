import { expect, test, type Page, type Route } from '@playwright/test';

const adminSession = {
  user: {
    id: 'admin-browser-test',
    username: 'admin@example.test',
    role: 'ADMIN',
    branchId: null,
  },
  session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
};

function envelope(path: string, data: unknown) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      path,
      requestId: 'admin-overview-browser-test',
    },
  };
}

async function mockAdminApis(page: Page) {
  const requests = new Map<string, number>();
  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    requests.set(path, (requests.get(path) ?? 0) + 1);
    let data: unknown;

    if (path === '/api/v1/auth/me') {
      data = adminSession;
    } else if (path === '/api/v1/config/public') {
      data = {
        tenant: { id: 'tenant-1', name: 'ShopCity' },
        branch: {
          id: 'branch-1',
          name: 'Main branch',
          timezone: 'Africa/Lagos',
          receiptWeekStartDay: 1,
        },
        policies: {
          defaultEarnRateBps: 500,
          minRedemptionKobo: 1000,
          maxRedemptionBasketPercent: 50,
          purchaseFlagThresholdKobo: 100000,
          purchaseApprovalThresholdKobo: 200000,
          redemptionApprovalThresholdKobo: 100000,
          offlineRedemptionDisabled: false,
        },
      };
    } else if (path === '/api/v1/reports/executive-summary') {
      const from = url.searchParams.get('from') ?? '2026-10-20';
      const to = url.searchParams.get('to') ?? '2026-10-26';
      data = {
        scope: 'TENANT',
        scopeKey: 'tenant-1',
        branchId: null,
        timezone: 'Africa/Lagos',
        items: [
          {
            reportDate: `${from}T00:00:00.000Z`,
            activeCustomers: 25,
            registeredCustomers: 80,
            creditIssuedKobo: 120000,
            creditRedeemedKobo: 45000,
            outstandingLiabilityKobo: 900000,
          },
          {
            reportDate: `${to}T00:00:00.000Z`,
            activeCustomers: 27,
            registeredCustomers: 83,
            creditIssuedKobo: 70000,
            creditRedeemedKobo: 30000,
            outstandingLiabilityKobo: 940000,
          },
        ],
      };
    } else if (path === '/api/v1/reports/materialization-state') {
      data = {
        scope: 'TENANT',
        scopeKey: 'tenant-1',
        branchId: null,
        timezone: 'Africa/Lagos',
        items: [
          {
            status: 'COMPLETED',
            materializedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };
    } else if (path === '/api/v1/approvals') {
      data = { items: [], totalCount: 4, nextCursor: null, hasMore: false };
    } else if (path === '/api/v1/audit-logs') {
      data = [
        {
          id: 'event-1',
          action: 'card.status',
          entityType: 'card',
          entityId: 'card-private-id',
          actorId: 'actor-private-id',
          createdAt: new Date(Date.now() - 6 * 60_000).toISOString(),
        },
      ];
    } else {
      data = {};
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(path, data)),
    });
  });
  return requests;
}

test('Admin Overview matches the six-card/chart layout at desktop and 320px', async ({
  page,
}) => {
  const requests = await mockAdminApis(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin');

  const overview = page.getByRole('region', { name: 'Overview' });
  await expect(
    overview.getByRole('heading', { name: 'Overview', level: 1 }),
  ).toBeVisible();
  await expect(
    overview.getByRole('heading', { name: 'Active customers' }),
  ).toBeVisible();
  await expect(
    overview.getByRole('heading', { name: 'Credit issued vs redeemed' }),
  ).toBeVisible();
  await expect(
    overview.getByRole('heading', { name: 'Customer registrations' }),
  ).toBeVisible();
  await expect(
    overview.getByRole('heading', { name: 'Recent activity' }),
  ).toBeVisible();
  await expect(
    overview.locator('[aria-label="Key metrics"] > article'),
  ).toHaveCount(6);
  await expect(
    overview.getByRole('heading', { name: 'Virtual card status changed' }),
  ).toBeVisible();
  await expect(overview.getByText('Report materialized')).toBeVisible();
  await expect(page.locator('.shell-sidebar--admin')).toHaveCSS(
    'border-top-right-radius',
    '16px',
  );
  await expect
    .poll(() => requests.get('/api/v1/reports/executive-summary'))
    .toBe(1);
  await expect
    .poll(() => requests.get('/api/v1/reports/materialization-state'))
    .toBe(1);
  await expect.poll(() => requests.get('/api/v1/approvals')).toBe(1);
  await expect.poll(() => requests.get('/api/v1/audit-logs')).toBe(1);
  await page.screenshot({
    path: '/tmp/shopcity-admin-overview-desktop.png',
    fullPage: true,
  });

  await page.setViewportSize({ width: 320, height: 860 });
  await expect(
    overview.getByRole('heading', { name: 'Overview', level: 1 }),
  ).toBeVisible();
  await expect(
    overview.getByRole('heading', { name: 'Recent activity' }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(320);
  await expect(overview.locator('[class*="xAxisLabels"] span')).toHaveCount(7);
  await page.screenshot({
    path: '/tmp/shopcity-admin-overview-mobile-320.png',
    fullPage: true,
  });
});
