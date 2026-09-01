import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';

type OfflineRecordSnapshot = {
  localId: string;
  idempotencyKey: string;
  cashierId: string;
  branchId: string;
  deviceId: string;
  receiptNumber: string;
  receiptWeekStart: string;
  purchaseAmountKobo: number;
  syncState: string;
  serverTransactionId?: string | null;
  serverApprovalId?: string | null;
};

async function offlineEarnRecords(
  page: import('@playwright/test').Page,
): Promise<OfflineRecordSnapshot[]> {
  return page.evaluate(
    () =>
      new Promise<OfflineRecordSnapshot[]>((resolve, reject) => {
        const request = indexedDB.open('shopcity-offline', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('earn-records')) {
            db.createObjectStore('earn-records', { keyPath: 'localId' });
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('earn-records')) {
            db.close();
            reject(new Error('Offline earn store is unavailable'));
            return;
          }
          const transaction = db.transaction('earn-records', 'readonly');
          let records: OfflineRecordSnapshot[] = [];
          transaction.oncomplete = () => {
            db.close();
            resolve(records);
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error ?? new Error('Offline queue read failed'));
          };
          const getAllRequest = transaction
            .objectStore('earn-records')
            .getAll();
          getAllRequest.onsuccess = () => {
            records = getAllRequest.result as OfflineRecordSnapshot[];
          };
          getAllRequest.onerror = () =>
            reject(
              getAllRequest.error ?? new Error('Offline queue read failed'),
            );
        };
        request.onerror = () =>
          reject(request.error ?? new Error('Offline queue unavailable'));
      }),
  );
}

async function offlineEarnCount(page: import('@playwright/test').Page) {
  return (await offlineEarnRecords(page)).length;
}

