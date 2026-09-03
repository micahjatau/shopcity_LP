import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { request, type FullConfig } from '@playwright/test';
import { loadSmokeConfig } from './config';
import {
  createRoleApiSession,
  createSmokeApiSession,
  type SmokeRole,
} from './support/api-client';
import { createApiInvariantReader } from './support/assertions';
import {
  resetMutableFixtures,
  resolveTaggedSmokeFraudFlags,
  type SmokeBaseline,
} from './support/fixtures';
import {
  assertPostRunInvariants,
  reconcileRun,
  waitForOutboxBaseline,
  writeReconciliationEvidence,
  type PersistedSmokeRun,
} from './support/reconciliation';
import type { SmokeRun } from './support/smoke-run';
import {
  FileSafetyLockStore,
  lockProductionSmoke,
} from './support/safety-lock';
import { smokeAuthDir } from './support/smoke-run';

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
    const invariantReader = createApiInvariantReader(adminApi, smokeConfig);
    await waitForOutboxBaseline(invariantReader, state.baseline.outboxBacklog);
    await resolveTaggedSmokeFraudFlags(
      adminApi,
      run.smokeRunId,
      `[${run.smokeRunId}] resolve smoke fraud finding`,
    );
    await assertPostRunInvariants(invariantReader, state.baseline);
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
    await adminApi?.post('/api/v1/auth/logout', {}).catch(() => undefined);
    await adminApi?.dispose();
    if (state && smokeConfig) {
      const authDir = smokeAuthDir(state);
      for (const role of ['admin', 'supervisor', 'cashier'] as SmokeRole[]) {
        let context: Awaited<ReturnType<typeof request.newContext>> | undefined;
        try {
          context = await request.newContext({
            baseURL: smokeConfig.frontendUrl,
          });
          const authState = JSON.parse(
            await readFile(resolve(authDir, `${role}.json`), 'utf8'),
          ) as { cookies?: Parameters<typeof context.addCookies>[0] };
          await context.addCookies(authState.cookies ?? []);
          await createSmokeApiSession(context, state.smokeRunId).post(
            '/api/v1/auth/logout',
            {},
          );
        } catch {
          // Teardown remains best-effort after reconciliation; evidence never
          // includes the temporary authentication state.
        } finally {
          await context?.dispose();
        }
      }
      await rm(authDir, { recursive: true, force: true });
    }
  }
}
