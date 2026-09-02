import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SmokeApiError, type SmokeApiSession } from './api-client';
import type { SmokeBaseline } from './fixtures';
import type { SmokeRun } from './smoke-run';
import type { FinancialArtifact } from './evidence';
import { assertSafeEvidence, writeEvidenceJson } from './evidence';

export interface PersistedSmokeRun {
  smokeRunId: string;
  artifacts: FinancialArtifact[];
  [key: string]: unknown;
}

export interface InvariantReader {
  balanceKobo(): Promise<number>;
  unresolvedApprovals(): Promise<number>;
  openFraudFlags(): Promise<number>;
  deviceState(): Promise<{ id: string; status: string; branchId: string }>;
  cardState(): Promise<{
    serialNumber: string;
    status: string;
    customerId: string;
  }>;
  customerState(): Promise<{ id: string; status: string }>;
  offlineRetryRequired(): Promise<number>;
  creditLotHealthy(): Promise<boolean>;
  outboxBacklog(): Promise<number>;
}

export function classifySmokeOutcome(input: {
  testsPassed: boolean;
  reconciliationPassed: boolean;
}): 'PASS' | 'FAIL_TEST' | 'FAIL_RECONCILIATION' {
  if (!input.reconciliationPassed) return 'FAIL_RECONCILIATION';
  return input.testsPassed ? 'PASS' : 'FAIL_TEST';
}

async function persist(
  run: SmokeRun,
  persisted: PersistedSmokeRun,
): Promise<void> {
  assertSafeEvidence(persisted);
  const outputTarget = resolve(run.outputDir, 'current-run.json');
  const rootTarget = resolve('test-results/smoke/current-run.json');
  let rootPersisted: PersistedSmokeRun = persisted;
  try {
    const existingRoot = JSON.parse(
      await readFile(rootTarget, 'utf8'),
    ) as PersistedSmokeRun;
    rootPersisted = { ...existingRoot, ...persisted };
  } catch {
    // The output run file remains the source of truth for isolated usage.
  }

  const targets: Array<[string, PersistedSmokeRun]> = [
    [outputTarget, persisted],
    [rootTarget, rootPersisted],
  ];
  await Promise.all(
    targets.map(([target]) => mkdir(dirname(target), { recursive: true })),
  );
  await Promise.all(
    targets.map(async ([target, value]) => {
      const temporary = `${target}.tmp-${process.pid}`;
      await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
      await rename(temporary, target);
    }),
  );
}

export async function registerFinancialArtifact(
  run: SmokeRun,
  artifact: FinancialArtifact,
): Promise<void> {
  const target = resolve(run.outputDir, 'current-run.json');
  let current: PersistedSmokeRun = {
    smokeRunId: run.smokeRunId,
    artifacts: [],
  };
  try {
    current = JSON.parse(await readFile(target, 'utf8')) as PersistedSmokeRun;
  } catch {
    // The run file is created by setup; initialize it for isolated unit usage.
  }
  current.artifacts = [...current.artifacts, artifact];
  await persist(run, current);
}

function canonicalCompensation(
  artifact: FinancialArtifact,
  smokeRunId: string,
) {
  if (!artifact.reversalPath) {
    throw new Error(
      `Missing canonical reversal for ${artifact.kind}:${artifact.referenceId}`,
    );
  }
  if (
    !['EARN', 'REDEEM', 'ADJUSTMENT', 'OFFLINE_EARN'].includes(artifact.kind)
  ) {
    throw new Error(`Unsupported financial artifact kind: ${artifact.kind}`);
  }
  return {
    path: artifact.reversalPath,
    body: artifact.reversalBody ?? {
      reason: `[${smokeRunId}] smoke reconciliation`,
    },
  };
}

async function persistArtifacts(run: SmokeRun, artifacts: FinancialArtifact[]) {
  let current: PersistedSmokeRun = {
    smokeRunId: run.smokeRunId,
    artifacts: [],
  };
  try {
    current = JSON.parse(
      await readFile(resolve(run.outputDir, 'current-run.json'), 'utf8'),
    ) as PersistedSmokeRun;
  } catch {
    // Reconciliation remains usable for a recovered artifact-only run.
  }
  current.artifacts = artifacts;
  await persist(run, current);
}

