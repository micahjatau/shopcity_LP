import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';

test('Supervisor can open the transaction surface for reversal', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  await loginRoleInUi(page, 'supervisor', config);
  await page.goto('/supervisor/transactions');
  await expect(
    page.getByRole('heading', { name: 'Transaction review' }),
  ).toBeVisible();
  await recordWorkflowEvidence(run, {
    group: 'cross-role',
    name: 'reversal-surface',
    status: 'PASS',
    durationMs: 0,
    references: { route: '/supervisor/transactions', runId: run.smokeRunId },
  });
});

test('Supervisor reverses a confirmed Earn and preserves its original evidence', async ({
  browser,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const attemptSuffix = test.info().retry ? `-RETRY-${test.info().retry}` : '';
  const receipt = `${run.smokeRunId}${attemptSuffix}-REVERSAL-01`;
  const cashier = await browser.newPage();
  const supervisor = await browser.newPage();
  const adminApi = await createRoleApiSession('admin', config, run.smokeRunId);
  let originalTransactionId: string | null = null;
  try {
    const before = await adminApi.get<Record<string, unknown>>(
      `/api/v1/customers/${config.activeCustomerId}`,
    );
    const beforeBalance = Number(
      before.availableBalanceKobo ?? before.balanceKobo,
    );

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
    await cashier.getByLabel('Purchase amount').fill('100');
    await cashier.getByLabel('Purchase amount').blur();
    const earnResponse = cashier.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/transactions/earn') &&
        response.request().method() === 'POST',
    );
    await cashier.getByRole('button', { name: /submit earn/i }).click();
    await expect(
      cashier.getByText('Earn confirmed by backend contract.', { exact: true }),
    ).toBeVisible();
    const earnPayload = await (await earnResponse).json();
    const earnData = responseData(earnPayload);
    originalTransactionId =
      typeof earnData.transactionId === 'string'
        ? earnData.transactionId
        : null;
    if (!originalTransactionId) {
      throw new Error('Reversal smoke Earn did not return a transaction ID');
    }

    await registerFinancialArtifact(run, {
      kind: 'EARN',
      referenceId: originalTransactionId,
      reversalRequired: true,
      reversalPath: `/api/v1/transactions/${originalTransactionId}/reverse`,
    });

    const original = await adminApi.get<Record<string, unknown>>(
      `/api/v1/transactions/${originalTransactionId}`,
    );
    expect(original).toMatchObject({
      transactionId: originalTransactionId,
      type: 'EARN',
      direction: 'CREDIT',
      state: 'CONFIRMED',
    });
    const creditKobo = Number(original.creditKobo);
    expect(creditKobo).toBeGreaterThan(0);
    expect(Number(original.availableBalanceKobo)).toBe(
      beforeBalance + creditKobo,
    );

    await loginRoleInUi(supervisor, 'supervisor', config);
    await supervisor.goto('/supervisor/transactions');
    await supervisor.getByLabel('Transaction ID').fill(originalTransactionId);
    await supervisor.getByRole('button', { name: /^load$/i }).click();
    await expect(
      supervisor.getByText(`Loaded transaction ${originalTransactionId}.`, {
        exact: true,
      }),
    ).toBeVisible();
    await supervisor
      .getByLabel('Reversal reason')
      .fill(`[${run.smokeRunId}] smoke reversal`);
    await supervisor.getByLabel('Reversal confirmation').fill('REVERSE');
    const reversalResponse = supervisor.waitForResponse(
      (response) =>
        response
          .url()
          .includes(`/api/v1/transactions/${originalTransactionId}/reverse`) &&
        response.request().method() === 'POST',
    );
    await supervisor
      .getByRole('button', { name: /reverse transaction/i })
      .click();
    const reversalHttpResponse = await reversalResponse;
    expect(reversalHttpResponse.status()).toBe(201);
    await expect(
      supervisor.getByText(/Loaded transaction .*\./i),
    ).toBeVisible();

    const reversalPayload = await reversalHttpResponse.json();
    const reversalData = responseData(reversalPayload);
    expect(reversalData).toMatchObject({
      originalTransactionId,
      originalTransactionType: 'EARN',
      reversedAmountKobo: creditKobo,
    });
    const reversalTransactionId = reversalData.transactionId;
    expect(typeof reversalTransactionId).toBe('string');
    if (typeof reversalTransactionId !== 'string') {
      throw new Error('Reversal response did not return its ledger entry ID');
    }

    const reversal = await adminApi.get<Record<string, unknown>>(
      `/api/v1/transactions/${reversalTransactionId}`,
    );
    expect(reversal).toMatchObject({
      transactionId: reversalTransactionId,
      type: 'ADJUSTMENT',
      direction: 'DEBIT',
      state: 'CONFIRMED',
    });
    expect(reversal.reversal).toMatchObject({
      originalTransactionId,
    });

    const after = await adminApi.get<Record<string, unknown>>(
      `/api/v1/customers/${config.activeCustomerId}`,
    );
    expect(Number(after.availableBalanceKobo ?? after.balanceKobo)).toBe(
      beforeBalance,
    );
    const originalAfter = await adminApi.get<Record<string, unknown>>(
      `/api/v1/transactions/${originalTransactionId}`,
    );
    expect(originalAfter.transactionId).toBe(originalTransactionId);
    expect(originalAfter.state).toBe('CONFIRMED');

    await recordWorkflowEvidence(run, {
      group: 'cross-role',
      name: 'reversal',
      status: 'PASS',
      durationMs: 0,
      references: {
        receiptNumber: receipt,
        originalTransactionId,
        reversalTransactionId,
      },
    });
  } finally {
    await adminApi.dispose();
    await cashier.close();
    await supervisor.close();
  }
});

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
