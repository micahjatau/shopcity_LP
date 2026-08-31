import { expect, test } from '@playwright/test';
import { loadSmokeConfig } from '../config';
import { createRoleApiSession } from '../support/api-client';
import { loginRoleInUi } from '../support/auth';
import { loadSmokeRun } from '../support/smoke-run';
import { recordWorkflowEvidence } from '../support/evidence';
import { registerFinancialArtifact } from '../support/reconciliation';

async function offlineEarnCount(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('shopcity-offline', 1);
        request.onsuccess = () => {
          const db = request.result;
          const countRequest = db
            .transaction('earn-records', 'readonly')
            .objectStore('earn-records')
            .count();
          countRequest.onsuccess = () => {
            db.close();
            resolve(countRequest.result);
          };
          countRequest.onerror = () => reject(countRequest.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

test('staging Offline Earn persists locally and keeps Redeem conservative', async ({
  page,
}) => {
  const config = loadSmokeConfig();
  const run = loadSmokeRun();
  const adminApi = await createRoleApiSession('admin', config, run.smokeRunId);
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
    await adminApi.dispose();
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
  await page
    .getByLabel('POS receipt number')
    .fill(`${run.smokeRunId}-OFFLINE-01`);
  await page.getByLabel('Purchase amount').fill('100');
  await page.getByLabel('Purchase amount').blur();
  await page.getByRole('button', { name: /submit earn/i }).click();
  await expect(page.getByText(/saved locally|waiting|sync/i)).toBeVisible();
  await expect.poll(() => offlineEarnCount(page)).toBe(offlineCountBefore + 1);
  await page.unroute('**/api/v1/transactions/earn');
  await page.goto('/cashier/sync');
  await expect(page.getByRole('heading', { name: /sync/i })).toBeVisible();
  await page.goto(
    `/cashier/redeem?card=${encodeURIComponent(config.activeCardSerial)}`,
  );
  await expect(page.getByText(/lookup resolved/i)).toBeVisible();
  await page.route('**/api/v1/transactions/redeem', (route) =>
    route.abort('internetdisconnected'),
  );
  await page
    .getByLabel('POS receipt number')
    .fill(`${run.smokeRunId}-OFFLINE-REDEEM-01`);
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
    data?: { records?: Array<Record<string, unknown>> };
    records?: Array<Record<string, unknown>>;
  };
  const syncedRecords = syncPayload.data?.records ?? syncPayload.records ?? [];
  expect(syncedRecords.length).toBeGreaterThan(0);
  const confirmed = syncedRecords.find((record) =>
    String(record.status ?? '')
      .toUpperCase()
      .includes('CONFIRMED'),
  );
  const transactionId = confirmed?.transactionId;
  if (typeof transactionId === 'string') {
    await registerFinancialArtifact(run, {
      kind: 'OFFLINE_EARN',
      referenceId: transactionId,
      reversalRequired: true,
      reversalPath: `/api/v1/transactions/${transactionId}/reverse`,
    });
  }
  await recordWorkflowEvidence(run, {
    group: 'offline',
    name: 'offline-earn',
    status: 'PASS',
    durationMs: 0,
    references: { receiptNumber: `${run.smokeRunId}-OFFLINE-01` },
  });
  await adminApi.dispose();
});
