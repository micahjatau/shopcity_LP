import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';

function transactionId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  for (const key of ['transactionId', 'id', 'receiptId']) {
    if (typeof record[key] === 'string') return record[key];
  }
  return record.data ? transactionId(record.data) : null;
}

test('Cashier Earn requiring approval is visible to Supervisor', async ({
  browser,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const attemptSuffix = test.info().retry ? `-RETRY-${test.info().retry}` : '';
  const cashier = await browser.newPage();
  const supervisor = await browser.newPage();
  const supervisorApi = await createRoleApiSession(
    'supervisor',
    config,
    run.smokeRunId,
  );
  const before = await supervisorApi.get<{
    balanceKobo?: number;
    availableBalanceKobo?: number;
  }>(`/api/v1/customers/${config.activeCustomerId}`);
  const receipt = `${run.smokeRunId}${attemptSuffix}-APPROVAL-01`;
  const approvalAmount =
    Number(process.env.PURCHASE_APPROVAL_THRESHOLD_KOBO ?? 200_000) + 1;
  try {
    await loginRoleInUi(cashier, 'cashier', config);
    await cashier.goto(
      `/cashier/earn?card=${encodeURIComponent(config.activeCardSerial)}`,
    );
    await expect(cashier.getByText(/lookup resolved/i)).toBeVisible();
    await cashier.getByLabel('POS receipt number').fill(receipt);
    await cashier.getByLabel('Purchase amount').fill(String(approvalAmount));
    await cashier.getByLabel('Purchase amount').blur();
    const earnResponse = cashier.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/transactions/earn') &&
        response.request().method() === 'POST',
    );
    await cashier.getByRole('button', { name: /submit earn/i }).click();
    await expect(
      cashier.getByText('Earn awaiting approval.', { exact: true }),
    ).toBeVisible();
    const earnPayload = (await (await earnResponse).json()) as {
      data?: { state?: string };
      state?: string;
    };
    expect((earnPayload.data ?? earnPayload).state).toBe('PENDING_APPROVAL');
    const earnId = transactionId(earnPayload);
    if (!earnId) {
      throw new Error(
        'Smoke approval Earn response did not contain a transaction ID',
      );
    }
    await registerFinancialArtifact(run, {
      kind: 'EARN',
      referenceId: earnId,
      reversalRequired: true,
      reversalPath: `/api/v1/transactions/${earnId}/reverse`,
    });
    const beforeApproval = await supervisorApi.get<{
      balanceKobo?: number;
      availableBalanceKobo?: number;
    }>(`/api/v1/customers/${config.activeCustomerId}`);
    expect(
      beforeApproval.availableBalanceKobo ?? beforeApproval.balanceKobo,
    ).toBe(before.availableBalanceKobo ?? before.balanceKobo);
    const approvals = await supervisorApi.get<{ items?: unknown[] }>(
      '/api/v1/approvals?limit=100',
    );
    expect(Array.isArray(approvals.items)).toBe(true);
    await loginRoleInUi(supervisor, 'supervisor', config);
    await supervisor.goto('/supervisor/approvals');
    await expect(
      supervisor.getByRole('heading', { name: 'Approvals', exact: true }),
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
      const afterApproval = await supervisorApi.get<{
        balanceKobo?: number;
        availableBalanceKobo?: number;
      }>(`/api/v1/customers/${config.activeCustomerId}`);
      expect(
        Number(afterApproval.availableBalanceKobo ?? afterApproval.balanceKobo),
      ).toBeGreaterThan(
        Number(
          beforeApproval.availableBalanceKobo ?? beforeApproval.balanceKobo,
        ),
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
