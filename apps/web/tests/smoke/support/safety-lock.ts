import {
  access,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname } from 'node:path';

export interface SafetyLock {
  environment: 'production';
  smokeRunId: string;
  reason: string;
  lockedAt: string;
  incidentReference?: string;
}

export interface SafetyLockStore {
  read(): Promise<SafetyLock | null>;
  write(lock: SafetyLock): Promise<void>;
  clear(operatorReference: string): Promise<void>;
}

export class FileSafetyLockStore implements SafetyLockStore {
  constructor(private readonly path: string) {}

  async read(): Promise<SafetyLock | null> {
    try {
      await access(this.path);
      return JSON.parse(await readFile(this.path, 'utf8')) as SafetyLock;
    } catch {
      return null;
    }
  }

  async write(lock: SafetyLock): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp-${process.pid}`;
    await writeFile(temporary, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    await rename(temporary, this.path);
  }

  async clear(operatorReference: string): Promise<void> {
    if (!operatorReference.trim()) {
      throw new Error('Operator reference is required to clear the smoke lock');
    }
    const lock = await this.read();
    if (!lock) return;
    await writeFile(
      `${this.path}.audit.jsonl`,
      `${JSON.stringify({ action: 'CLEAR', operatorReference, smokeRunId: lock.smokeRunId, clearedAt: new Date().toISOString() })}\n`,
      { encoding: 'utf8', flag: 'a' },
    );
    try {
      await unlink(this.path);
    } catch {
      // Clearing an already-clear lock is idempotent.
    }
  }
}

export async function assertProductionUnlocked(
  environment: 'staging' | 'production',
  store: SafetyLockStore,
): Promise<void> {
  if (environment !== 'production') return;
  const lock = await store.read();
  if (lock) {
    throw new Error(
      `Production smoke safety lock is active for ${lock.smokeRunId}: ${lock.reason}`,
    );
  }
}

export async function lockProductionSmoke(
  store: SafetyLockStore,
  smokeRunId: string,
  reason: string,
  incidentReference?: string,
): Promise<void> {
  await store.write({
    environment: 'production',
    smokeRunId,
    reason,
    lockedAt: new Date().toISOString(),
    incidentReference,
  });
}

export async function clearProductionSmokeLock(
  store: SafetyLockStore,
  operatorReference: string,
): Promise<void> {
  await store.clear(operatorReference);
}
