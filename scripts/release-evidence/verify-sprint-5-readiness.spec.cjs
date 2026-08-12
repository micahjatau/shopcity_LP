const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const test = require('node:test');
const {
  MANDATORY_GATES,
  validateReadinessDocument,
  validateEvidenceBundle,
} = require('./verify-sprint-5-readiness.cjs');

function validDocument() {
  return {
    schemaVersion: '1',
    releaseSha: '49f0e44324feb4793c15ffd8afa4e59d2b15bd12',
    imageDigest:
      'ghcr.io/shopcity/shopcity-lp@sha256:385fe391d928599741535e16395a33c894ea589e05effb5e1e323367ccf6b53b',
    releaseCandidate: {
      engineeringComplete: true,
      stagingCertified: true,
      productionApproved: true,
      pilotStarted: false,
    },
    gates: {
      dockerVerification: {
        status: 'passed',
        recordedAt: '2026-08-13T10:00:00.000Z',
        evidence: 'docs/release-evidence/sprint-5-pilot/docker-verification.md',
      },
      security: {
        status: 'passed',
        recordedAt: '2026-08-13T10:00:00.000Z',
        evidence: 'docs/release-evidence/sprint-5-pilot/security-results.md',
      },
      performance: {
        status: 'passed',
        recordedAt: '2026-08-13T10:00:00.000Z',
        evidence:
          'docs/release-evidence/sprint-5-pilot/performance-summary.json',
      },
      restore: {
        status: 'passed',
        recordedAt: '2026-08-13T10:00:00.000Z',
        evidence: 'docs/release-evidence/sprint-5-pilot/restore-drill.json',
      },
      staging: {
        status: 'passed',
        recordedAt: '2026-08-13T10:00:00.000Z',
        evidence:
          'docs/release-evidence/sprint-5-pilot/staging-certification.md',
      },
      training: {
        status: 'passed',
        recordedAt: '2026-08-13T10:00:00.000Z',
        evidence: 'docs/release-evidence/sprint-5-pilot/training-signoff.md',
      },
      signOff: {
        status: 'passed',
        recordedAt: '2026-08-13T10:00:00.000Z',
        evidence: 'docs/release-evidence/sprint-5-pilot/final-approval.md',
      },
    },
    approvals: [
      {
        role: 'owner-admin',
        name: 'Pilot Approver',
        approvedAt: '2026-08-13T10:05:00.000Z',
        releaseSha: '49f0e44324feb4793c15ffd8afa4e59d2b15bd12',
        imageDigest:
          'ghcr.io/shopcity/shopcity-lp@sha256:385fe391d928599741535e16395a33c894ea589e05effb5e1e323367ccf6b53b',
      },
    ],
    trainingSignOffs: [
      {
        role: 'cashier',
        reference:
          'docs/release-evidence/sprint-5-pilot/training-cashier-signoff.md',
        completedAt: '2026-08-13T09:00:00.000Z',
        releaseSha: '49f0e44324feb4793c15ffd8afa4e59d2b15bd12',
        imageDigest:
          'ghcr.io/shopcity/shopcity-lp@sha256:385fe391d928599741535e16395a33c894ea589e05effb5e1e323367ccf6b53b',
      },
      {
        role: 'supervisor',
        reference:
          'docs/release-evidence/sprint-5-pilot/training-supervisor-signoff.md',
        completedAt: '2026-08-13T09:15:00.000Z',
        releaseSha: '49f0e44324feb4793c15ffd8afa4e59d2b15bd12',
        imageDigest:
          'ghcr.io/shopcity/shopcity-lp@sha256:385fe391d928599741535e16395a33c894ea589e05effb5e1e323367ccf6b53b',
      },
      {
        role: 'owner-admin',
        reference:
          'docs/release-evidence/sprint-5-pilot/training-owner-admin-signoff.md',
        completedAt: '2026-08-13T09:30:00.000Z',
        releaseSha: '49f0e44324feb4793c15ffd8afa4e59d2b15bd12',
        imageDigest:
          'ghcr.io/shopcity/shopcity-lp@sha256:385fe391d928599741535e16395a33c894ea589e05effb5e1e323367ccf6b53b',
      },
    ],
  };
}

