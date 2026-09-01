import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';

test('Cashier Redeem is a cross-role financial scenario', async ({ page }) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const attemptSuffix = test.info().retry ? `-RETRY-${test.info().retry}` : '';
  const receipt = `${run.smokeRunId}${attemptSuffix}-CROSS-REDEEM-01`;
  // The UI amount is entered in naira; 500 naira is 50,000 kobo.
  const requestedAmountKobo = 50_000;
  const requestedAmountNaira = 500;
  const adminApi = await createRoleApiSession('admin', config, run.smokeRunId);
  try {
    const before = await adminApi.get<Record<string, unknown>>(
      `/api/v1/customers/${config.activeCustomerId}`,
    );
    const beforeBalance = Number(
      before.availableBalanceKobo ?? before.balanceKobo,
    );
    expect(beforeBalance).toBeGreaterThanOrEqual(requestedAmountKobo);

    await loginRoleInUi(page, 'cashier', config);
    await page.goto(
      `/cashier/redeem?card=${encodeURIComponent(config.activeCardSerial)}`,
    );
    await expect(page.getByText(/lookup resolved/i)).toBeVisible();
    await page.getByLabel('POS receipt number').fill(receipt);
    await page.getByLabel('Basket amount').fill('2000');
    await page.getByLabel('Basket amount').blur();
    await page
      .getByLabel('Requested redemption')
      .fill(String(requestedAmountNaira));
    await page.getByLabel('Requested redemption').blur();
    const redeemResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/transactions/redeem') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /submit redemption/i }).click();
    await expect(
      page
        .getByText(
          /(Earn|Redemption) (confirmed|awaiting approval) by backend contract|awaiting approval/i,
        )
        .first(),
    ).toBeVisible();
    const redeemPayload = await (await redeemResponse).json();
    const redeemData = responseData(redeemPayload);
    expect(redeemData.state).toBe('CONFIRMED');
    const redeemId =
      typeof redeemData.transactionId === 'string'
        ? redeemData.transactionId
        : null;
    if (!redeemId) {
      throw new Error(
        'Smoke cross-role Redeem response did not contain a transaction ID',
      );
    }
    await registerFinancialArtifact(run, {
      kind: 'REDEEM',
      referenceId: redeemId,
      reversalRequired: true,
      reversalPath: `/api/v1/transactions/${redeemId}/reverse`,
    });

    const transaction = await adminApi.get<Record<string, unknown>>(
      `/api/v1/transactions/${redeemId}`,
    );
    expect(transaction).toMatchObject({
      transactionId: redeemId,
      type: 'REDEEM',
      direction: 'DEBIT',
      state: 'CONFIRMED',
      redemptionId: expect.any(String),
    });
    expect(Number(transaction.redeemedAmountKobo)).toBe(requestedAmountKobo);
    const allocations = (transaction.ledger as Record<string, unknown> | null)
      ?.allocations;
    expect(Array.isArray(allocations)).toBe(true);
    expect(allocations).not.toHaveLength(0);
    const allocationRecords = (allocations ?? []) as Array<
      Record<string, unknown>
    >;
    expect(allocationRecords.map((item) => item.allocationOrder)).toEqual(
      allocationRecords.map((_item, index) => index + 1),
    );
    const expiryTimes = allocationRecords.map((item) =>
      Date.parse(String(item.expiresAt)),
    );
    expect(expiryTimes.every((value) => Number.isFinite(value))).toBe(true);
    expect(expiryTimes).toEqual(
      [...expiryTimes].sort((left, right) => left - right),
    );

    const after = await adminApi.get<Record<string, unknown>>(
      `/api/v1/customers/${config.activeCustomerId}`,
    );
    expect(Number(after.availableBalanceKobo ?? after.balanceKobo)).toBe(
      beforeBalance - requestedAmountKobo,
    );

    await recordWorkflowEvidence(run, {
      group: 'cross-role',
      name: 'redeem',
      status: 'PASS',
      durationMs: 0,
      references: { receiptNumber: receipt, transactionId: redeemId },
    });
  } finally {
    await adminApi.dispose();
  }
});

function responseData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  const record = payload as Record<string, unknown>;
  const nested = record.data;
  if (nested && typeof nested === 'object') {
    const nestedRecord = nested as Record<string, unknown>;
    if (nestedRecord.data && typeof nestedRecord.data === 'object') {
      return nestedRecord.data as Record<string, unknown>;
    }
    return nestedRecord;
  }
  return record;
}
