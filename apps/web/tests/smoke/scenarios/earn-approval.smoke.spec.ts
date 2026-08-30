import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';

test('Cashier Earn requiring approval is visible to Supervisor', async ({
  browser,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const cashier = await browser.newPage();
  const supervisor = await browser.newPage();
  const supervisorApi = await createRoleApiSession(
    'supervisor',
    config,
    run.smokeRunId,
  );
  const before = await supervisorApi.get<{ balanceKobo?: number }>(
    `/api/v1/customers/${config.activeCustomerId}`,
  );
  const receipt = `${run.smokeRunId}-APPROVAL-01`;
  const approvalAmount =
    Number(process.env.PURCHASE_APPROVAL_THRESHOLD_KOBO ?? 20_000_000) + 1;
  try {
    await loginRoleInUi(cashier, 'cashier', config);
    await cashier.goto(
      `/cashier/earn?card=${encodeURIComponent(config.activeCardSerial)}`,
    );
    await expect(cashier.getByText(/lookup resolved/i)).toBeVisible();
    await cashier.getByLabel('POS receipt number').fill(receipt);
    await cashier.getByLabel('Purchase amount').fill(String(approvalAmount));
    const earnResponse = cashier.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/transactions/earn') &&
        response.request().method() === 'POST',
    );
    await cashier.getByRole('button', { name: /submit earn/i }).click();
    await expect(cashier.getByText(/awaiting approval/i)).toBeVisible();
    const earnPayload = (await (await earnResponse).json()) as {
      data?: { state?: string };
      state?: string;
    };
    expect((earnPayload.data ?? earnPayload).state).toBe('PENDING_APPROVAL');
    const beforeApproval = await supervisorApi.get<{ balanceKobo?: number }>(
      `/api/v1/customers/${config.activeCustomerId}`,
    );
    expect(beforeApproval.balanceKobo).toBe(before.balanceKobo);
    const approvals = await supervisorApi.get<{ items?: unknown[] }>(
      '/api/v1/approvals?limit=100',
    );
    expect(Array.isArray(approvals.items)).toBe(true);
    await loginRoleInUi(supervisor, 'supervisor', config);
    await supervisor.goto('/supervisor/approvals');
    await expect(
      supervisor.getByRole('heading', { name: /approval/i }),
    ).toBeVisible();
    await supervisor.getByLabel('Approval page size').fill('20');
    await supervisor.getByLabel('Approval search').fill(receipt);
    await supervisor
      .getByRole('button', { name: /refresh approvals/i })
      .click();
    const approvalRows = supervisor
      .locator('button')
      .filter({ hasText: receipt });
    await expect(approvalRows).toHaveCount(1);
    if (await approvalRows.count()) {
      await approvalRows.first().click();
      await supervisor
        .getByLabel('Approval reason')
        .fill(`[${run.smokeRunId}] smoke approval decision`);
      await supervisor
        .getByRole('button', { name: /submit decision/i })
        .click();
      await expect(supervisor.getByText(/decision sent/i)).toBeVisible();
      const afterApproval = await supervisorApi.get<{ balanceKobo?: number }>(
        `/api/v1/customers/${config.activeCustomerId}`,
      );
      expect(Number(afterApproval.balanceKobo)).toBeGreaterThan(
        Number(beforeApproval.balanceKobo),
      );
    }
    await recordWorkflowEvidence(run, {
      group: 'cross-role',
      name: 'earn-approval',
      status: 'PASS',
      durationMs: 0,
      references: { receiptNumber: receipt },
    });
  } finally {
    await supervisorApi.dispose();
    await cashier.close();
    await supervisor.close();
  }
});
