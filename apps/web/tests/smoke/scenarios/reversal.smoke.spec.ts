import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';

test('Supervisor can open the transaction surface for reversal', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  await loginRoleInUi(page, 'supervisor', config);
  await page.goto('/supervisor/transactions');
  await expect(
    page.getByRole('heading', { name: /transaction/i }),
  ).toBeVisible();
  await recordWorkflowEvidence(run, {
    group: 'cross-role',
    name: 'reversal-surface',
    status: 'PASS',
    durationMs: 0,
    references: { route: '/supervisor/transactions', runId: run.smokeRunId },
  });
});