function writeEvidenceFile(dir, name, content) {
  const fullPath = path.join(dir, name);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

test('accepts a complete readiness document', () => {
  assert.doesNotThrow(() =>
    validateReadinessDocument(validDocument(), {
      evidencePath: 'docs/release-evidence/sprint-5-pilot/readiness.json',
      referenceTime: new Date('2026-08-13T12:00:00.000Z'),
    }),
  );
});

test('rejects missing mandatory gates', () => {
  const document = validDocument();
  delete document.gates.security;

  assert.throws(
    () =>
      validateReadinessDocument(document, {
        referenceTime: new Date('2026-08-13T12:00:00.000Z'),
      }),
    /missing gate security/,
  );
});

test('rejects incomplete release-candidate stages', () => {
  const document = validDocument();
  document.releaseCandidate.productionApproved = false;

  assert.throws(
    () =>
      validateReadinessDocument(document, {
        referenceTime: new Date('2026-08-13T12:00:00.000Z'),
      }),
    /releaseCandidate.productionApproved must be true/,
  );
});

test('rejects future timestamps', () => {
  const document = validDocument();
  document.gates.restore.recordedAt = '2026-08-13T23:59:59.000Z';

  assert.throws(
    () =>
      validateReadinessDocument(document, {
        referenceTime: new Date('2026-08-13T10:00:00.000Z'),
      }),
    /must not be in the future/,
  );
});

test('rejects missing training roles', () => {
  const document = validDocument();
  document.trainingSignOffs = document.trainingSignOffs.filter(
    (entry) => entry.role !== 'supervisor',
  );

  assert.throws(
    () =>
      validateReadinessDocument(document, {
        evidencePath: 'docs/release-evidence/sprint-5-pilot/readiness.json',
        referenceTime: new Date('2026-08-13T12:00:00.000Z'),
      }),
    /trainingSignOffs must include supervisor sign-off/,
  );
});

test('rejects example readiness evidence and generic gate references', () => {
  const document = validDocument();
  document.gates.performance.evidence =
    'docs/development/pilot-performance-baseline.md';

  assert.throws(
    () =>
      validateReadinessDocument(document, {
        evidencePath:
          'docs/release-evidence/sprint-5-pilot/readiness.example.json',
      }),
    /real release evidence|readiness\.json/,
  );

  assert.throws(
    () =>
      validateReadinessDocument(document, {
        evidencePath: 'docs/release-evidence/sprint-5-pilot/readiness.json',
        referenceTime: new Date('2026-08-13T12:00:00.000Z'),
      }),
    /executed release evidence|gate performance evidence/i,
  );
});

test('rejects evidence files that do not match the readiness candidate', () => {
  const document = validDocument();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shopcity-readiness-'));
  writeEvidenceFile(tempDir, 'README.md', '# Release evidence\n');
  writeEvidenceFile(
    tempDir,
    'deployment-checklist.md',
    '# Deployment checklist\n',
  );
  writeEvidenceFile(tempDir, 'rollback-checklist.md', '# Rollback checklist\n');
  const evidencePath = writeEvidenceFile(
    tempDir,
    'security-results.md',
    [
      '# Security results',
      '',
      'Candidate SHA: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'Image digest: ghcr.io/shopcity/shopcity-lp@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'RecordedAt: 2026-08-12T19:02:46Z',
      'Workflow run URL: https://github.com/micahjatau/shopcity_LP/actions/runs/31630700891',
      'Workflow run ID: 31630700891',
      '',
    ].join('\n'),
  );
  document.gates.security.evidence = evidencePath;

  assert.throws(
    () =>
      validateEvidenceBundle(tempDir, document, {
        referenceTime: new Date('2026-08-13T12:00:00.000Z'),
      }),
    /releaseSha must match readiness\.json|imageDigest must match readiness\.json/,
  );

  fs.rmSync(tempDir, { recursive: true, force: true });
});
