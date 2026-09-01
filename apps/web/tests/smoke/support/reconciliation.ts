import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
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
  const target = resolve(run.outputDir, 'current-run.json');
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
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
  if (balance !== baseline.balanceKobo) failures.push('balance');
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
  if (baseline.outboxBacklog !== undefined && outbox !== baseline.outboxBacklog)
    failures.push('outbox backlog');
  if (failures.length > 0)
    throw new Error(`Smoke invariants failed: ${failures.join(', ')}`);
}

export async function writeReconciliationEvidence(
  run: SmokeRun,
  value: unknown,
): Promise<string> {
  return writeEvidenceJson(run, 'reconciliation.json', value);
}
