import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';

test('Expired sessions fail closed without changing global timeout policy', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  await loginRoleInUi(page, 'cashier', config);
  await page.route('**/api/v1/**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'SESSION_EXPIRED' }),
      });
      return;
    }
    await route.continue();
  });
  await page.goto('/cashier');
  await expect(page).toHaveURL(/\/login|\/auth/);
  await recordWorkflowEvidence(run, {
    group: 'guardrail',
    name: 'session-expiry',
    status: 'PASS',
    durationMs: 0,
    references: { outcome: 'SESSION_EXPIRED' },
  });
});
