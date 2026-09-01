import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';

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
  const beforeBalance = Number(
    before.availableBalanceKobo ?? before.balanceKobo,
  );
  const beforeLedger = await supervisorApi.get<{
    items?: Array<Record<string, unknown>>;
  }>(`/api/v1/customers/${config.activeCustomerId}/ledger?limit=100`);
  const receipt = `${run.smokeRunId}${attemptSuffix}-APPROVAL-01`;
  const approvalAmount =
    Number(process.env.PURCHASE_APPROVAL_THRESHOLD_KOBO ?? 200_000) + 1;
  let approvalId: string | null = null;
  let decisionCompleted = false;
  try {
    await loginRoleInUi(cashier, 'cashier', config);
    await cashier.goto('/cashier/earn');
    await cashier.evaluate(() => {
      localStorage.removeItem('shopcity-earnedraft-v1');
    });
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
      data?: { state?: string; approvalId?: string };
      state?: string;
      approvalId?: string;
    };
    expect((earnPayload.data ?? earnPayload).state).toBe('PENDING_APPROVAL');
    const earnData = responseData(earnPayload);
    const earnReceiptId =
      typeof earnData.id === 'string'
        ? earnData.id
        : transactionId(earnPayload);
    approvalId =
      typeof earnData.approvalId === 'string' ? earnData.approvalId : null;
    if (!earnReceiptId || !approvalId) {
      throw new Error(
        'Smoke approval Earn response did not contain receipt and approval IDs',
      );
    }
    const beforeApproval = await supervisorApi.get<{
      balanceKobo?: number;
      availableBalanceKobo?: number;
    }>(`/api/v1/customers/${config.activeCustomerId}`);
    expect(
      Number(beforeApproval.availableBalanceKobo ?? beforeApproval.balanceKobo),
    ).toBe(beforeBalance);
    const pendingLedger = await supervisorApi.get<{
      items?: Array<Record<string, unknown>>;
    }>(`/api/v1/customers/${config.activeCustomerId}/ledger?limit=100`);
    expect(pendingLedger.items?.length).toBe(beforeLedger.items?.length);
    expect(
      pendingLedger.items?.some(
        (item) =>
          item.receiptId === earnReceiptId || item.posReceiptNumber === receipt,
      ),
    ).toBe(false);
    const approvals = await supervisorApi.get<{ items?: unknown[] }>(
      '/api/v1/approvals?limit=100',
    );
    expect(Array.isArray(approvals.items)).toBe(true);
    expect(
      approvals.items?.some(
        (item) =>
          item &&
          typeof item === 'object' &&
          (item as Record<string, unknown>).id === approvalId &&
          (item as Record<string, unknown>).status === 'PENDING',
      ),
    ).toBe(true);
    await loginRoleInUi(supervisor, 'supervisor', config);
    await supervisor.goto('/supervisor/approvals');
    await expect(
      supervisor.getByRole('heading', { name: 'Approvals', exact: true }),
    ).toBeVisible();
    await supervisor.getByLabel('Approval page size').fill('20');
    await supervisor.getByLabel('Approval search').fill(approvalId);
    const refreshApprovals = supervisor.getByRole('button', {
      name: /refresh approvals/i,
    });
    const approvalRows = supervisor
      .locator('button')
      .filter({ hasText: approvalId });
    await expect
      .poll(
        async () => {
          await refreshApprovals.click();
          return approvalRows.count();
        },
        { timeout: 15_000 },
      )
      .toBe(1);
    await expect(approvalRows).toHaveCount(1);
    await approvalRows.first().click();
    await supervisor
      .getByLabel('Approval reason')
      .fill(`[${run.smokeRunId}] smoke approval decision`);
    const decisionResponse = supervisor.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/approvals/${approvalId}/decision`) &&
        response.request().method() === 'POST',
    );
    await supervisor.getByRole('button', { name: /submit decision/i }).click();
    await expect(supervisor.getByText(/decision sent/i)).toBeVisible();
    const decisionHttpResponse = await decisionResponse;
    expect(decisionHttpResponse.status()).toBe(200);
    const decisionPayload = await decisionHttpResponse.json();
    const decisionData = responseData(decisionPayload);
    const ledgerEntryId = decisionData.ledgerEntryId;
    if (typeof ledgerEntryId !== 'string') {
      throw new Error(
        'Smoke approval decision did not expose the settled ledger entry',
      );
    }
    await registerFinancialArtifact(run, {
      kind: 'EARN',
      referenceId: ledgerEntryId,
      reversalRequired: true,
      reversalPath: `/api/v1/transactions/${ledgerEntryId}/reverse`,
    });
    decisionCompleted = true;
    expect(decisionData).toMatchObject({
      id: approvalId,
      status: 'EXECUTED',
      receiptId: earnReceiptId,
    });

    const afterApproval = await supervisorApi.get<{
      balanceKobo?: number;
      availableBalanceKobo?: number;
    }>(`/api/v1/customers/${config.activeCustomerId}`);
    const creditKobo = Number(decisionData.creditKobo);
    expect(creditKobo).toBeGreaterThan(0);
    expect(
      Number(afterApproval.availableBalanceKobo ?? afterApproval.balanceKobo),
    ).toBe(beforeBalance + creditKobo);
    const ledger = await supervisorApi.get<{
      items?: Array<Record<string, unknown>>;
    }>(`/api/v1/customers/${config.activeCustomerId}/ledger?limit=100`);
    expect(
      ledger.items?.some(
        (item) =>
          item.id === ledgerEntryId &&
          item.receiptId === earnReceiptId &&
          item.type === 'EARN' &&
          item.direction === 'CREDIT' &&
          item.status === 'CONFIRMED',
      ),
    ).toBe(true);
    const settledTransaction = await supervisorApi.get<Record<string, unknown>>(
      `/api/v1/transactions/${ledgerEntryId}`,
    );
    expect(settledTransaction).toMatchObject({
      transactionId: ledgerEntryId,
      type: 'EARN',
      direction: 'CREDIT',
      state: 'CONFIRMED',
    });
    expect(typeof settledTransaction.expiresAt).toBe('string');
    const approvalsAfter = await supervisorApi.get<{
      items?: Array<Record<string, unknown>>;
    }>('/api/v1/approvals?limit=100');
    expect(
      approvalsAfter.items?.find((item) => item.id === approvalId)?.status,
    ).toBe('EXECUTED');
    await recordWorkflowEvidence(run, {
      group: 'cross-role',
      name: 'earn-approval',
      status: 'PASS',
      durationMs: 0,
      references: {
        receiptNumber: receipt,
        approvalId: approvalId ?? 'unknown',
        ledgerEntryId,
      },
    });
  } finally {
    if (approvalId && !decisionCompleted) {
      try {
        await supervisorApi.post(
          `/api/v1/approvals/${approvalId}/decision`,
          {
            decision: 'REJECTED',
            reason: `[${run.smokeRunId}] smoke cleanup after failed approval`,
          },
          `${run.smokeRunId}-reject-uncompleted-approval`,
        );
      } catch {
        // Teardown invariants will report any approval that remains pending.
      }
    }
    await supervisorApi.dispose();
    await cashier.close();
    await supervisor.close();
  }
});
