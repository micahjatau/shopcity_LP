import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi, logoutRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { measureWorkflow } from '../support/timing';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';

test('Admin can access the smoke tenant operational control plane', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const api = await createRoleApiSession('admin', config, run.smokeRunId);
  try {
    const session = await api.get<{
      user?: { role?: string; tenantId?: string };
    }>('/api/v1/auth/me');
    expect(session.user?.role).toMatch(/ADMIN/i);

    await loginRoleInUi(page, 'admin', config);
    await page.goto('/admin/devices');
    await expect(page.getByRole('heading', { name: /devices/i })).toBeVisible();
    await expect(page.getByLabel('Device status')).toBeVisible();
    await expect(
      page.getByText(config.cashier.deviceAttestationSecret),
    ).toHaveCount(0);
    for (const route of [
      '/admin/users',
      '/admin/devices',
      '/admin/branches',
      '/admin/customers',
      '/admin/cards',
      '/admin/adjustments',
      '/admin/transactions',
      '/admin/audit',
      '/admin/operations',
      '/admin/reports',
    ]) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}$`));
    }
    await recordWorkflowEvidence(run, {
      group: 'admin',
      name: 'operational-routes',
      status: 'PASS',
      durationMs: 0,
      references: { tenantId: config.tenantId, deviceId: config.deviceId },
    });
    await logoutRoleInUi(page);
  } finally {
    await api.dispose();
  }
});

test('Admin can reversibly activate and deactivate the smoke device', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const api = await createRoleApiSession('admin', config, run.smokeRunId);
  const devices =
    await api.get<Array<{ id?: string; status?: string; branchId?: string }>>(
      '/api/v1/devices',
    );
  const baseline = devices.find((device) => device.id === config.deviceId);
  if (!baseline)
    throw new Error('Smoke device was not returned during baseline capture');
  try {
    await loginRoleInUi(page, 'admin', config);
    await page.goto('/admin/devices');
    await expect(page.getByRole('heading', { name: /devices/i })).toBeVisible();
    await page
      .getByRole('button', { name: new RegExp(config.deviceId) })
      .click();
    await page.getByLabel('Device status').selectOption('INACTIVE');
    await page.getByLabel('Update confirmation').fill('UPDATE');
    await page.getByRole('button', { name: /^update device$/i }).click();
    await expect(page.getByText(/device updated|updated/i)).toBeVisible();
    await page.getByLabel('Device status').selectOption('ACTIVE');
    await page.getByLabel('Update confirmation').fill('UPDATE');
    await page.getByRole('button', { name: /^update device$/i }).click();
    await expect(page.getByText(/device updated|updated/i)).toBeVisible();
    await recordWorkflowEvidence(run, {
      group: 'admin',
      name: 'device-lifecycle',
      status: 'PASS',
      durationMs: 0,
      references: { deviceId: config.deviceId },
    });
  } finally {
    if (baseline.status && baseline.status !== 'ACTIVE') {
      await api.patch(
        `/api/v1/devices/${config.deviceId}`,
        { status: baseline.status, branchId: baseline.branchId },
        `${run.smokeRunId}-restore-device`,
      );
    }
    await api.dispose();
  }
});

test('Admin can create and register a reversible integer-kobo adjustment', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const api = await createRoleApiSession('admin', config, run.smokeRunId);
  try {
    const before = await api.get<{
      balanceKobo?: number;
      availableBalanceKobo?: number;
    }>(`/api/v1/customers/${config.activeCustomerId}`);
    await loginRoleInUi(page, 'admin', config);
    await page.goto('/admin/adjustments');
    await page.getByLabel('Customer ID').fill(config.activeCustomerId);
    await expect(
      page.getByText(/current balance|consequence preview/i).first(),
    ).toBeVisible();
    await page.getByLabel('Amount').fill('1');
    await page
      .getByLabel('Reason')
      .fill(`[${run.smokeRunId}] controlled adjustment`);
    await page.getByLabel('Confirmation').fill('SUBMIT');
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/adjustments') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /submit adjustment/i }).click();
    await expect(page.getByText(/adjustment created/i)).toBeVisible();
    const payload = (await (await responsePromise).json()) as {
      data?: { adjustmentId?: string; ledgerEntryId?: string; id?: string };
      adjustmentId?: string;
      ledgerEntryId?: string;
      id?: string;
    };
    const record = payload.data ?? payload;
    const referenceId =
      record.adjustmentId ?? record.ledgerEntryId ?? record.id;
    if (!referenceId)
      throw new Error('Adjustment response did not contain an ID');
    await registerFinancialArtifact(run, {
      kind: 'ADJUSTMENT',
      referenceId,
      reversalRequired: true,
      reversalPath: '/api/v1/adjustments',
      reversalBody: {
        customerId: config.activeCustomerId,
        amountKobo: 1,
        reason: `[${run.smokeRunId}] compensating adjustment`,
        kind: 'DEBIT',
        effectiveAt: new Date().toISOString(),
      },
    });
    const after = await api.get<{
      balanceKobo?: number;
      availableBalanceKobo?: number;
    }>(`/api/v1/customers/${config.activeCustomerId}`);
    expect(Number(after.availableBalanceKobo ?? after.balanceKobo)).toBe(
      Number(before.availableBalanceKobo ?? before.balanceKobo) + 1,
    );
    const ledger = await api.get<{ items?: Array<Record<string, unknown>> }>(
      `/api/v1/customers/${config.activeCustomerId}/ledger?limit=20`,
    );
    expect(
      ledger.items?.some(
        (item) => item.type === 'ADJUSTMENT' && Number(item.amountKobo) === 1,
      ),
    ).toBe(true);
    await page.goto('/admin/audit');
    await expect(
      page.getByRole('heading', { name: /audit/i }).first(),
    ).toBeVisible();
    const report = await measureWorkflow('admin report load', async () => {
      await page.goto('/admin/reports');
      await expect(
        page.getByRole('heading', { name: 'Reports', exact: true }),
      ).toBeVisible();
    });
    await recordWorkflowEvidence(run, {
      group: 'admin',
      name: 'report-load',
      status: 'PASS',
      durationMs: report.durationMs,
      references: { route: '/admin/reports' },
    });
    await recordWorkflowEvidence(run, {
      group: 'admin',
      name: 'controlled-adjustment',
      status: 'PASS',
      durationMs: 0,
      references: { referenceId, customerId: config.activeCustomerId },
    });
  } finally {
    await api.dispose();
  }
});
