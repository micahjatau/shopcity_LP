import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';

test('Cashier business-rule guardrails reject invalid transaction attempts', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const api = await createRoleApiSession('cashier', config, run.smokeRunId);
  try {
    await loginRoleInUi(page, 'cashier', config);
    await page.goto(
      `/cashier/earn?card=${encodeURIComponent(config.inactiveCardSerial)}`,
    );
    await expect(
      page.getByText(
        /Lookup unavailable \(\d+\)|Lookup could not be completed/i,
      ),
    ).toBeVisible();
    await expect(
      api.post('/api/v1/transactions/earn', {
        cardSerialNumber: config.inactiveCardSerial,
        receiptNumber: `${run.smokeRunId}-API-INACTIVE`,
        purchaseAmountKobo: 100,
      }),
    ).rejects.toThrow(/403|409|422|failed/i);
    await recordWorkflowEvidence(run, {
      group: 'guardrail',
      name: 'inactive-card',
      status: 'PASS',
      durationMs: 0,
      references: { cardSerial: config.inactiveCardSerial },
    });
  } finally {
    await api.dispose();
  }
});

test('Duplicate receipts are rejected without a second financial mutation', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const adminApi = await createRoleApiSession('admin', config, run.smokeRunId);
  try {
    await loginRoleInUi(page, 'cashier', config);
    await page.goto(
      `/cashier/earn?card=${encodeURIComponent(config.activeCardSerial)}`,
    );
    await expect(page.getByText(/lookup resolved/i)).toBeVisible();
    const receipt = `${run.smokeRunId}-DUPLICATE-01`;
    await page.getByLabel('POS receipt number').fill(receipt);
    await page.getByLabel('Purchase amount').fill('100');
    await page.getByLabel('Purchase amount').blur();
    const firstResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/transactions/earn') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /submit earn/i }).click();
    await expect(
      page.getByText('Earn confirmed by backend contract.', { exact: true }),
    ).toBeVisible();
    const payload = (await (await firstResponse).json()) as {
      transactionId?: string;
      id?: string;
    };
    const transactionId = payload.transactionId ?? payload.id;
    if (!transactionId)
      throw new Error(
        'Duplicate guardrail setup did not return a transaction ID',
      );
    await registerFinancialArtifact(run, {
      kind: 'EARN',
      referenceId: transactionId,
      reversalRequired: true,
      reversalPath: `/api/v1/transactions/${transactionId}/reverse`,
    });
    const ledgerBeforeDuplicate = await adminApi.get<{ items?: unknown[] }>(
      `/api/v1/customers/${config.activeCustomerId}/ledger?limit=100`,
    );
    const ledgerCountBeforeDuplicate = ledgerBeforeDuplicate.items?.length ?? 0;
    await page.getByLabel('POS receipt number').fill(receipt);
    await page.getByLabel('Purchase amount').fill('100');
    await page.getByLabel('Purchase amount').blur();
    await page.getByRole('button', { name: /submit earn/i }).click();
    await expect(
      page.getByText(/already used|duplicate|physical receipt/i),
    ).toBeVisible();
    const ledgerAfter = await adminApi.get<{ items?: unknown[] }>(
      `/api/v1/customers/${config.activeCustomerId}/ledger?limit=100`,
    );
    expect(ledgerAfter.items?.length).toBe(ledgerCountBeforeDuplicate);
    await recordWorkflowEvidence(run, {
      group: 'guardrail',
      name: 'duplicate-receipt',
      status: 'PASS',
      durationMs: 0,
      references: { receiptNumber: receipt, transactionId },
    });
  } finally {
    await adminApi.dispose();
  }
});

test('Ineligible customers and insufficient balances cannot redeem', async () => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const api = await createRoleApiSession('cashier', config, run.smokeRunId);
  try {
    await expect(
      api.post('/api/v1/transactions/redeem', {
        cardSerialNumber: config.staffCardSerial,
        posReceiptNumber: `${run.smokeRunId}-STAFF-REDEEM-01`,
        basketAmountKobo: 100,
        requestedRedemptionKobo: 1,
      }),
    ).rejects.toThrow(/403|404|409|422|failed/i);
    await expect(
      api.post('/api/v1/transactions/redeem', {
        cardSerialNumber: config.activeCardSerial,
        posReceiptNumber: `${run.smokeRunId}-INSUFFICIENT-REDEEM-01`,
        basketAmountKobo: 100,
        requestedRedemptionKobo: 999999999,
      }),
    ).rejects.toThrow(/403|409|422|failed/i);
  } finally {
    await api.dispose();
  }
});
