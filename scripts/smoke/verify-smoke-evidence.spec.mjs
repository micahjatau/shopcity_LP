import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEvidence } from './verify-smoke-evidence.mjs';

const sha = 'a'.repeat(40);
const valid = () => ({
  smokeRunId: 'SMOKE-20260826-143000-abc123',
  environment: 'staging',
  candidateSha: sha,
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  result: 'PASS',
  groups: {
    cashier: 'PASS',
    supervisor: 'PASS',
    admin: 'PASS',
    crossRole: 'PASS',
    guardrails: 'PASS',
    reconciliation: 'PASS',
  },
});

test('accepts complete exact-SHA PASS evidence', () =>
  assert.equal(validateEvidence(valid(), sha), true));
test('rejects failed or incomplete evidence', () => {
  for (const group of ['cashier', 'reconciliation']) {
    const evidence = valid();
    evidence.groups[group] = 'FAIL';
    assert.throws(() => validateEvidence(evidence, sha));
  }
  const missingReconciliation = valid();
  delete missingReconciliation.groups.reconciliation;
  assert.throws(
    () => validateEvidence(missingReconciliation, sha),
    /reconciliation/,
  );
  const missingRole = valid();
  delete missingRole.groups.admin;
  assert.throws(() => validateEvidence(missingRole, sha), /admin/);
});
test('rejects invalid and out-of-order timestamps', () => {
  const invalid = valid();
  invalid.startedAt = 'not-a-date';
  assert.throws(() => validateEvidence(invalid, sha), /timestamps/);
  const reversed = valid();
  reversed.startedAt = '2026-08-27T00:00:00Z';
  reversed.completedAt = '2026-08-26T00:00:00Z';
  assert.throws(() => validateEvidence(reversed, sha), /timestamps/);
});

test('rejects SHA mismatch and secret-like keys', () => {
  assert.throws(() => validateEvidence(valid(), 'b'.repeat(40)), /mismatch/);
  const evidence = valid();
  evidence.password = 'not allowed';
  assert.throws(() => validateEvidence(evidence, sha), /secret-like/);
});
