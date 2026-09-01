import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';

test('Cashier Redeem is a cross-role financial scenario', async ({ page }) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const attemptSuffix = test.info().retry ? `-RETRY-${test.info().retry}` : '';
  await loginRoleInUi(page, 'cashier', config);
  await page.goto(
    `/cashier/redeem?card=${encodeURIComponent(config.activeCardSerial)}`,
  );
  await expect(page.getByText(/lookup resolved/i)).toBeVisible();
  await page
    .getByLabel('POS receipt number')
    .fill(`${run.smokeRunId}${attemptSuffix}-CROSS-REDEEM-01`);
  await page.getByLabel('Basket amount').fill('2000');
  await page.getByLabel('Basket amount').blur();
  await page.getByLabel('Requested redemption').fill('500');
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
  const redeemPayload = (await (await redeemResponse).json()) as {
    data?: { data?: Record<string, unknown> } & Record<string, unknown>;
    transactionId?: string;
    id?: string;
  };
  const redeemData =
    redeemPayload.data?.data ?? redeemPayload.data ?? redeemPayload;
  const redeemId =
    typeof redeemData.transactionId === 'string'
      ? redeemData.transactionId
      : typeof redeemData.id === 'string'
        ? redeemData.id
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
  await recordWorkflowEvidence(run, {
    group: 'cross-role',
    name: 'redeem',
    status: 'PASS',
    durationMs: 0,
    references: {
      receiptNumber: `${run.smokeRunId}${attemptSuffix}-CROSS-REDEEM-01`,
    },
  });
});
