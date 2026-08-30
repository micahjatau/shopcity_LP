import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  assertProductionUnlocked,
  clearProductionSmokeLock,
  FileSafetyLockStore,
  lockProductionSmoke,
} from './support/safety-lock';

test('staging bypasses the production safety lock', async () => {
  const store = new FileSafetyLockStore('/path/that/is/not/read');
  await expect(
    assertProductionUnlocked('staging', store),
  ).resolves.toBeUndefined();
});

test('production lock blocks reruns until an operator clears it', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'shopcity-safety-lock-'));
  const store = new FileSafetyLockStore(resolve(root, 'lock.json'));

  await lockProductionSmoke(store, 'SMOKE-RESIDUE-01', 'unreconciled balance');
  await expect(assertProductionUnlocked('production', store)).rejects.toThrow(
    /SMOKE-RESIDUE-01: unreconciled balance/,
  );

  await expect(clearProductionSmokeLock(store, '')).rejects.toThrow(
    /Operator reference is required/,
  );
  await clearProductionSmokeLock(store, 'operator-123');
  await expect(
    assertProductionUnlocked('production', store),
  ).resolves.toBeUndefined();
});
