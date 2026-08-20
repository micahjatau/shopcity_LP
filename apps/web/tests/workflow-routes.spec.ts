import { expect, test, type Page } from '@playwright/test';

const sessionByRole = {
  CASHIER: {
    user: {
      id: 'cashier-1',
      username: 'cashier@shopcity.local',
      role: 'CASHIER',
      branchId: 'branch-1',
    },
    session: { expiresAt: '2030-01-01T00:00:00.000Z' },
  },
  SUPERVISOR: {
    user: {
      id: 'supervisor-1',
      username: 'supervisor@shopcity.local',
      role: 'SUPERVISOR',
      branchId: 'branch-1',
    },
    session: { expiresAt: '2030-01-01T00:00:00.000Z' },
  },
} as const;

test.describe('workflow route coverage', () => {
  test('covers cashier customers and sync routes', async ({ page }) => {
    await mockShell(page, 'CASHIER');

    await page.goto('/cashier/customers');
    await expect(
      page.getByRole('heading', { name: /customers/i }),
    ).toBeVisible();
    await expect(page.getByText(/read-only customer view/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /assign card/i })).toHaveCount(
      0,
    );

    await page.goto('/cashier/sync');
    await expect(
      page.getByRole('heading', { name: /sync queue/i }),
    ).toBeVisible();
    await expect(page.getByLabel('Device ID')).toHaveAttribute('readonly', '');
    await expect(page.getByLabel('Device ID')).toHaveAttribute(
      'placeholder',
      'Derived automatically',
    );
  });

  test('covers supervisor customer, card, and reports routes', async ({ page }) => {
    await mockShell(page, 'SUPERVISOR');

    await page.goto('/supervisor/customers');
    await expect(
      page.getByRole('heading', { name: /customers/i }),
    ).toBeVisible();
    await expect(page.getByText(/manage customer and card state/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /assign card/i })).toBeVisible();

    await page.goto('/supervisor/cards');
    await expect(
      page.getByRole('heading', { name: /customers/i }),
    ).toBeVisible();
    await expect(page.getByText(/manage customer and card state/i)).toBeVisible();

    await page.goto('/supervisor/reports');
    await expect(
      page.getByRole('heading', { name: 'Reports', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /refresh materialization/i })).toBeDisabled();
    const reportOptions = await page
      .getByLabel('Report', { exact: true })
      .evaluate((element) =>
        Array.from((element as HTMLSelectElement).options).map((option) =>
          option.textContent?.trim() ?? '',
        ),
      );
    expect(reportOptions).not.toContain('Audit report');
    expect(reportOptions).not.toContain('Pilot operations summary');
  });
});

async function mockShell(page: Page, role: 'CASHIER' | 'SUPERVISOR') {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === '/api/v1/auth/me') {
      return route.fulfill(
        json({
          success: true,
          data: sessionByRole[role],
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/auth/refresh' || pathname === '/api/v1/auth/logout') {
      return route.fulfill(json({ success: true, data: null, meta: meta(pathname) }));
    }

    if (pathname === '/api/v1/config/public') {
      return route.fulfill(
        json({
          success: true,
          data: {
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
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/customers') {
      return route.fulfill(
        json({
          success: true,
          data: {
            items: [
              {
                id: 'customer-1',
                fullName: 'Ada Shopper',
                phoneE164: '+2348000000001',
                status: 'ACTIVE',
                balanceKobo: 5500,
              },
            ],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/customers/customer-1') {
      return route.fulfill(
        json({
          success: true,
          data: {
            id: 'customer-1',
            fullName: 'Ada Shopper',
            phoneE164: '+2348000000001',
            status: 'ACTIVE',
            balanceKobo: 5500,
            linkedCards: [
              {
                id: 'card-1',
                serialNumber: 'CARD-001',
                status: 'ACTIVE',
                availableBalanceKobo: 5500,
              },
            ],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/customers/customer-1/ledger') {
      return route.fulfill(
        json({
          success: true,
          data: {
            items: [
              {
                id: 'ledger-1',
                type: 'EARN',
                amountKobo: 2500,
              },
            ],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/reports/executive-summary') {
      return route.fulfill(
        json({
          success: true,
          data: {
            scope: 'TENANT',
            scopeKey: 'tenant-1',
            branchId: null,
            timezone: 'Africa/Lagos',
            items: [{ label: 'Revenue', value: 1000 }],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/reports/pilot-operations-summary') {
      return route.fulfill(
        json({
          success: true,
          data: {
            release: { version: '1.0.0', sha: 'abc123' },
            generatedAt: '2030-01-01T00:00:00.000Z',
            outbox: { backlogCount: 0, staleCount: 0 },
            sms: { failedCount: 0 },
            offlineSync: { failureCount: 0 },
            fraud: { openCount: 0 },
            reports: { staleCount: 0 },
            reconciliation: { healthy: true, mismatchCount: 0 },
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname.startsWith('/api/v1/reports/') && pathname.endsWith('/export')) {
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/csv; charset=utf-8' },
        body: 'col1,col2\nvalue-1,value-2\n',
      });
    }

    if (pathname.startsWith('/api/v1/reports/')) {
      return route.fulfill(
        json({
          success: true,
          data: {
            scope: 'TENANT',
            scopeKey: 'tenant-1',
            branchId: null,
            timezone: 'Africa/Lagos',
            items: [{ label: 'Rows', value: 1 }],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/offline-sync/earn-batch') {
      return route.fulfill(
        json({
          success: true,
          data: { records: [] },
          meta: meta(pathname),
        }),
      );
    }

    return route.fulfill({ status: 404, body: '{}' });
  });
}

function json(body: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

function meta(path: string) {
  return {
    timestamp: '2030-01-01T00:00:00.000Z',
    path,
    requestId: 'test-request-id',
  };
}
