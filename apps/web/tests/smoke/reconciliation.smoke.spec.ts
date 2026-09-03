import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { assertSafeEvidence, type FinancialArtifact } from './support/evidence';
import { measureWorkflow } from './support/timing';
import {
  assertPostRunInvariants,
  classifySmokeOutcome,
  recoverPendingFinancialWrites,
  reconcileRun,
  registerFinancialArtifact,
} from './support/reconciliation';
import type { SmokeApiSession } from './support/api-client';
import type { SmokeBaseline } from './support/fixtures';
import type { SmokeRun } from './support/smoke-run';

async function temporaryRun(): Promise<SmokeRun> {
  const root = await mkdtemp(resolve(tmpdir(), 'shopcity-smoke-'));
  return {
    smokeRunId: 'SMOKE-TEST-01',
    candidateSha: 'a'.repeat(40),
    startedAt: new Date().toISOString(),
    outputDir: root,
    evidenceDir: root,
  };
}

test('classifies reconciliation failures above test failures', () => {
  expect(
    classifySmokeOutcome({ testsPassed: true, reconciliationPassed: true }),
  ).toBe('PASS');
  expect(
    classifySmokeOutcome({ testsPassed: false, reconciliationPassed: true }),
  ).toBe('FAIL_TEST');
  expect(
    classifySmokeOutcome({ testsPassed: true, reconciliationPassed: false }),
  ).toBe('FAIL_RECONCILIATION');
});

test('rejects secret-like evidence fields before serialization', () => {
  expect(() => assertSafeEvidence({ password: 'never-write' })).toThrow(
    /Unsafe evidence field/,
  );
  expect(() =>
    assertSafeEvidence({ nested: { csrfToken: 'never-write' } }),
  ).toThrow(/Unsafe evidence field/);
});

test('persists artifacts and calls canonical reconciliation endpoint', async () => {
  const run = await temporaryRun();
  const calls: Array<{ path: string; key?: string }> = [];
  const api = {
    context: {} as SmokeApiSession['context'],
    get: async () => ({}),
    post: async <T>(path: string, _body: unknown, key?: string) => {
      calls.push({ path, key });
      return {} as T;
    },
    patch: async () => ({}),
    dispose: async () => undefined,
  } as SmokeApiSession;
  const artifact: FinancialArtifact = {
    kind: 'EARN',
    referenceId: 'receipt-1',
    reversalRequired: true,
    reversalPath: '/api/v1/transactions/receipt-1/reverse',
  };

  await registerFinancialArtifact(run, artifact);
  const persisted = JSON.parse(
    await readFile(resolve(run.outputDir, 'current-run.json'), 'utf8'),
  ) as {
    artifacts: FinancialArtifact[];
  };
  expect(persisted.artifacts).toEqual([artifact]);

  await reconcileRun(run, api, persisted.artifacts);
  expect(calls).toEqual([
    {
      path: '/api/v1/transactions/receipt-1/reverse',
      key: 'SMOKE-TEST-01-reconcile-receipt-1',
    },
  ]);
});

test('recovers pending writes before reconciliation', async () => {
  const run = await temporaryRun();
  await writeFile(
    resolve(run.outputDir, 'current-run.json'),
    JSON.stringify({
      smokeRunId: run.smokeRunId,
      artifacts: [],
      pendingFinancialWrites: [
        {
          kind: 'ADJUSTMENT',
          path: '/api/v1/adjustments',
          body: { customerId: 'customer-1', kind: 'CREDIT', amountKobo: 1 },
          idempotencyKey: 'SMOKE-TEST-01-pending',
          reversalPath: '/api/v1/transactions/{id}/reverse',
        },
      ],
    }),
  );
  const api = {
    context: {} as SmokeApiSession['context'],
    get: async () => ({}),
    post: async <T>(_path: string, _body: unknown, _key?: string) =>
      ({ transactionId: 'transaction-1' }) as T,
    patch: async () => ({}),
    dispose: async () => undefined,
  } as SmokeApiSession;

  await recoverPendingFinancialWrites(run, api);
  const persisted = JSON.parse(
    await readFile(resolve(run.outputDir, 'current-run.json'), 'utf8'),
  ) as { artifacts: FinancialArtifact[]; pendingFinancialWrites: unknown[] };
  expect(persisted.pendingFinancialWrites).toEqual([]);
  expect(persisted.artifacts[0]).toMatchObject({
    referenceId: 'transaction-1',
    reversalPath: '/api/v1/transactions/transaction-1/reverse',
  });
});

test('post-run invariants reject a changed baseline', async () => {
  const baseline: SmokeBaseline = {
    customer: { id: 'customer', status: 'ACTIVE', fullName: 'Smoke Customer' },
    card: { serialNumber: 'CARD-1', status: 'ACTIVE', customerId: 'customer' },
    device: { id: 'device', status: 'ACTIVE', branchId: 'branch' },
    balanceKobo: 1000,
  };
  const reader = {
    balanceKobo: async () => 900,
    unresolvedApprovals: async () => 0,
    openFraudFlags: async () => 0,
    deviceState: async () => baseline.device,
    cardState: async () => baseline.card,
    customerState: async () => baseline.customer,
    offlineRetryRequired: async () => 0,
    creditLotHealthy: async () => true,
    outboxBacklog: async () => 0,
  };

  await expect(assertPostRunInvariants(reader, baseline)).rejects.toThrow(
    /balance/,
  );
});

test('workflow timing returns the action value and non-negative duration', async () => {
  const measured = await measureWorkflow('lookup', async () => 'complete');
  expect(measured.value).toBe('complete');
  expect(measured.durationMs).toBeGreaterThanOrEqual(0);
});
