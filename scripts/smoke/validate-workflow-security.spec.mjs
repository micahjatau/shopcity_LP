import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateStagingWorkflowSecurity } from './validate-workflow-security.mjs';

test('staging workflow requires trusted source and exact checkout controls', async () => {
  const source = await readFile('.github/workflows/staging-smoke.yml', 'utf8');
  assert.equal(validateStagingWorkflowSecurity(source), true);
});

test('staging workflow rejects direct remediation and swallowed migration errors', async () => {
  const source = await readFile('.github/workflows/staging-smoke.yml', 'utf8');
  assert.throws(
    () =>
      validateStagingWorkflowSecurity(
        source.replace(
          'npx prisma migrate deploy',
          'UPDATE "Device"\nnpx prisma migrate deploy\nmigrate resolve',
        ),
      ),
    /direct migration\/device remediation/,
  );
});
