import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

export type SmokeOutcome =
  | 'PASS'
  | 'FAIL_TEST'
  | 'FAIL_RECONCILIATION'
  | 'FAIL_INFRASTRUCTURE'
  | 'ABORTED';

export interface SmokeRun {
  smokeRunId: string;
  candidateSha: string;
  startedAt: string;
  outputDir: string;
  evidenceDir: string;
}

function timestamp(now: Date): string {
  const iso = now.toISOString();
  return iso.replace(/[-:TZ.]/g, '').slice(0, 14);
}

export function createSmokeRunId(
  now = new Date(),
  suffix = randomUUID().slice(0, 6),
): string {
  const safeSuffix = suffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32) || 'run';
  return `SMOKE-${timestamp(now)}-${safeSuffix}`;
}

export function smokeAuthDir(run: Pick<SmokeRun, 'smokeRunId'>): string {
  return resolve(
    process.env.RUNNER_TEMP ?? '.smoke-temp',
    'shopcity-smoke-auth',
    run.smokeRunId,
  );
}

export function loadSmokeRun(root = 'test-results/smoke'): SmokeRun {
  return JSON.parse(
    readFileSync(resolve(root, 'current-run.json'), 'utf8'),
  ) as SmokeRun;
}

export function createSmokeRun(
  candidateSha: string,
  root = 'test-results/smoke',
): SmokeRun {
  const startedAt = new Date().toISOString();
  const smokeRunId = createSmokeRunId(new Date(startedAt));
  const outputDir = resolve(root, smokeRunId);
  const evidenceDir = resolve(outputDir, 'evidence');

  mkdirSync(evidenceDir, { recursive: true });
  const run: SmokeRun = {
    smokeRunId,
    candidateSha,
    startedAt,
    outputDir,
    evidenceDir,
  };
  writeFileSync(
    resolve(root, 'current-run.json'),
    `${JSON.stringify(run, null, 2)}\n`,
    {
      encoding: 'utf8',
      flag: 'w',
    },
  );
  return run;
}
