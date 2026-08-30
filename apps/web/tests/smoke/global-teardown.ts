import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';
import { loadSmokeConfig } from './config';
import { createRoleApiSession } from './support/api-client';
import { createApiInvariantReader } from './support/assertions';
import { resetMutableFixtures, type SmokeBaseline } from './support/fixtures';
import {
  assertPostRunInvariants,
  reconcileRun,
  writeReconciliationEvidence,
  type PersistedSmokeRun,
} from './support/reconciliation';
import type { SmokeRun } from './support/smoke-run';
import {
  FileSafetyLockStore,
  lockProductionSmoke,
} from './support/safety-lock';

interface SmokeRunState extends PersistedSmokeRun {
  outputDir: string;
  evidenceDir: string;
  candidateSha: string;
  baseline: SmokeBaseline;
}

export default async function globalTeardown(
  _config: FullConfig,
): Promise<void> {
  let adminApi: Awaited<ReturnType<typeof createRoleApiSession>> | undefined;
  let smokeConfig: ReturnType<typeof loadSmokeConfig> | undefined;
  let state: SmokeRunState | undefined;
  const statePath = resolve('test-results/smoke/current-run.json');

  try {
    state = JSON.parse(await readFile(statePath, 'utf8')) as SmokeRunState;
    const run: SmokeRun = {
      smokeRunId: state.smokeRunId,
      candidateSha: state.candidateSha,
      startedAt: new Date().toISOString(),
      outputDir: state.outputDir,
      evidenceDir: state.evidenceDir,
    };
    smokeConfig = loadSmokeConfig();
    adminApi = await createRoleApiSession('admin', smokeConfig, run.smokeRunId);
    await reconcileRun(run, adminApi, state.artifacts ?? []);
    await resetMutableFixtures(
      smokeConfig,
      adminApi,
      state.baseline,
      run.smokeRunId,
    );
    await assertPostRunInvariants(
      createApiInvariantReader(adminApi, smokeConfig),
      state.baseline,
    );
    await writeReconciliationEvidence(run, {
      smokeRunId: run.smokeRunId,
      result: 'PASS',
      artifacts: state.artifacts ?? [],
      mutableFixturesRestored: true,
      invariants: 'PASS',
    });
    const groups: Record<string, 'PASS' | 'FAIL'> = {};
    for (const filename of await readdir(run.evidenceDir)) {
      if (!filename.endsWith('.json') || filename === 'reconciliation.json')
        continue;
      try {
        const evidence = JSON.parse(
          await readFile(resolve(run.evidenceDir, filename), 'utf8'),
        ) as { group?: string; status?: 'PASS' | 'FAIL' };
        if (!evidence.group || !evidence.status) continue;
        const group =
          evidence.group === 'cross-role'
            ? 'crossRole'
            : evidence.group === 'guardrail'
              ? 'guardrails'
              : evidence.group;
        groups[group] =
          groups[group] === 'FAIL' || evidence.status === 'FAIL'
            ? 'FAIL'
            : 'PASS';
      } catch {
        groups.reconciliation = 'FAIL';
      }
    }
    groups.reconciliation = 'PASS';
    await writeFile(
      resolve(run.outputDir, 'smoke-evidence.json'),
      `${JSON.stringify(
        {
          smokeRunId: run.smokeRunId,
          environment: smokeConfig.environment,
          candidateSha: run.candidateSha,
          startedAt: state.startedAt,
          completedAt: new Date().toISOString(),
          result: 'PASS',
          groups,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      resolve(run.outputDir, 'teardown-complete.json'),
      `${JSON.stringify({ smokeRunId: run.smokeRunId, completedAt: new Date().toISOString() }, null, 2)}\n`,
      'utf8',
    );
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'unknown teardown error';
    if (smokeConfig?.environment === 'production' && state?.smokeRunId) {
      const safetyLock = new FileSafetyLockStore(
        resolve(
          process.env.SMOKE_SAFETY_LOCK_PATH ??
            'test-results/smoke/production-safety-lock.json',
        ),
      );
      await lockProductionSmoke(safetyLock, state.smokeRunId, reason);
    }
    throw new Error(`FAIL_RECONCILIATION: ${reason}`);
  } finally {
    await adminApi?.dispose();
  }
}
