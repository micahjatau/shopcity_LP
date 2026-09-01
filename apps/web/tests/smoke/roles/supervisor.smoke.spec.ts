import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi, logoutRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';

test('Supervisor can access operational workflows in the smoke tenant', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const api = await createRoleApiSession('supervisor', config, run.smokeRunId);
  try {
    const session = await api.get<{
      user?: { role?: string; tenantId?: string };
    }>('/api/v1/auth/me');
    expect(session.user?.role).toMatch(/SUPERVISOR/i);

    await loginRoleInUi(page, 'supervisor', config);
    await page.goto(
      `/supervisor/customers?id=${encodeURIComponent(config.activeCustomerId)}`,
    );
    await expect(
      page.getByRole('heading', { name: /customers/i }),
    ).toBeVisible();
    await expect(page.getByLabel('Customer full name')).toBeVisible();
    await expect(page.getByLabel('Card serial')).toBeVisible();
    for (const route of [
      '/supervisor/customers',
      '/supervisor/cards',
      '/supervisor/approvals',
      '/supervisor/fraud',
      '/supervisor/transactions',
      '/supervisor/reports',
    ]) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}$`));
    }
    for (const route of [
      '/admin/users',
      '/admin/devices',
      '/admin/audit',
      '/admin/reports',
    ]) {
      await page.goto(route);
      await expect(page).not.toHaveURL(
        new RegExp(`${route.replace('/', '\\/')}$`),
      );
    }
    await recordWorkflowEvidence(run, {
      group: 'supervisor',
      name: 'operational-routes',
      status: 'PASS',
      durationMs: 0,
      references: { tenantId: config.tenantId },
    });
    await logoutRoleInUi(page);
  } finally {
    await api.dispose();
  }
});

test('Supervisor can edit a run-tagged profile and restore its baseline', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const api = await createRoleApiSession('supervisor', config, run.smokeRunId);
  const baseline = await api.get<{
    fullName?: string;
    phone?: string;
    email?: string;
  }>(`/api/v1/customers/${config.activeCustomerId}`);
  try {
    await loginRoleInUi(page, 'supervisor', config);
    await page.goto(
      `/supervisor/customers?id=${encodeURIComponent(config.activeCustomerId)}`,
    );
    await expect(
      page.getByRole('heading', { name: /customers/i }),
    ).toBeVisible();
    const fullNameField = page.getByLabel('Customer full name');
    await expect(fullNameField).toHaveValue(/.+/);
    await fullNameField.fill(`${run.smokeRunId} Supervisor Profile`);
    await page.getByRole('button', { name: /save profile/i }).click();
    await expect(
      page.getByText(/profile updated|customer updated|saved/i),
    ).toBeVisible();
    const changed = await api.get<{ fullName?: string }>(
      `/api/v1/customers/${config.activeCustomerId}`,
    );
    expect(changed.fullName).toContain(run.smokeRunId);
    await recordWorkflowEvidence(run, {
      group: 'supervisor',
      name: 'profile-edit',
      status: 'PASS',
      durationMs: 0,
      references: { customerId: config.activeCustomerId },
    });
  } finally {
    await api.patch(
      `/api/v1/customers/${config.activeCustomerId}`,
      {
        fullName: baseline.fullName,
        ...(baseline.phone ? { phone: baseline.phone } : {}),
        ...(baseline.email ? { email: baseline.email } : {}),
      },
      `${run.smokeRunId}-restore-profile`,
    );
    await api.dispose();
  }
});
