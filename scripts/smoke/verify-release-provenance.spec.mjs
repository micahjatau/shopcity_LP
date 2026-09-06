import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReleaseProvenance } from './verify-release-provenance.mjs';

const sha = 'a'.repeat(40);
const record = {
  candidateSha: sha,
  workflowDefinitionSha: 'b'.repeat(40),
  workflowRunId: '12345',
  environment: 'staging',
  deployedFrontendSha: sha,
  deployedBackendSha: sha,
  verifierVersion: 'verify-smoke-evidence-v1',
  recordedAt: '2026-09-06T00:00:00Z',
};

test('accepts exact release provenance', () => {
  assert.equal(validateReleaseProvenance(record, sha, 'staging'), true);
});

test('rejects deployment SHA drift', () => {
  assert.throws(
    () =>
      validateReleaseProvenance(
        { ...record, deployedBackendSha: 'c'.repeat(40) },
        sha,
        'staging',
      ),
    /backend deployment SHA mismatch/,
  );
});

test('rejects environment drift', () => {
  assert.throws(
    () => validateReleaseProvenance(record, sha, 'production'),
    /environment mismatch/,
  );
});
