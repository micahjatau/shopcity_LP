import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';
import { loadSmokeConfig } from './config';
import {
  captureBaseline,
  preflightFixtures,
  resetMutableFixtures,
  resolveTaggedSmokeFraudFlags,
} from './support/fixtures';
import { createRoleApiSession } from './support/api-client';
import { createApiInvariantReader } from './support/assertions';
import { createSmokeRun, smokeAuthDir } from './support/smoke-run';
import {
  registerFinancialArtifact,
  waitForOutboxQuiescence,
} from './support/reconciliation';
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
    const authStateDir = smokeAuthDir(run);
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
    const releaseResponse = (await adminApi.get<unknown>(
      '/api/v1/reports/pilot-operations-summary',
    )) as Record<string, unknown>;
    const releaseEnvelope =
      releaseResponse.data && typeof releaseResponse.data === 'object'
        ? (releaseResponse.data as Record<string, unknown>)
        : releaseResponse;
    const release =
      releaseEnvelope.data && typeof releaseEnvelope.data === 'object'
        ? (releaseEnvelope.data as Record<string, unknown>)
        : releaseEnvelope;
    const releaseSha =
      release.release && typeof release.release === 'object'
        ? (release.release as Record<string, unknown>).sha
        : undefined;
    if (
      smokeConfig.environment !== 'test' &&
      releaseSha !== smokeConfig.candidateSha
    ) {
      throw new Error(
        `Deployed backend release SHA mismatch (expected ${smokeConfig.candidateSha}, received ${String(releaseSha)})`,
      );
    }
    await preflightFixtures(smokeConfig, adminApi);
    await resolveTaggedSmokeFraudFlags(
      adminApi,
      'SMOKE-',
      `[${run.smokeRunId}] resolve prior smoke fraud flags`,
    );
    await waitForOutboxQuiescence(
      createApiInvariantReader(adminApi, smokeConfig),
    );
    const baseline = await captureBaseline(smokeConfig, adminApi);
    await resetMutableFixtures(smokeConfig, adminApi, baseline, run.smokeRunId);
    await adminApi.patch(
      `/api/v1/devices/${smokeConfig.deviceId}`,
      { status: 'ACTIVE' },
      `${run.smokeRunId}-cashier-device-activate`,
    );
    const resetDevices =
      await adminApi.get<Array<{ id?: string; status?: string }>>(
        '/api/v1/devices',
      );
    const resetDevice = resetDevices.find(
      (device) => device.id === smokeConfig.deviceId,
    );
    if (resetDevice?.status !== 'ACTIVE') {
      throw new Error('Smoke device did not remain ACTIVE after fixture reset');
    }

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

    if (smokeConfig.environment === 'staging') {
      const minimumRedemptionKobo = Number(
        process.env.SMOKE_MIN_REDEMPTION_KOBO ?? 50_000,
      );
      if (
        !Number.isSafeInteger(minimumRedemptionKobo) ||
        minimumRedemptionKobo < 1
      ) {
        throw new Error('SMOKE_MIN_REDEMPTION_KOBO must be a positive integer');
      }
      const topUpKobo = Math.max(
        0,
        minimumRedemptionKobo - baseline.balanceKobo,
      );
      if (topUpKobo > 0) {
        const response = await adminApi.post<{ transactionId?: string }>(
          '/api/v1/adjustments',
          {
            customerId: smokeConfig.activeCustomerId,
            kind: 'CREDIT',
            amountKobo: topUpKobo,
            reason: `[${run.smokeRunId}] staging redeem prerequisite`,
            effectiveAt: new Date().toISOString(),
          },
          `${run.smokeRunId}-redeem-prerequisite`,
        );
        const transactionId = response.transactionId;
        if (!transactionId) {
          throw new Error(
            'Staging redeem prerequisite adjustment returned no transaction ID',
          );
        }
        await registerFinancialArtifact(run, {
          kind: 'ADJUSTMENT',
          referenceId: transactionId,
          reversalRequired: true,
          reversalPath: `/api/v1/transactions/${transactionId}/reverse`,
        });
      }
    }
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'unknown setup error';
    throw new Error(`FAIL_INFRASTRUCTURE: ${reason}`);
  } finally {
    await adminApi?.dispose();
  }
}
