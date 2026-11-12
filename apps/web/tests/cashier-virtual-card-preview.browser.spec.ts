import { expect, test, type Page } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';
const customerName =
  'Alexandria Emmanuelle Shopper With A Long Name For Small POS Screens';
const cardSerial = 'CARD-2026-ABCD-0042';

test.describe.configure({ timeout: 60000 });

test('typesets verified card identity legibly in Earn and Redeem at desktop and mobile widths', async ({
  page,
}) => {
  await mockCashierApi(page);

  for (const route of ['/cashier/earn', '/cashier/redeem']) {
    for (const width of [1366, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${baseUrl}${route}`);
      await page.getByRole('textbox', { name: 'Lookup' }).fill(cardSerial);
      await page.getByRole('button', { name: 'Search customer' }).click();

      const preview = page.getByRole('img', {
        name: new RegExp(`ShopCity card preview for ${customerName}`),
      });
      await expect(preview).toBeVisible();
      await expect(preview).toContainText(customerName.toUpperCase());
      await expect(preview).toContainText(cardSerial);
      await expect(preview.locator('p').nth(0)).toHaveCSS('font-size', '15px');
      await expect(preview.locator('p').nth(1)).toHaveCSS('font-size', '14px');
      await expect(
        page.locator('.cashier-capture-card-preview__status'),
      ).toHaveText(
        route.endsWith('/earn') ? 'Status: Active' : 'Status: ACTIVE',
      );

      const bounds = await preview.evaluate((figure) => {
        const frame = figure.getBoundingClientRect();
        const name = figure.querySelectorAll('p')[0].getBoundingClientRect();
        const serial = figure.querySelectorAll('p')[1].getBoundingClientRect();
        const overlay = figure
          .querySelector('div.absolute.z-10')!
          .getBoundingClientRect();
        return {
          frame: {
            left: frame.left,
            right: frame.right,
            top: frame.top,
            bottom: frame.bottom,
          },
          name: {
            left: name.left,
            right: name.right,
            top: name.top,
            bottom: name.bottom,
          },
          serial: {
            left: serial.left,
            right: serial.right,
            top: serial.top,
            bottom: serial.bottom,
          },
          overlay: {
            left: overlay.left,
            right: overlay.right,
            top: overlay.top,
            bottom: overlay.bottom,
          },
          scrollWidth: figure.scrollWidth,
          clientWidth: figure.clientWidth,
        };
      });

      expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth);
      expect(bounds.name.left).toBeGreaterThan(bounds.frame.left);
      expect(bounds.name.right).toBeLessThanOrEqual(bounds.frame.right);
      expect(bounds.name.bottom).toBeLessThanOrEqual(bounds.serial.top);
      expect(bounds.serial.left).toBeGreaterThan(bounds.frame.left);
      expect(bounds.serial.right).toBeLessThanOrEqual(bounds.frame.right);
      expect(bounds.serial.bottom).toBeLessThanOrEqual(
        bounds.frame.bottom - 12,
      );
      expect(bounds.overlay.top).toBeGreaterThanOrEqual(bounds.frame.top);
      expect(bounds.overlay.bottom).toBeLessThanOrEqual(
        bounds.frame.bottom - 12,
      );
    }
  }
});

async function mockCashierApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    let data: unknown = null;

    if (pathname === '/api/v1/auth/me') {
      data = {
        user: {
          id: 'cashier-1',
          username: 'cashier@shopcity.local',
          role: 'CASHIER',
          branchId: 'branch-1',
        },
        session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
      };
    } else if (pathname === '/api/v1/config/public') {
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
    } else if (pathname === `/api/v1/cards/lookup/${cardSerial}`) {
      data = {
        customer: { id: 'customer-1', fullName: customerName },
        customerId: 'customer-1',
        customerName,
        serialNumber: cardSerial,
        status: 'ACTIVE',
        availableBalanceKobo: 40000,
        branchId: 'branch-1',
      };
    } else if (pathname === '/api/v1/customers/customer-1') {
      data = {
        customerId: 'customer-1',
        fullName: customerName,
        email: 'ale***@example.test',
        availableBalanceKobo: 40000,
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data,
        meta: {
          timestamp: '2030-01-01T00:00:00.000Z',
          path: pathname,
          requestId: 'card-preview-test',
        },
      }),
    });
  });
}
