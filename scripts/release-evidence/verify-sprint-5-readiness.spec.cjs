const assert = require('node:assert/strict');
const test = require('node:test');
const {
  MANDATORY_GATES,
  validateReadinessDocument,
} = require('./verify-sprint-5-readiness.cjs');

function validDocument() {
  return {
    schemaVersion: '1',
    releaseSha: '0123456789abcdef0123456789abcdef01234567',
    imageDigest:
      'ghcr.io/shopcity/shopcity-lp@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    releaseCandidate: {
      engineeringComplete: true,
      stagingCertified: true,
      productionApproved: true,
      pilotStarted: false,
    },
    gates: Object.fromEntries(
      MANDATORY_GATES.map((gate) => [
        gate,
        {
          status: 'passed',
          recordedAt: '2026-08-13T10:00:00.000Z',
          evidence: `docs/release-evidence/sprint-5-pilot/${gate}.md`,
        },
      ]),
    ),
    approvals: [
      {
        role: 'owner-admin',
        name: 'Pilot Approver',
        approvedAt: '2026-08-13T10:05:00.000Z',
      },
    ],
    trainingSignOffs: [
      { role: 'cashier', reference: 'training/cashier', completedAt: '2026-08-13T09:00:00.000Z' },
      { role: 'supervisor', reference: 'training/supervisor', completedAt: '2026-08-13T09:15:00.000Z' },
      { role: 'owner-admin', reference: 'training/owner-admin', completedAt: '2026-08-13T09:30:00.000Z' },
    ],
  };
}

test('accepts a complete readiness document', () => {
  assert.doesNotThrow(() => validateReadinessDocument(validDocument()));
});

test('rejects missing mandatory gates', () => {
  const document = validDocument();
  delete document.gates.security;

  assert.throws(() => validateReadinessDocument(document), /missing gate security/);
});

test('rejects incomplete release-candidate stages', () => {
  const document = validDocument();
  document.releaseCandidate.productionApproved = false;

  assert.throws(
    () => validateReadinessDocument(document),
    /releaseCandidate.productionApproved must be true/,
  );
});

test('rejects missing training roles', () => {
  const document = validDocument();
  document.trainingSignOffs = document.trainingSignOffs.filter(
    (entry) => entry.role !== 'supervisor',
  );

  assert.throws(
    () => validateReadinessDocument(document),
    /trainingSignOffs must include supervisor sign-off/,
  );
});
