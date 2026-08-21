import { expect, test, type Page } from '@playwright/test';
import axe from 'axe-core';

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
} as const;

async function mockCashierShell(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === '/api/v1/auth/me') {
      return route.fulfill(
        json({
          success: true,
          data: sessionByRole.CASHIER,
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

    return route.fulfill({ status: 404, body: '{}' });
  });
}

async function runAxe(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const results = await (
      window as typeof window & { axe: typeof axe }
    ).axe.run(document, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    return results.violations;
  });
}

test.describe('browser accessibility', () => {
  test('catches contrast and semantic issues on shared shell routes', async ({
    page,
  }) => {
    await page.goto(`${baseUrl}/login`);
    await expect(
      page.getByRole('heading', {
        name: /sign in to the shopcity retail operations shell/i,
      }),
    ).toBeVisible();

    let violations = await runAxe(page);
    expect(violations).toEqual([]);

    await page.goto(`${baseUrl}/testing/critical-flows`);
    await expect(page.getByTestId('flow-login-session')).toBeVisible();
    violations = await runAxe(page);
    expect(violations).toEqual([]);
  });

  test('keeps mobile drawer focus and escape behavior accessible', async ({
    page,
  }) => {
    await mockCashierShell(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/cashier`);

    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(
      page.getByRole('dialog', { name: /primary navigation/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /close/i })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('dialog', { name: /primary navigation/i }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /menu/i })).toBeFocused();
  });
});

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
