import { expect, test } from '@playwright/test';

test.describe('ShopCity flow coverage', () => {
  test('@critical covers login/session and keyboard entry', async ({
    page,
  }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('heading', {
        name: /sign in to the shopcity retail operations shell/i,
      }),
    ).toBeVisible();
    await expect(page.getByLabel('Tenant / email / username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: /back to overview/i }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Tenant / email / username')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password')).toBeFocused();
  });

  test('@critical covers lookup and earn outcomes', async ({ page }) => {
    await page.goto('/testing/critical-flows');

    const lookup = page.getByTestId('flow-lookup');
    await expect(lookup).toContainText(/lookup/i);
    await expect(page.getByTestId('flow-earn-confirmed')).toContainText(
      /confirmed/i,
    );
    await expect(page.getByTestId('flow-earn-awaiting-approval')).toContainText(
      /awaiting approval/i,
    );
    await expect(page.getByTestId('flow-duplicate-receipt')).toContainText(
      /duplicate detected/i,
    );

    await lookup.getByLabel('Lookup').fill('1234567890');
    await lookup.getByRole('button', { name: /lookup customer/i }).click();
    await expect(lookup.getByLabel('Lookup')).toHaveValue('1234567890');
  });

  test('@critical covers redeem and approval decisions', async ({ page }) => {
    await page.goto('/testing/critical-flows');

    await expect(page.getByTestId('flow-redeem-confirmed')).toContainText(
      /redeemed/i,
    );
    await expect(
      page.getByTestId('flow-redeem-insufficient-balance'),
    ).toContainText(/insufficient balance/i);

    const approval = page.getByTestId('flow-approval-decision');
    await approval.getByLabel('Reject').check();
    await expect(approval.getByLabel('Reject')).toBeChecked();
    await approval.getByRole('button', { name: /submit decision/i }).click();
    await expect(approval).toContainText(/decision/i);
  });

  test('@critical covers offline, fraud, report and revocation outcomes', async ({
    page,
  }) => {
    await page.goto('/testing/critical-flows');

    await expect(page.getByTestId('flow-offline-sync')).toContainText(
      /offline earn sync outcomes/i,
    );
    await expect(page.getByTestId('flow-fraud-review')).toContainText(
      /fraud review/i,
    );
    await expect(
      page.getByTestId('flow-report-freshness-export'),
    ).toContainText(/fresh/i);
    await expect(
      page.getByTestId('flow-session-device-revocation'),
    ).toContainText(/device revocation/i);

    const device = page
      .getByTestId('flow-session-device-revocation')
      .getByLabel('Device');
    await device.selectOption('cashier-02');
    await expect(device).toHaveValue('cashier-02');
  });
});
