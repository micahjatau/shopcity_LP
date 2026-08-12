#!/usr/bin/env node

const { existsSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const MANDATORY_GATES = [
  'dockerVerification',
  'security',
  'performance',
  'restore',
  'staging',
  'training',
  'signOff',
];

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (value && !value.startsWith('--')) {
      result[key] = value;
      index += 1;
    } else {
      result[key] = 'true';
    }
  }
  return result;
}

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFile(filePath, label) {
  assert(existsSync(filePath), `missing ${label}: ${filePath}`);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
}

function isImageDigest(value) {
  return typeof value === 'string' && /@sha256:[a-f0-9]{64}$/i.test(value);
}

function validateReadinessDocument(document) {
  assert(document.schemaVersion === '1', 'schemaVersion must be "1"');
  assert(isSha(document.releaseSha), 'releaseSha must be a 40-character git SHA');
  assert(
    isImageDigest(document.imageDigest),
    'imageDigest must be an OCI image reference ending with @sha256:<64 hex>',
  );
  assert(
    document.releaseCandidate?.engineeringComplete === true,
    'releaseCandidate.engineeringComplete must be true',
  );
  assert(
    document.releaseCandidate?.stagingCertified === true,
    'releaseCandidate.stagingCertified must be true',
  );
  assert(
    document.releaseCandidate?.productionApproved === true,
    'releaseCandidate.productionApproved must be true',
  );
  assert(
    typeof document.releaseCandidate?.pilotStarted === 'boolean',
    'releaseCandidate.pilotStarted must be a boolean',
  );

  const gates = document.gates ?? {};
  for (const gateName of MANDATORY_GATES) {
    const gate = gates[gateName];
    assert(gate, `missing gate ${gateName}`);
    assert(gate.status === 'passed', `gate ${gateName} must be passed`);
    assert(
      isNonEmptyString(gate.evidence),
      `gate ${gateName} must include an evidence reference`,
    );
    assert(
      isNonEmptyString(gate.recordedAt),
      `gate ${gateName} must include recordedAt`,
    );
    assert(
      !Number.isNaN(new Date(gate.recordedAt).getTime()),
      `gate ${gateName} recordedAt must be a valid ISO datetime`,
    );
  }

  assert(Array.isArray(document.approvals), 'approvals must be an array');
  assert(document.approvals.length > 0, 'approvals must not be empty');
  for (const approval of document.approvals) {
    assert(isNonEmptyString(approval.role), 'approval.role is required');
    assert(isNonEmptyString(approval.name), 'approval.name is required');
    assert(isNonEmptyString(approval.approvedAt), 'approval.approvedAt is required');
    assert(
      !Number.isNaN(new Date(approval.approvedAt).getTime()),
      'approval.approvedAt must be a valid ISO datetime',
    );
  }

  assert(Array.isArray(document.trainingSignOffs), 'trainingSignOffs must be an array');
  assert(
    document.trainingSignOffs.some((entry) => entry.role === 'cashier'),
    'trainingSignOffs must include cashier sign-off',
  );
  assert(
    document.trainingSignOffs.some((entry) => entry.role === 'supervisor'),
    'trainingSignOffs must include supervisor sign-off',
  );
  assert(
    document.trainingSignOffs.some((entry) => entry.role === 'owner-admin'),
    'trainingSignOffs must include owner-admin sign-off',
  );
}

function validateEvidenceBundle(evidenceDir, document) {
  assertFile(join(evidenceDir, 'README.md'), 'release evidence README');
  assertFile(
    join(evidenceDir, 'deployment-checklist.md'),
    'deployment checklist',
  );
  assertFile(join(evidenceDir, 'rollback-checklist.md'), 'rollback checklist');

  const referencedFiles = [
    document.gates.dockerVerification.evidence,
    document.gates.security.evidence,
    document.gates.performance.evidence,
    document.gates.restore.evidence,
    document.gates.staging.evidence,
    document.gates.training.evidence,
    document.gates.signOff.evidence,
  ];

  for (const reference of referencedFiles) {
    const filePath = resolve(process.cwd(), reference);
    assertFile(filePath, `referenced evidence ${reference}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidencePath = resolve(
    args.evidence ?? 'docs/release-evidence/sprint-5-pilot/readiness.example.json',
  );
  const evidenceDir = resolve(
    args['evidence-dir'] ?? 'docs/release-evidence/sprint-5-pilot',
  );
  const document = loadJson(evidencePath);

  validateReadinessDocument(document);
  validateEvidenceBundle(evidenceDir, document);

  console.log(
    JSON.stringify(
      {
        status: 'passed',
        releaseSha: document.releaseSha,
        imageDigest: document.imageDigest,
        mandatoryGates: MANDATORY_GATES,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  MANDATORY_GATES,
  main,
  parseArgs,
  validateEvidenceBundle,
  validateReadinessDocument,
};
