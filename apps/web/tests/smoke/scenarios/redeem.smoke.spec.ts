import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';

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
  await page.getByLabel('Basket amount').fill('20');
  await page.getByLabel('Basket amount').blur();
  await page.getByLabel('Requested redemption').fill('5');
  await page.getByLabel('Requested redemption').blur();
  await page.getByRole('button', { name: /submit redemption/i }).click();
  await expect(
    page
      .getByText(
        /(Earn|Redemption) (confirmed|awaiting approval) by backend contract|awaiting approval/i,
      )
      .first(),
  ).toBeVisible();
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
