import { expect, test, type Page } from '@playwright/test';
import { shellNavigationByRole } from '../components/shell-navigation';

const baseUrl = 'http://127.0.0.1:3100';

const sessionByRole = {
  CASHIER: {
    user: {
      id: 'cashier-1',
      username: 'cashier@shopcity.local',
      role: 'CASHIER',
      branchId: 'branch-1',
    },
    session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
  },
  SUPERVISOR: {
    user: {
      id: 'supervisor-1',
      username: 'supervisor@shopcity.local',
      role: 'SUPERVISOR',
      branchId: 'branch-1',
    },
    session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
  },
  ADMIN: {
    user: {
      id: 'admin-1',
      username: 'admin@shopcity.local',
      role: 'ADMIN',
      branchId: 'branch-1',
    },
    session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
  },
} as const;

test.describe.configure({ timeout: 120000 });

test.describe('workflow route coverage', () => {
  test('covers cashier earn, redeem, customers and sync routes', async ({
    request,
  }) => {
    for (const href of [
      '/cashier/lookup?card=CARD-001',
      '/cashier/earn?card=CARD-001',
      '/cashier/customers',
      '/cashier/redeem?card=CARD-001',
      '/cashier/sync',
    ]) {
      const response = await request.get(href);
      expect(response.status()).toBe(200);
    }
  });

  test('covers supervisor customer, card, and reports routes', async ({
    request,
  }) => {
    for (const href of [
      '/supervisor/customers',
      '/supervisor/cards',
      '/supervisor/reports',
    ]) {
      const response = await request.get(href);
      expect(response.status()).toBe(200);
    }
  });

  test('covers lookup success, context handoff, keyboard, and narrow layout', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/cashier/lookup?card=CARD-001`);

    const lookup = page.getByRole('textbox', { name: 'Lookup' });
    await expect(lookup).toHaveValue('CARD-001');
    await lookup.press('Enter');
    await expect(page.getByText('Ada Shopper')).toBeVisible();
    const lookupCard = page.getByLabel('Lookup and status');
    await expect(
      lookupCard.getByRole('link', { name: 'Earn' }),
    ).toHaveAttribute('href', '/cashier/earn?card=CARD-001');
    await expect(
      lookupCard.getByRole('link', { name: 'Redeem' }),
    ).toHaveAttribute('href', '/cashier/redeem?card=CARD-001');
  });

  test('resolves every shell navigation destination', async ({ request }) => {
    for (const role of Object.keys(shellNavigationByRole) as Array<
      keyof typeof sessionByRole
    >) {
      const hrefs = shellNavigationByRole[role].flatMap((section) =>
        section.items.map((item) => item.href),
      );

      for (const href of hrefs) {
        const response = await request.get(href);
        expect(response?.status()).toBe(200);
      }
    }
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

    if (
      pathname === '/api/v1/auth/refresh' ||
      pathname === '/api/v1/auth/logout'
    ) {
      return route.fulfill(
        json({ success: true, data: null, meta: meta(pathname) }),
      );
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

    if (pathname === '/api/v1/cards/lookup/CARD-001') {
      return route.fulfill(
        json({
          success: true,
          data: {
            customer: {
              id: 'customer-1',
              fullName: 'Ada Shopper',
            },
            customerId: 'customer-1',
            customerName: 'Ada Shopper',
            serialNumber: 'CARD-001',
            status: 'ACTIVE',
            availableBalanceKobo: 5500,
            expiringCreditKobo: 1000,
            branchId: 'branch-1',
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

    if (
      pathname.startsWith('/api/v1/reports/') &&
      pathname.endsWith('/export')
    ) {
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
