import { expect, test } from '@playwright/test';

function sessionPayload(role: 'CASHIER' | 'SUPERVISOR' | 'ADMIN' = 'CASHIER') {
  return {
    success: true,
    data: {
      user: {
        id: 'user-1',
        username: 'cashier',
        role,
        branchId: 'branch-1',
      },
      session: {
        expiresAt: '2030-01-01T00:00:00.000Z',
      },
    },
    meta: {
      timestamp: '2026-08-14T00:00:00.000Z',
      path: '/api/v1/auth/me',
      requestId: 'req-1',
    },
  };
}

test.describe('contract-faithful frontend flows', () => {
  test('logs in with backend contract and reaches the cashier shell', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('CASHIER')),
      });
    });

    await page.route('**/api/v1/auth/login', async (route) => {
      const body = route.request().postDataJSON() as { username: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('CASHIER')),
      });
      expect(body.username).toContain('@');
    });

    await page.goto('/login');
    await page.getByLabel('Tenant / email / username').fill('cashier@shopcity.local');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/cashier$/);
    await expect(page.getByRole('heading', { name: /cashier shell/i })).toBeVisible();
  });

  test('submits earn and redeem through generated client contracts', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('CASHIER')),
      });
    });

    await page.route('**/api/v1/transactions/earn', async (route) => {
      const body = route.request().postDataJSON() as { cardSerialNumber: string; purchaseAmountKobo: number };
      expect(body.cardSerialNumber).toBeTruthy();
      expect(body.purchaseAmountKobo).toBeGreaterThan(0);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {}, meta: {} }),
      });
    });

    await page.route('**/api/v1/transactions/redeem', async (route) => {
      const body = route.request().postDataJSON() as { cardSerialNumber: string; requestedRedemptionKobo: number };
      expect(body.cardSerialNumber).toBeTruthy();
      expect(body.requestedRedemptionKobo).toBeGreaterThan(0);
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {}, meta: {} }),
      });
    });

    await page.goto('/cashier');
    await expect(page.getByRole('heading', { name: /cashier shell/i })).toBeVisible();

    const earn = page.getByRole('article', { name: /earn transaction/i });
    await earn.getByLabel('Card serial number').fill('CARD-123');
    await earn.getByLabel('POS receipt number').fill('RCPT-123');
    await earn.getByLabel('Purchase amount').fill('1,234.50');
    await earn.getByLabel('Occurred at').fill('2030-01-01T12:00');
    await earn.getByRole('button', { name: /submit earn/i }).click();
    await expect(earn).toContainText(/earn confirmed/i);

    const redeem = page.getByRole('article', { name: /redeem transaction/i });
    await redeem.getByLabel('Card serial number').fill('CARD-123');
    await redeem.getByLabel('POS receipt number').fill('RCPT-124');
    await redeem.getByLabel('Basket amount').fill('500.00');
    await redeem.getByLabel('Requested redemption').fill('200.00');
    await redeem.getByLabel('Occurred at').fill('2030-01-01T12:00');
    await redeem.getByRole('button', { name: /submit redemption/i }).click();
    await expect(redeem).toContainText(/redemption awaiting approval/i);
  });

  test('loads supervisor approvals and admin reports from contract-shaped responses', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('ADMIN')),
      });
    });

    await page.route('**/api/v1/approvals**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'approval-1',
                receiptId: 'receipt-1',
                redemptionId: null,
                targetType: 'EARN',
                status: 'PENDING',
                reasonCode: 'HIGH_VALUE',
                requestedAmountKobo: 125000,
                requestedAt: '2030-01-01T12:00:00.000Z',
                expiresAt: '2030-01-01T14:00:00.000Z',
                decidedAt: null,
                executedAt: null,
                customer: { fullName: 'Amina Bello' },
                receipt: null,
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
          meta: {},
        }),
      });
    });

    await page.route('**/api/v1/reports/executive-summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            scope: 'TENANT',
            scopeKey: 'tenant-1',
            branchId: null,
            timezone: 'Africa/Lagos',
            items: [{ label: 'freshness', value: 'fresh' }],
          },
          meta: {},
        }),
      });
    });

    await page.goto('/supervisor');
    await expect(page.getByRole('heading', { name: /supervisor shell/i })).toBeVisible();
    await expect(page.getByText(/approvals panel/i)).toBeVisible();
    await expect(page.getByText(/loaded 1 approvals/i)).toBeVisible();

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin shell/i })).toBeVisible();
    await expect(page.getByText(/report summary loaded/i)).toBeVisible();
  });
});
