import { expect, test, type Page, type Route } from '@playwright/test';

const mockSession = (role: 'SUPERVISOR' | 'ADMIN') => ({
  user: {
    id: `${role.toLowerCase()}-visual-1`,
    username: `${role.toLowerCase()}@shopcity.local`,
    role,
    branchId: 'branch-visual-1',
  },
  session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
});

test('reviews operational reports at desktop, tablet, and mobile widths', async ({
  page,
}) => {
  await mockSupervisorReports(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/supervisor/reports');
  await expect(page.locator('.shell-loading-screen')).toBeHidden();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Operational reports' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Branch at a glance' }),
  ).toBeVisible();
  await expect(page.getByText(/Fresh · Updated/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy Branch ID: branch-visual-1' }),
  ).toHaveCount(2);
  await expect(page.getByRole('table').first()).toBeVisible();
  await expect(
    page.getByRole('table').first().getByRole('columnheader'),
  ).toHaveCount(6);
  await expect(page.getByText('₦4,500.00').first()).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Selected report item' })
      .getByText('Credit expired'),
  ).toBeVisible();
  await expect(page.locator('.supervisor-reports-page')).toHaveCSS(
    'background-color',
    'rgb(246, 244, 245)',
  );
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
  await expect(page.getByRole('option', { name: 'Audit report' })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('option', { name: 'Pilot operations summary' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Refresh materialization' }),
  ).toHaveCount(0);
  await page.screenshot({
    path: '/tmp/shopcity-supervisor-reports-desktop-top.png',
    fullPage: false,
  });

  const content = page.locator('.supervisor-reports-page');
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(content).toBeVisible();
    const dimensions = await content.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    if (width === 390) {
      await expect(
        page.getByRole('link', { name: 'Back to supervisor' }),
      ).toBeVisible();
      await page.screenshot({
        path: '/tmp/shopcity-supervisor-reports-mobile-top.png',
        fullPage: false,
      });
    }
  }

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(
    page.getByRole('heading', { name: 'Report results' }),
  ).toBeVisible();
  await page.screenshot({
    path: '/tmp/shopcity-supervisor-reports-desktop-bottom.png',
    fullPage: false,
  });
});

