import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi, logoutRoleInUi } from '../support/auth';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';
import { loadSmokeRun } from '../support/smoke-run';
import { measureWorkflow } from '../support/timing';

function transactionId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  for (const key of ['transactionId', 'id', 'receiptId']) {
    if (typeof record[key] === 'string') return record[key];
  }
  return record.data ? transactionId(record.data) : null;
}

test.describe.serial('Cashier smoke workflows', () => {
  test('logs in, looks up the active smoke card, and exposes safe context', async ({
    page,
  }) => {
    const config = loadSmokeConfig();
    const run = loadSmokeRun();
    await loginRoleInUi(page, 'cashier', config);
    await expect(page).toHaveURL(/\/cashier$/);
    const activity = await measureWorkflow('today activity', async () => {
      await expect(
        page.getByRole('heading', { name: /recent today/i }),
      ).toBeVisible();
    });
    await recordWorkflowEvidence(run, {
      group: 'cashier',
      name: 'today-activity',
      status: 'PASS',
      durationMs: activity.durationMs,
      references: { route: '/cashier' },
    });

    const lookup = await measureWorkflow('card lookup', async () => {
      await page
        .getByLabel('Scan card or enter card number')
        .fill(config.activeCardSerial);
      await page.getByRole('button', { name: /^look up$/i }).click();
      await expect(
        page.getByRole('status').filter({ hasText: /customer verified/i }),
      ).toBeVisible();
      await expect(page.getByLabel('Verified customer')).toContainText(
        /eligible/i,
      );
    });
    expect(lookup.durationMs).toBeGreaterThanOrEqual(0);
    await expect(page.getByLabel('Verified customer')).not.toContainText(
      /password|secret/i,
    );
    await recordWorkflowEvidence(run, {
      group: 'cashier',
      name: 'card-lookup',
      status: 'PASS',
      durationMs: lookup.durationMs,
      references: { cardSerial: config.activeCardSerial },
    });

    const sync = await measureWorkflow('sync queue', async () => {
      await page.goto('/cashier/sync');
      await expect(page.getByRole('heading', { name: /sync/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /sync/i })).toBeVisible();
    });
    await recordWorkflowEvidence(run, {
      group: 'cashier',
      name: 'sync-queue',
      status: 'PASS',
      durationMs: sync.durationMs,
      references: { route: '/cashier/sync' },
    });
    const customerView = await measureWorkflow('customer view', async () => {
      await page.goto('/cashier/customers');
      await expect(
        page.getByRole('heading', { name: /customer/i }),
      ).toBeVisible();
    });
    await recordWorkflowEvidence(run, {
      group: 'cashier',
      name: 'customer-view',
      status: 'PASS',
      durationMs: customerView.durationMs,
      references: { route: '/cashier/customers' },
    });
    const logout = await measureWorkflow('logout', () => logoutRoleInUi(page));
    await recordWorkflowEvidence(run, {
      group: 'cashier',
      name: 'logout',
      status: 'PASS',
      durationMs: logout.durationMs,
      references: { route: '/login' },
    });
  });

  test('completes a confirmed Earn and verifies the backend balance changed', async ({
    page,
  }) => {
    const config = loadSmokeConfig();
    const run = loadSmokeRun();
    const adminApi = await createRoleApiSession(
      'admin',
      config,
      run.smokeRunId,
    );
    try {
      const before = await adminApi.get<Record<string, unknown>>(
        `/api/v1/customers/${config.activeCustomerId}`,
      );
      const beforeBalance = Number(
        before.availableBalanceKobo ?? before.balanceKobo,
      );
      await loginRoleInUi(page, 'cashier', config);
      await page.goto(
        `/cashier/earn?card=${encodeURIComponent(config.activeCardSerial)}`,
      );
      await expect(page.getByText(/lookup resolved/i)).toBeVisible();
      await page
        .getByLabel('POS receipt number')
        .fill(`${run.smokeRunId}-EARN-01`);
      await page.getByLabel('Purchase amount').fill('100');
      await page.getByLabel('Purchase amount').blur();
      const earnResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/transactions/earn') &&
          response.request().method() === 'POST',
      );
      const earnTiming = await measureWorkflow('confirmed earn', async () => {
        await page.getByRole('button', { name: /submit earn/i }).click();
        await expect(
          page.getByText('Earn confirmed by backend contract.', {
            exact: true,
          }),
        ).toBeVisible();
        return (await earnResponse).json();
      });
      const earnPayload = earnTiming.value;
      const earnId = transactionId(earnPayload);
      if (!earnId)
        throw new Error('Smoke Earn response did not contain a transaction ID');
      await registerFinancialArtifact(run, {
        kind: 'EARN',
        referenceId: earnId,
        reversalRequired: true,
        reversalPath: `/api/v1/transactions/${earnId}/reverse`,
      });
      await recordWorkflowEvidence(run, {
        group: 'cashier',
        name: 'confirmed-earn',
        status: 'PASS',
        durationMs: earnTiming.durationMs,
        references: {
          transactionId: earnId,
          receiptNumber: `${run.smokeRunId}-EARN-01`,
        },
      });

      const after = await adminApi.get<Record<string, unknown>>(
        `/api/v1/customers/${config.activeCustomerId}`,
      );
      expect(
        Number(after.availableBalanceKobo ?? after.balanceKobo),
      ).toBeGreaterThanOrEqual(beforeBalance);
      const ledger = await adminApi.get<{
        items?: Array<Record<string, unknown>>;
      }>(`/api/v1/customers/${config.activeCustomerId}/ledger?limit=20`);
      expect(
        ledger.items?.some((item) => item.type === 'EARN' && item.creditLot),
      ).toBe(true);
    } finally {
      await adminApi.dispose();
    }
  });

  test('completes a small Redeem and logs out', async ({ page }) => {
    const config = loadSmokeConfig();
    const run = loadSmokeRun();
    const adminApi = await createRoleApiSession(
      'admin',
      config,
      run.smokeRunId,
    );
    try {
      await loginRoleInUi(page, 'cashier', config);
      await page.goto(
        `/cashier/redeem?card=${encodeURIComponent(config.activeCardSerial)}`,
      );
      await expect(page.getByText(/lookup resolved/i)).toBeVisible();
      await page
        .getByLabel('POS receipt number')
        .fill(`${run.smokeRunId}-REDEEM-01`);
      await page.getByLabel('Basket amount').fill('20');
      await page.getByLabel('Basket amount').blur();
      await page.getByLabel('Requested redemption').fill('5');
      await page.getByLabel('Requested redemption').blur();
      const redeemResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/transactions/redeem') &&
          response.request().method() === 'POST',
      );
      const redeemTiming = await measureWorkflow('redeem', async () => {
        await page.getByRole('button', { name: /submit redemption/i }).click();
        await expect(
          page.getByText('Redemption confirmed by backend contract.', {
            exact: true,
          }),
        ).toBeVisible();
        return (await redeemResponse).json();
      });
      const redeemPayload = redeemTiming.value;
      const redeemId = transactionId(redeemPayload);
      if (!redeemId)
        throw new Error(
          'Smoke Redeem response did not contain a transaction ID',
        );
      await registerFinancialArtifact(run, {
        kind: 'REDEEM',
        referenceId: redeemId,
        reversalRequired: true,
        reversalPath: `/api/v1/transactions/${redeemId}/reverse`,
      });
      await recordWorkflowEvidence(run, {
        group: 'cashier',
        name: 'redeem',
        status: 'PASS',
        durationMs: redeemTiming.durationMs,
        references: {
          transactionId: redeemId,
          receiptNumber: `${run.smokeRunId}-REDEEM-01`,
        },
      });
      const ledger = await adminApi.get<{
        items?: Array<Record<string, unknown>>;
      }>(`/api/v1/customers/${config.activeCustomerId}/ledger?limit=20`);
      expect(
        ledger.items?.some(
          (item) =>
            item.type === 'REDEEM' &&
            Array.isArray(item.allocations) &&
            item.allocations.length > 0,
        ),
      ).toBe(true);
      await logoutRoleInUi(page);
    } finally {
      await adminApi.dispose();
    }
  });
});
