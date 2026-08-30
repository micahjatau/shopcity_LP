import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';

test('Cashier cannot enter protected role shells', async ({ page }) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const api = await createRoleApiSession('cashier', config, run.smokeRunId);
  try {
    await loginRoleInUi(page, 'cashier', config);
    for (const route of ['/admin', '/supervisor']) {
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(`${route}$`));
    }
    await expect(api.get('/api/v1/users')).rejects.toThrow(
      /403|FORBIDDEN|failed/i,
    );
    await expect(
      api.post('/api/v1/customers', {
        fullName: `${run.smokeRunId} forbidden customer`,
        phone: '+2348000000000',
      }),
    ).rejects.toThrow(/403|FORBIDDEN|failed/i);
    await recordWorkflowEvidence(run, {
      group: 'guardrail',
      name: 'cashier-rbac',
      status: 'PASS',
      durationMs: 0,
      references: { deniedRoutes: '/admin,/supervisor' },
    });
  } finally {
    await api.dispose();
  }
});

test('Supervisor cannot access Admin management APIs', async () => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const api = await createRoleApiSession('supervisor', config, run.smokeRunId);
  try {
    for (const path of [
      '/api/v1/users',
      '/api/v1/devices',
      '/api/v1/audit',
      '/api/v1/reports/pilot-operations-summary',
    ]) {
      await expect(api.get(path)).rejects.toThrow(/403|FORBIDDEN|failed/i);
    }
  } finally {
    await api.dispose();
  }
});
