import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { SmokeRun } from './smoke-run';

export type EvidenceGroup =
  'cashier' | 'supervisor' | 'admin' | 'cross-role' | 'guardrail' | 'offline';

export interface WorkflowEvidence {
  group: EvidenceGroup;
  name: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  references: Record<string, string>;
  errorCode?: string;
}

export interface FinancialArtifact {
  kind: 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'OFFLINE_EARN';
  referenceId: string;
  reversalRequired: boolean;
  reversalPath?: string;
  reversalBody?: unknown;
  reconciled?: boolean;
}

const SECRET_KEY =
  /password|secret|cookie|csrf|authorization|bearer|storageState|session[_-]?(token|id)|access[_-]?token|service[_-]?role|redis[_-]?(url|token)/i;

export function assertSafeEvidence(value: unknown, path = 'evidence'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertSafeEvidence(item, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) {
      throw new Error(`Unsafe evidence field: ${path}.${key}`);
    }
    assertSafeEvidence(nested, `${path}.${key}`);
  }
}

export async function writeEvidenceJson(
  run: SmokeRun,
  filename: string,
  value: unknown,
): Promise<string> {
  assertSafeEvidence(value);
  const target = resolve(run.evidenceDir, filename);
  const temporary = `${target}.tmp-${process.pid}`;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
  return target;
}

export async function recordWorkflowEvidence(
  run: SmokeRun,
  evidence: WorkflowEvidence,
): Promise<string> {
  const safeName = evidence.name.replace(/[^a-zA-Z0-9_-]/g, '-');
  return writeEvidenceJson(run, `${evidence.group}-${safeName}.json`, evidence);
}