test('maps role-authorized reports and scope controls to Admin', async ({
  page,
}) => {
  const requests: Array<{ method: string; url: string }> = [];
  page.on('request', (request) =>
    requests.push({ method: request.method(), url: request.url() }),
  );
  await mockSupervisorReports(page, 'ADMIN');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/admin/reports');
  await expect(page.locator('.shell-loading-screen')).toBeHidden();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Operational reports' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Tenant at a glance' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to admin' })).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'Audit report' }),
  ).toBeAttached();
  await expect(
    page.getByRole('option', { name: 'Pilot operations summary' }),
  ).toBeAttached();
  await expect(
    page.getByRole('button', { name: 'Refresh materialization' }),
  ).toBeEnabled();

  await page.getByLabel('Admin branch filter').fill('branch-visual-1');
  await page.getByLabel('Admin timezone filter').fill('Africa/Lagos');
  await page.getByRole('button', { name: 'Apply scope' }).click();
  await expect(
    page.getByRole('heading', { name: 'Branch at a glance' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      requests.some((request) => {
        const url = new URL(request.url);
        return (
          url.pathname === '/api/v1/reports/executive-summary' &&
          url.searchParams.get('branchId') === 'branch-visual-1' &&
          url.searchParams.get('timezone') === 'Africa/Lagos'
        );
      }),
    )
    .toBe(true);
  await expect(
    page
      .locator('[aria-label="Report scope and filters"]')
      .getByText('BRANCH', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('[aria-label="Report scope and filters"]')
      .getByText('branch-visual-1', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Refresh materialization' }).click();
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.method === 'POST' &&
          request.url.includes('/api/v1/reports/executive-summary/refresh'),
      ),
    )
    .toBe(true);
  const refreshRequest = requests.find(
    (request) =>
      request.method === 'POST' &&
      request.url.includes('/api/v1/reports/executive-summary/refresh'),
  );
  expect(refreshRequest).toBeDefined();
  expect(
    refreshRequest
      ? new URL(refreshRequest.url).searchParams.get('branchId')
      : null,
  ).toBe('branch-visual-1');

  await page
    .getByRole('combobox', { name: 'Report', exact: true })
    .selectOption('audit-report');
  await expect(
    page.getByRole('heading', { name: 'Audit report', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      requests.some((request) =>
        request.url.includes('/api/v1/reports/audit-report'),
      ),
    )
    .toBe(true);
  const auditRequest = requests.find((request) =>
    request.url.includes('/api/v1/reports/audit-report'),
  );
  const auditUrl = auditRequest ? new URL(auditRequest.url) : null;
  expect(auditUrl).not.toBeNull();
  expect(auditUrl?.searchParams.has('branchId')).toBe(false);
  await expect(
    page
      .locator('[aria-label="Report scope and filters"]')
      .getByText('TENANT', { exact: true }),
  ).toBeVisible();

  await page
    .getByRole('combobox', { name: 'Report', exact: true })
    .selectOption('pilot-operations-summary');
  await expect(
    page.getByRole('heading', { name: 'Pilot operations summary' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      requests.some((request) =>
        request.url.includes('/api/v1/reports/pilot-operations-summary'),
      ),
    )
    .toBe(true);
  await expect(
    page
      .locator('[aria-label="Report scope and filters"]')
      .getByText('TENANT', { exact: true }),
  ).toBeVisible();

  const content = page.locator('.supervisor-reports-page');
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    const dimensions = await content.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: '/tmp/shopcity-admin-reports-desktop.png',
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 960 });
  await expect(page.getByRole('link', { name: 'Back to admin' })).toBeVisible();
  await page.screenshot({
    path: '/tmp/shopcity-admin-reports-mobile.png',
    fullPage: false,
  });
});

async function mockSupervisorReports(
  page: Page,
  role: 'SUPERVISOR' | 'ADMIN' = 'SUPERVISOR',
) {
  await page.route('**/api/v1/**', async (route) => {
    const { pathname, searchParams } = new URL(route.request().url());
    const path = pathname.replace(/^\/api\/v1/, '');

    if (path === '/auth/me') {
      return fulfill(route, {
        success: true,
        data: mockSession(role),
        meta: meta(path),
      });
    }
    if (path === '/auth/refresh' || path === '/auth/logout') {
      return fulfill(route, {
        success: true,
        data: null,
        meta: meta(path),
      });
    }
    if (path === '/config/public') {
      return fulfill(route, {
        success: true,
        data: {
          tenant: { id: 'tenant-visual-1', name: 'ShopCity' },
          branch: {
            id: 'branch-visual-1',
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
        },
        meta: meta(path),
      });
    }
    if (path.startsWith('/reports/')) {
      if (path.endsWith('/refresh') && route.request().method() === 'POST') {
        return fulfill(
          route,
          {
            success: true,
            data: { status: 'accepted' },
            meta: meta(path),
          },
          202,
        );
      }
      if (path === '/reports/pilot-operations-summary') {
        return fulfill(route, {
          success: true,
          data: {
            release: {
              version: '1.0.0',
              sha: 'abc123',
              sentryConfigured: false,
            },
            generatedAt: new Date().toISOString(),
            outbox: { backlogCount: 1, staleCount: 0 },
            sms: { failedCount: 0 },
            offlineSync: { failureCount: 0 },
            fraud: { openCount: 0 },
            reports: { staleCount: 0 },
            reconciliation: { healthy: true, mismatchCount: 0 },
          },
          meta: meta(path),
        });
      }
      if (path.endsWith('/export')) {
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'text/csv; charset=utf-8' },
          body: 'report,value\nexample,1\n',
        });
      }
      const reportDate =
        searchParams.get('to') ?? new Date().toISOString().slice(0, 10);
      const isTenantReport =
        role === 'ADMIN' &&
        (!searchParams.has('branchId') || path === '/reports/audit-report');
      const financialRow = {
        branchId: isTenantReport ? null : 'branch-visual-1',
        reportDate: `${reportDate}T00:00:00.000Z`,
        materializedAt: new Date().toISOString(),
        loyaltyPurchaseValueKobo: 450000,
        creditIssuedKobo: 12000,
        creditRedeemedKobo: 3000,
        creditExpiredKobo: 200,
        outstandingLiabilityKobo: 125000,
        registeredCustomers: 41,
        activeCustomers: 28,
        transactionCount: 12,
      };
      const items =
        path === '/reports/cashier-activity'
          ? [
              {
                cashierId: 'cashier-visual-1',
                transactionCount: 12,
                duplicateAttempts: 0,
              },
            ]
          : path === '/reports/redemption-summary'
            ? [
                {
                  redemptionCount: 2,
                  confirmedKobo: 3000,
                  pendingApprovalCount: 0,
                },
              ]
            : path === '/reports/sms-operations'
              ? [
                  {
                    queuedCount: 3,
                    sentCount: 2,
                    deliveredCount: 2,
                    failedCount: 0,
                  },
                ]
              : path === '/reports/materialization-state'
                ? [
                    {
                      status: 'COMPLETED',
                      materializedAt: financialRow.materializedAt,
                    },
                  ]
                : [financialRow];
      return fulfill(route, {
        success: true,
        data: {
          scope: isTenantReport ? 'TENANT' : 'BRANCH',
          scopeKey: isTenantReport ? 'tenant-visual-1' : 'branch-visual-1',
          branchId: isTenantReport ? null : 'branch-visual-1',
          timezone: searchParams.get('timezone') ?? 'Africa/Lagos',
          items,
        },
        meta: meta(path),
      });
    }
    return fulfill(route, {
      success: true,
      data: { items: [] },
      meta: meta(path),
    });
  });
}

async function fulfill(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function meta(path: string) {
  return {
    timestamp: new Date().toISOString(),
    path,
    requestId: 'req-supervisor-report-visual',
  };
}
