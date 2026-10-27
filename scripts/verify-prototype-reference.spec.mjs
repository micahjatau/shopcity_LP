import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('keeps prototype assets in the single reference directory', () => {
  const output = execFileSync(
    process.execPath,
    [join(root, 'scripts', 'verify-prototype-reference.mjs')],
    { cwd: root, encoding: 'utf8' },
  );

  assert.match(output, /Prototype reference OK: apps\/web\/public\/prototype/);
});
