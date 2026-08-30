import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';
import { loadSmokeConfig } from './config';
import {
  captureBaseline,
  preflightFixtures,
  resetMutableFixtures,
} from './support/fixtures';
import { createRoleApiSession } from './support/api-client';
import { createSmokeRun } from './support/smoke-run';
import {
  assertProductionUnlocked,
  FileSafetyLockStore,
} from './support/safety-lock';

export default async function globalSetup(_config: FullConfig): Promise<void> {
  let adminApi: Awaited<ReturnType<typeof createRoleApiSession>> | undefined;
  try {
    const smokeConfig = loadSmokeConfig();
    const safetyLock = new FileSafetyLockStore(
      resolve(
        process.env.SMOKE_SAFETY_LOCK_PATH ??
          'test-results/smoke/production-safety-lock.json',
      ),
    );
    await assertProductionUnlocked(smokeConfig.environment, safetyLock);
    const run = createSmokeRun(smokeConfig.candidateSha);
    adminApi = await createRoleApiSession('admin', smokeConfig, run.smokeRunId);
    const authStateDir = resolve(run.outputDir, 'auth');
    await mkdir(authStateDir, { recursive: true });
    await adminApi.context.storageState({
      path: resolve(authStateDir, 'admin.json'),
    });
    const supervisorApi = await createRoleApiSession(
      'supervisor',
      smokeConfig,
      run.smokeRunId,
    );
    try {
      await supervisorApi.context.storageState({
        path: resolve(authStateDir, 'supervisor.json'),
      });
    } finally {
      await supervisorApi.dispose();
    }
    await preflightFixtures(smokeConfig, adminApi);
    const baseline = await captureBaseline(smokeConfig, adminApi);
    await resetMutableFixtures(smokeConfig, adminApi, baseline, run.smokeRunId);

    // Reset mutable fixtures before authenticating the device-bound cashier.
    // A previous interrupted run may have left the device inactive.
    const cashierApi = await createRoleApiSession(
      'cashier',
      smokeConfig,
      run.smokeRunId,
    );
    try {
      await cashierApi.context.storageState({
        path: resolve(authStateDir, 'cashier.json'),
      });
    } finally {
      await cashierApi.dispose();
    }

    const metadata = {
      ...run,
      environment: smokeConfig.environment,
      tenantId: smokeConfig.tenantId,
      branchId: smokeConfig.branchId,
      deviceId: smokeConfig.deviceId,
      baseline,
      artifacts: [],
    };
    const serializedMetadata = `${JSON.stringify(metadata, null, 2)}\n`;
    await Promise.all([
      writeFile(
        resolve(run.outputDir, 'current-run.json'),
        serializedMetadata,
        'utf8',
      ),
      writeFile(
        resolve('test-results/smoke/current-run.json'),
        serializedMetadata,
        'utf8',
      ),
    ]);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'unknown setup error';
    throw new Error(`FAIL_INFRASTRUCTURE: ${reason}`);
  } finally {
    await adminApi?.dispose();
  }
}