export async function reconcileRun(
  run: SmokeRun,
  api: SmokeApiSession,
  artifacts: FinancialArtifact[],
): Promise<void> {
  for (const artifact of artifacts) {
    if (!artifact.reversalRequired || artifact.reconciled) continue;
    const compensation = canonicalCompensation(artifact, run.smokeRunId);
    try {
      await api.post(
        compensation.path,
        compensation.body,
        `${run.smokeRunId}-reconcile-${artifact.referenceId}`,
      );
    } catch (error) {
      if (
        !(error instanceof SmokeApiError) ||
        error.status !== 409 ||
        error.code !== 'TRANSACTION_ALREADY_REVERSED'
      ) {
        await persistArtifacts(run, artifacts);
        throw error;
      }
    }
    artifact.reconciled = true;
    // Persist after every compensation so an interrupted teardown is resumable.
    await persistArtifacts(run, artifacts);
  }
  await persistArtifacts(run, artifacts);
}

export async function waitForOutboxQuiescence(
  reader: Pick<InvariantReader, 'outboxBacklog'>,
  timeoutMs = 120_000,
  stableMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let previous = await reader.outboxBacklog();
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
    const received = await reader.outboxBacklog();
    if (received !== previous) {
      previous = received;
      stableSince = Date.now();
      continue;
    }
    if (previous === 0 && Date.now() - stableSince >= stableMs) return;
  }
  throw new Error(
    `Smoke outbox did not become empty (last observed backlog ${previous})`,
  );
}

export async function waitForOutboxBaseline(
  reader: Pick<InvariantReader, 'outboxBacklog'>,
  expected: number | undefined,
  timeoutMs = 120_000,
): Promise<void> {
  if (expected === undefined) return;

  const deadline = Date.now() + timeoutMs;
  let received = await reader.outboxBacklog();
  while (received !== expected && Date.now() < deadline) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
    received = await reader.outboxBacklog();
  }
  if (received !== expected) {
    throw new Error(
      `Smoke outbox did not return to baseline (expected ${expected}, received ${received})`,
    );
  }
}

export async function assertPostRunInvariants(
  reader: InvariantReader,
  baseline: SmokeBaseline,
): Promise<void> {
  const [
    balance,
    approvals,
    fraudFlags,
    device,
    card,
    customer,
    offline,
    lots,
    outbox,
  ] = await Promise.all([
    reader.balanceKobo(),
    reader.unresolvedApprovals(),
    reader.openFraudFlags(),
    reader.deviceState(),
    reader.cardState(),
    reader.customerState(),
    reader.offlineRetryRequired(),
    reader.creditLotHealthy(),
    reader.outboxBacklog(),
  ]);

  const failures: string[] = [];
  if (balance !== baseline.balanceKobo) {
    failures.push(
      `balance (expected ${baseline.balanceKobo}, received ${balance})`,
    );
  }
  if (
    baseline.unresolvedApprovals !== undefined &&
    approvals !== baseline.unresolvedApprovals
  )
    failures.push('unresolved approvals');
  if (
    baseline.openFraudFlags !== undefined &&
    fraudFlags !== baseline.openFraudFlags
  )
    failures.push('open fraud flags');
  if (
    device.id !== baseline.device.id ||
    device.status !== baseline.device.status ||
    device.branchId !== baseline.device.branchId
  )
    failures.push('device');
  if (
    card.serialNumber !== baseline.card.serialNumber ||
    card.status !== baseline.card.status ||
    card.customerId !== baseline.card.customerId
  )
    failures.push('card');
  if (
    customer.id !== baseline.customer.id ||
    customer.status !== baseline.customer.status
  )
    failures.push('customer');
  if (offline !== 0) failures.push('offline retry records');
  if (!lots) failures.push('credit lots');
  if (
    baseline.outboxBacklog !== undefined &&
    outbox !== baseline.outboxBacklog
  ) {
    failures.push(
      `outbox backlog (expected ${baseline.outboxBacklog}, received ${outbox})`,
    );
  }
  if (failures.length > 0)
    throw new Error(`Smoke invariants failed: ${failures.join(', ')}`);
}

export async function writeReconciliationEvidence(
  run: SmokeRun,
  value: unknown,
): Promise<string> {
  return writeEvidenceJson(run, 'reconciliation.json', value);
}
