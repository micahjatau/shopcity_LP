const test = require('node:test');
const assert = require('node:assert/strict');
const {
  verifyFrontendEvidence,
} = require('./verify-frontend-stabilization.cjs');

const sha = 'b23e0634ad411bd0c942e41059b8177cce683763';
const evidence = {
  candidateSha: sha,
  canonicalDeployment: {
    projectId: 'prj_test',
    deploymentId: 'dpl_test',
    runtimeRegion: 'fra1',
    duplicateContextStatus: 'excluded-approved',
  },
  topology: {
    frontendRegion: 'fra1',
    backendRegion: 'fra1',
    databaseRegion: 'fra1',
  },
  checks: [{ name: 'build', status: 'passed', candidateSha: sha }],
  performance: { routes: [{ path: '/cashier', warmJsBytes: 150614 }] },
  exceptions: [
    {
      observedValue: '150614 bytes',
      owner: 'frontend',
      followUpDate: '2026-09-01',
    },
  ],
};

test('accepts complete exact-head frontend evidence', () => {
  assert.equal(verifyFrontendEvidence(evidence, sha), true);
});

test('rejects mixed candidate SHAs', () => {
  assert.throws(
    () =>
      verifyFrontendEvidence(
        {
          ...evidence,
          checks: [{ ...evidence.checks[0], candidateSha: '0'.repeat(40) }],
        },
        sha,
      ),
    /check SHA mismatch/,
  );
});

test('rejects missing deployment identity and topology', () => {
  assert.throws(
    () => verifyFrontendEvidence({ ...evidence, canonicalDeployment: {} }, sha),
    /canonical project ID/,
  );
});