test('staging Offline Earn persists locally and keeps Redeem conservative', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const adminApi = await createRoleApiSession('admin', config, run.smokeRunId);
  const offlineReceipt = `${run.smokeRunId}-OFFLINE-01`;
  const offlineRedeemReceipt = `${run.smokeRunId}-OFFLINE-REDEEM-01`;

  try {
    const beforeCustomer = await adminApi.get<Record<string, unknown>>(
      `/api/v1/customers/${config.activeCustomerId}`,
    );
    const beforeBalance = Number(
      beforeCustomer.availableBalanceKobo ?? beforeCustomer.balanceKobo,
    );
    const ledgerBeforeRedeem = await adminApi.get<{ items?: unknown[] }>(
      `/api/v1/customers/${config.activeCustomerId}/ledger?limit=100`,
    );

    if (config.environment === 'production' && !config.allowOfflineProduction) {
      await recordWorkflowEvidence(run, {
        group: 'offline',
        name: 'offline-earn-policy-skip',
        status: 'PASS',
        durationMs: 0,
        references: { policy: 'SMOKE_ALLOW_OFFLINE_PRODUCTION=false' },
      });
      return;
    }

    await loginRoleInUi(page, 'cashier', config);
    await page.goto(
      `/cashier/earn?card=${encodeURIComponent(config.activeCardSerial)}`,
    );
    await expect(page.getByText(/lookup resolved/i)).toBeVisible();
    const offlineCountBefore = await offlineEarnCount(page);
    await page.route('**/api/v1/transactions/earn', (route) =>
      route.abort('internetdisconnected'),
    );
    await page.getByLabel('POS receipt number').fill(offlineReceipt);
    await page.getByLabel('Purchase amount').fill('100');
    await page.getByLabel('Purchase amount').blur();
    await page.getByRole('button', { name: /submit earn/i }).click();
    await expect(
      page.getByText('Earn could not be submitted. Saved locally for sync.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect
      .poll(() => offlineEarnCount(page))
      .toBe(offlineCountBefore + 1);
    const queuedRecord = (await offlineEarnRecords(page)).find(
      (record) => record.receiptNumber === offlineReceipt,
    );
    expect(queuedRecord).toMatchObject({
      cashierId: config.cashier.userId,
      branchId: config.branchId,
      deviceId: config.deviceId,
      receiptNumber: offlineReceipt,
      purchaseAmountKobo: 10_000,
      syncState: 'waiting-to-sync',
    });

    await page.unroute('**/api/v1/transactions/earn');
    await page.goto('/cashier/sync');
    await expect(page.getByRole('heading', { name: /sync/i })).toBeVisible();
    const queuedRow = page.getByRole('row').filter({ hasText: offlineReceipt });
    await expect(queuedRow).toContainText('waiting-to-sync');

    await page.goto(
      `/cashier/redeem?card=${encodeURIComponent(config.activeCardSerial)}`,
    );
    await expect(page.getByText(/lookup resolved/i)).toBeVisible();
    await page.route('**/api/v1/transactions/redeem', (route) =>
      route.abort('internetdisconnected'),
    );
    await page.getByLabel('POS receipt number').fill(offlineRedeemReceipt);
    await page.getByLabel('Basket amount').fill('100');
    await page.getByLabel('Basket amount').blur();
    await page.getByLabel('Requested redemption').fill('1');
    await page.getByLabel('Requested redemption').blur();
    const offlineCountBeforeRedeem = await offlineEarnCount(page);
    await page.getByRole('button', { name: /submit redemption/i }).click();
    await expect(
      page.getByText(/offline redeem|cannot|unavailable|error/i),
    ).toBeVisible();
    await expect
      .poll(() => offlineEarnCount(page))
      .toBe(offlineCountBeforeRedeem);
    const ledgerAfterRedeem = await adminApi.get<{ items?: unknown[] }>(
      `/api/v1/customers/${config.activeCustomerId}/ledger?limit=100`,
    );
    expect(ledgerAfterRedeem.items?.length).toBe(
      ledgerBeforeRedeem.items?.length,
    );

    await page.unroute('**/api/v1/transactions/redeem');
    await page.goto('/cashier/sync');
    const syncResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/offline-sync/earn-batch') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /submit batch/i }).click();
    const syncPayload = (await (await syncResponse).json()) as {
      data?: {
        data?: { records?: Array<Record<string, unknown>> };
        records?: Array<Record<string, unknown>>;
      };
      records?: Array<Record<string, unknown>>;
    };
    const syncData = syncPayload.data?.data ?? syncPayload.data;
    const syncedRecords = syncData?.records ?? syncPayload.records ?? [];
    expect(syncedRecords).toHaveLength(1);
    const synced = syncedRecords[0];
    expect(synced?.localId).toBe(queuedRecord?.localId);
    expect(synced?.status).toBe('CONFIRMED');
    expect(synced?.retryable).toBe(false);
    expect(typeof synced?.transactionId).toBe('string');
    expect(typeof synced?.creditEarnedKobo).toBe('number');

    const transactionId = synced?.transactionId;
    if (typeof transactionId !== 'string') {
      throw new Error('Offline sync did not return a confirmed transaction ID');
    }
    await registerFinancialArtifact(run, {
      kind: 'OFFLINE_EARN',
      referenceId: transactionId,
      reversalRequired: true,
      reversalPath: `/api/v1/transactions/${transactionId}/reverse`,
    });

    const syncedRow = page.getByRole('row').filter({ hasText: offlineReceipt });
    await expect(syncedRow).toContainText('confirmed');
    await expect(syncedRow).toContainText(transactionId);

    const transaction = await adminApi.get<Record<string, unknown>>(
      `/api/v1/transactions/${transactionId}`,
    );
    expect(transaction).toMatchObject({
      transactionId,
      ledgerEntryId: transactionId,
      type: 'EARN',
      direction: 'CREDIT',
      state: 'CONFIRMED',
    });
    const creditKobo = Number(transaction.creditKobo);
    expect(creditKobo).toBe(Number(synced?.creditEarnedKobo));
    expect(creditKobo).toBeGreaterThan(0);

    const ledgerAfterSync = await adminApi.get<{
      items?: Array<Record<string, unknown>>;
    }>(`/api/v1/customers/${config.activeCustomerId}/ledger?limit=100`);
    expect(
      ledgerAfterSync.items?.some(
        (item) =>
          item.id === transactionId &&
          item.type === 'EARN' &&
          item.direction === 'CREDIT' &&
          item.status === 'CONFIRMED',
      ),
    ).toBe(true);
    const afterCustomer = await adminApi.get<Record<string, unknown>>(
      `/api/v1/customers/${config.activeCustomerId}`,
    );
    expect(
      Number(afterCustomer.availableBalanceKobo ?? afterCustomer.balanceKobo),
    ).toBe(beforeBalance + creditKobo);

    await recordWorkflowEvidence(run, {
      group: 'offline',
      name: 'offline-earn',
      status: 'PASS',
      durationMs: 0,
      references: { receiptNumber: offlineReceipt, transactionId },
    });
  } finally {
    await page.unroute('**/api/v1/transactions/earn').catch(() => undefined);
    await page.unroute('**/api/v1/transactions/redeem').catch(() => undefined);
    await adminApi.dispose();
  }
});
