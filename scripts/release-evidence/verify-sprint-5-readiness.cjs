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

const REAL_EVIDENCE_PATH =
  'docs/release-evidence/sprint-5-pilot/readiness.json';
const FORBIDDEN_RELEASE_SHAS = new Set([
  '0123456789abcdef0123456789abcdef01234567',
  'dev',
  'example',
]);
const FORBIDDEN_IMAGE_DIGESTS = new Set([
  'ghcr.io/shopcity/shopcity-lp@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'ghcr.io/shopcity/shopcity-lp@sha256:example',
]);
const FORBIDDEN_EVIDENCE_PATTERNS = [
  /(^|\/)readme\.md$/i,
  /(^|\/)production-readiness-checklist\.md$/i,
  /(^|\/)deployment-checklist\.md$/i,
  /(^|\/)rollback-checklist\.md$/i,
  /(^|\/)pilot-performance-baseline\.md$/i,
  /(^|\/)pilot-training-[^/]+\.md$/i,
  /(^|\/)readiness\.example\.json$/i,
  /(^|\/)restore-drill\.example\.json$/i,
  /(^|\/)evidence-handoff\.md$/i,
  /\.example\./i,
  /fixture/i,
  /baseline/i,
  /training\/.*guid/i,
];
const ISO_TIMESTAMP_PATTERN =
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\b/;

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

function assertValidReferenceTime(referenceTime) {
  assert(
    referenceTime instanceof Date && !Number.isNaN(referenceTime.getTime()),
    'referenceTime must be a valid Date',
  );
}

function assertNotFutureTimestamp(value, label, referenceTime) {
  const timestamp = new Date(value);
  assert(
    !Number.isNaN(timestamp.getTime()),
    `${label} must be a valid ISO datetime`,
  );
  assert(
    timestamp.getTime() <= referenceTime.getTime(),
    `${label} must not be in the future`,
  );
}

function assertNotBeforeTimestamp(value, label, minimumTime) {
  const timestamp = new Date(value);
  assert(
    !Number.isNaN(timestamp.getTime()),
    `${label} must be a valid ISO datetime`,
  );
  assert(
    timestamp.getTime() >= minimumTime.getTime(),
    `${label} must not predate the frozen candidate`,
  );
}

function findFirstStringByKey(node, keys) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (Array.isArray(node)) {
    for (const value of node) {
      const found = findFirstStringByKey(value, keys);
      if (found) {
        return found;
      }
    }
    return null;
  }

  for (const key of keys) {
    const value = node[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  for (const value of Object.values(node)) {
    const found = findFirstStringByKey(value, keys);
    if (found) {
      return found;
    }
  }

  return null;
}

function extractEvidenceMetadata(filePath, rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = null;
  }

  const releaseSha =
    findFirstStringByKey(parsed, ['releaseSha']) ??
    matchFirst(rawText, [
      /\breleaseSha\s*:\s*([0-9a-f]{40})\b/i,
      /\bCandidate SHA:\s*([0-9a-f]{40})\b/i,
      /"releaseSha"\s*:\s*"([0-9a-f]{40})"/i,
    ]);

  const imageDigest =
    findFirstStringByKey(parsed, ['imageDigest', 'releaseArtifact']) ??
    matchFirst(rawText, [
      /\bimageDigest\s*:\s*([^\s"']+)/i,
      /\bImage digest:\s*([^\s"']+)/i,
      /\breleaseArtifact\s*:\s*([^\s"']+)/i,
      /"imageDigest"\s*:\s*"([^"]+)"/i,
      /"releaseArtifact"\s*:\s*"([^"]+)"/i,
    ]);

  assert(
    isNonEmptyString(releaseSha),
    `evidence file must declare a release SHA: ${filePath}`,
  );
  assert(
    isNonEmptyString(imageDigest),
    `evidence file must declare an image digest: ${filePath}`,
  );

  return {
    releaseSha,
    imageDigest,
  };
}

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function validateTimestampText(rawText, label, referenceTime) {
  const matches = rawText.match(ISO_TIMESTAMP_PATTERN) ?? [];
  for (const match of matches) {
    assertNotFutureTimestamp(match, `${label} timestamp`, referenceTime);
  }
}

function validateReadinessDocument(document, options = {}) {
  if (options.evidencePath) {
    assertRealEvidencePath(options.evidencePath);
  }

  const referenceTime = options.referenceTime ?? new Date();
  assertValidReferenceTime(referenceTime);

  assert(
    isNonEmptyString(document.releaseFreezeAt),
    'releaseFreezeAt is required',
  );
  assertNotFutureTimestamp(
    document.releaseFreezeAt,
    'releaseFreezeAt',
    referenceTime,
  );
  const freezeTime = new Date(document.releaseFreezeAt);

  assert(document.schemaVersion === '1', 'schemaVersion must be "1"');
  assert(
    isSha(document.releaseSha),
    'releaseSha must be a 40-character git SHA',
  );
  assert(
    !FORBIDDEN_RELEASE_SHAS.has(String(document.releaseSha).toLowerCase()),
    'releaseSha must not be a placeholder or example SHA',
  );
  assert(
    isImageDigest(document.imageDigest),
    'imageDigest must be an OCI image reference ending with @sha256:<64 hex>',
  );
  assert(
    !FORBIDDEN_IMAGE_DIGESTS.has(String(document.imageDigest).toLowerCase()),
    'imageDigest must not be a placeholder or example digest',
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
      isAllowedEvidenceReference(gate.evidence),
      `gate ${gateName} evidence must reference executed release evidence`,
    );
    assert(
      isNonEmptyString(gate.recordedAt),
      `gate ${gateName} must include recordedAt`,
    );
    assertNotFutureTimestamp(
      gate.recordedAt,
      `gate ${gateName} recordedAt`,
      referenceTime,
    );
    assertNotBeforeTimestamp(
      gate.recordedAt,
      `gate ${gateName} recordedAt`,
      freezeTime,
    );
  }

  assert(Array.isArray(document.approvals), 'approvals must be an array');
  assert(document.approvals.length > 0, 'approvals must not be empty');
  for (const approval of document.approvals) {
    assert(isNonEmptyString(approval.role), 'approval.role is required');
    assert(isNonEmptyString(approval.name), 'approval.name is required');
    assert(
      isNonEmptyString(approval.approvedAt),
      'approval.approvedAt is required',
    );
    assertNotFutureTimestamp(
      approval.approvedAt,
      `approval ${approval.role} approvedAt`,
      referenceTime,
    );
    assertNotBeforeTimestamp(
      approval.approvedAt,
      `approval ${approval.role} approvedAt`,
      freezeTime,
    );
    assert(isSha(approval.releaseSha), 'approval.releaseSha is required');
    assert(
      approval.releaseSha === document.releaseSha,
      'approval.releaseSha must match readiness.json',
    );
    assert(
      isImageDigest(approval.imageDigest),
      'approval.imageDigest is required',
    );
    assert(
      approval.imageDigest === document.imageDigest,
      'approval.imageDigest must match readiness.json',
    );
  }

  assert(
    Array.isArray(document.trainingSignOffs),
    'trainingSignOffs must be an array',
  );
  for (const entry of document.trainingSignOffs) {
    assert(isNonEmptyString(entry.role), 'trainingSignOff.role is required');
    assert(
      isAllowedEvidenceReference(entry.reference),
      'training sign-off reference must point at executed release evidence',
    );
    assert(isSha(entry.releaseSha), 'trainingSignOff.releaseSha is required');
    assert(
      entry.releaseSha === document.releaseSha,
      'trainingSignOff.releaseSha must match readiness.json',
    );
    assert(
      isImageDigest(entry.imageDigest),
      'trainingSignOff.imageDigest is required',
    );
    assert(
      entry.imageDigest === document.imageDigest,
      'trainingSignOff.imageDigest must match readiness.json',
    );
    assert(
      isNonEmptyString(entry.completedAt),
      'trainingSignOff.completedAt is required',
    );
    assertNotFutureTimestamp(
      entry.completedAt,
      `trainingSignOff ${entry.role} completedAt`,
      referenceTime,
    );
    assertNotBeforeTimestamp(
      entry.completedAt,
      `trainingSignOff ${entry.role} completedAt`,
      freezeTime,
    );
  }
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

function validateEvidenceBundle(evidenceDir, document, options = {}) {
  const referenceTime = options.referenceTime ?? new Date();
  assertValidReferenceTime(referenceTime);

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
    ...document.trainingSignOffs.map((entry) => entry.reference),
  ];

  for (const reference of referencedFiles) {
    assert(
      isAllowedEvidenceReference(reference),
      `referenced evidence must be an executed release artifact: ${reference}`,
    );
    const filePath = resolve(process.cwd(), reference);
    assertFile(filePath, `referenced evidence ${reference}`);

    const rawText = readFileSync(filePath, 'utf8');
    const metadata = extractEvidenceMetadata(filePath, rawText);
    assert(
      metadata.releaseSha === document.releaseSha,
      `referenced evidence releaseSha must match readiness.json: ${reference}`,
    );
    assert(
      metadata.imageDigest === document.imageDigest,
      `referenced evidence imageDigest must match readiness.json: ${reference}`,
    );

    if (reference.endsWith('performance-summary.json')) {
      validatePerformanceEvidence(filePath, rawText, document);
    }

    if (reference.endsWith('security-results.md')) {
      validateSecurityEvidence(filePath, rawText, document, referenceTime);
    }

    if (reference.endsWith('staging-certification.md')) {
      validateStagingEvidence(filePath, rawText, document, referenceTime);
    }

    if (reference.endsWith('restore-drill.json')) {
      validateRestoreEvidence(filePath, rawText, document);
    }

    if (reference.endsWith('training-signoff.md')) {
      validateTrainingGateEvidence(filePath, rawText, document, referenceTime);
    }

    if (reference.endsWith('final-approval.md')) {
      validateFinalApprovalEvidence(filePath, rawText, document, referenceTime);
    }

    validateTimestampText(rawText, reference, referenceTime);
  }
}

function validateSecurityEvidence(filePath, rawText, document, referenceTime) {
  assert(
    /actions\/runs\/\d+/i.test(rawText),
    `security evidence must include a workflow run URL: ${filePath}`,
  );
  assert(
    /Workflow run ID:\s*\d+/i.test(rawText),
    `security evidence must include a workflow run ID: ${filePath}`,
  );
  assert(
    /Gitleaks/i.test(rawText) && /Trivy/i.test(rawText),
    `security evidence must mention the executed security jobs: ${filePath}`,
  );
  assert(
    /CodeQL/i.test(rawText),
    `security evidence must include CodeQL: ${filePath}`,
  );
  assert(
    /ZAP/i.test(rawText),
    `security evidence must include ZAP: ${filePath}`,
  );
  assert(
    !/CodeQL[^\n]*skipped/i.test(rawText),
    `security evidence must not skip CodeQL: ${filePath}`,
  );
  assert(
    !/ZAP[^\n]*skipped/i.test(rawText),
    `security evidence must not skip ZAP: ${filePath}`,
  );
  assert(
    /Status:\s*passed/i.test(rawText) ||
      /passed in release bundle/i.test(rawText),
    `security evidence must conclude passed for the full gate: ${filePath}`,
  );
  assert(
    new RegExp(`Candidate SHA:\\s*${document.releaseSha}`, 'i').test(rawText),
    `security evidence candidate SHA must match readiness.json: ${filePath}`,
  );
  assert(
    rawText.includes(document.imageDigest),
    `security evidence imageDigest must match readiness.json: ${filePath}`,
  );

  const recordedAt = matchFirst(rawText, [/RecordedAt:\s*([^\n]+)/i]);
  assert(recordedAt, `security evidence must record a timestamp: ${filePath}`);
  assertNotFutureTimestamp(
    recordedAt,
    `security evidence recordedAt`,
    referenceTime,
  );
  assertNotBeforeTimestamp(
    recordedAt,
    `security evidence recordedAt`,
    new Date(document.releaseFreezeAt),
  );
}

function validateStagingEvidence(filePath, rawText, document, referenceTime) {
  assert(
    /actions\/runs\/\d+/i.test(rawText),
    `staging evidence must include a workflow or validation URL: ${filePath}`,
  );
  assert(
    /staging/i.test(rawText),
    `staging evidence must mention staging validation: ${filePath}`,
  );
  const deploymentUrl = matchFirst(rawText, [
    /(?:Deployment|Staging) URL:\s*(https:\/\/\S+)/i,
  ]);
  assert(
    deploymentUrl && !isPlaceholderCertificationUrl(deploymentUrl),
    `staging evidence must include a real non-placeholder deployment URL: ${filePath}`,
  );
  assert(
    /migration/i.test(rawText),
    `staging evidence must mention migration: ${filePath}`,
  );
  assert(
    /readiness/i.test(rawText),
    `staging evidence must mention readiness checks: ${filePath}`,
  );
  assert(
    /Bruno/i.test(rawText),
    `staging evidence must mention Bruno smoke checks: ${filePath}`,
  );
  assert(
    /contract/i.test(rawText),
    `staging evidence must mention contract tests: ${filePath}`,
  );
  assert(
    /ZAP/i.test(rawText),
    `staging evidence must mention ZAP: ${filePath}`,
  );
  assert(
    !/ZAP[^\n]*skipped/i.test(rawText),
    `staging evidence must not skip ZAP: ${filePath}`,
  );

  const recordedAt = matchFirst(rawText, [/RecordedAt:\s*([^\n]+)/i]);
  assert(recordedAt, `staging evidence must record a timestamp: ${filePath}`);
  assertNotFutureTimestamp(
    recordedAt,
    `staging evidence recordedAt`,
    referenceTime,
  );
  assertNotBeforeTimestamp(
    recordedAt,
    `staging evidence recordedAt`,
    new Date(document.releaseFreezeAt),
  );
}

function validatePerformanceEvidence(filePath, rawText, document) {
  let evidence;
  try {
    evidence = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`performance evidence must be valid JSON: ${filePath}`);
  }

  assert(evidence.tool === 'k6', 'performance evidence tool must be k6');
  assert(evidence.status === 'passed', 'performance evidence must be passed');
  assert(
    evidence.releaseSha === document.releaseSha,
    'performance evidence releaseSha must match readiness.json',
  );
  assert(
    evidence.imageDigest === document.imageDigest,
    'performance evidence imageDigest must match readiness.json',
  );
  assert(
    typeof evidence.baseUrl === 'string' &&
      /^https:\/\//i.test(evidence.baseUrl) &&
      !isPlaceholderCertificationUrl(evidence.baseUrl),
    'performance evidence baseUrl must be a real non-placeholder certification URL',
  );
  assert(
    typeof evidence.lookupP95Ms === 'number' && evidence.lookupP95Ms < 500,
    'performance evidence lookupP95Ms must be below 500ms',
  );
  assert(
    typeof evidence.earnCheckoutP95Ms === 'number' &&
      evidence.earnCheckoutP95Ms < 1200,
    'performance evidence earnCheckoutP95Ms must be below 1200ms',
  );
  assert(
    typeof evidence.redeemCheckoutP95Ms === 'number' &&
      evidence.redeemCheckoutP95Ms < 1200,
    'performance evidence redeemCheckoutP95Ms must be below 1200ms',
  );
  assert(
    typeof evidence.reportIsolationP95Ms === 'number' &&
      evidence.reportIsolationP95Ms < 1800,
    'performance evidence reportIsolationP95Ms must be below 1800ms',
  );
  assert(
    typeof evidence.httpFailureRate === 'number' &&
      evidence.httpFailureRate < 0.01,
    'performance evidence httpFailureRate must be below 1%',
  );
  assert(
    evidence.reconciliationMismatchCount === 0,
    'performance evidence reconciliationMismatchCount must be zero',
  );
}

function validateRestoreEvidence(filePath, rawText, document) {
  let evidence;
  try {
    evidence = JSON.parse(rawText);
  } catch {
    throw new Error(`restore drill evidence must be valid JSON: ${filePath}`);
  }

  assert(
    evidence.releaseSha === document.releaseSha,
    'restore drill releaseSha must match readiness.json',
  );
  assert(
    evidence.releaseArtifact === document.imageDigest,
    'restore drill releaseArtifact must match readiness.json',
  );
  assert(
    isNonEmptyString(evidence.restoreTarget),
    'restore drill evidence must include a restoreTarget',
  );
  assert(
    /isolated/i.test(evidence.restoreTarget),
    'restore drill restoreTarget must describe an isolated target',
  );
  assert(
    /managed.*backup|pitr/i.test(evidence.providerBackupControl),
    'restore drill evidence must document provider-managed backup control',
  );
  assert(
    Array.isArray(evidence.commands) && evidence.commands.length > 0,
    'restore drill evidence must record executed verification commands',
  );
  assert(
    evidence.commands.some((command) =>
      /invariant|reconciliation|financial-state-invariants/i.test(
        command.command,
      ),
    ),
    'restore drill evidence must include invariant or reconciliation validation',
  );
  assert(
    evidence.commands.some((command) => command.status === 'passed'),
    'restore drill evidence must include passed commands',
  );
  assert(
    evidence.commands.every((command) => command.status === 'passed'),
    'restore drill evidence contains failed commands',
  );

  const backupCompletedAt = new Date(evidence.backupCompletedAt);
  const restoreStartedAt = new Date(evidence.restoreStartedAt);
  const restoreCompletedAt = new Date(evidence.restoreCompletedAt);
  const verificationCompletedAt = new Date(evidence.verificationCompletedAt);
  assert(
    [
      backupCompletedAt,
      restoreStartedAt,
      restoreCompletedAt,
      verificationCompletedAt,
    ].every((value) => !Number.isNaN(value.getTime())),
    'restore drill timestamps must be valid ISO datetimes',
  );
  assertNotBeforeTimestamp(
    evidence.backupCompletedAt,
    'restore drill backupCompletedAt',
    new Date(document.releaseFreezeAt),
  );
  assertNotBeforeTimestamp(
    evidence.restoreStartedAt,
    'restore drill restoreStartedAt',
    new Date(document.releaseFreezeAt),
  );
  assertNotBeforeTimestamp(
    evidence.restoreCompletedAt,
    'restore drill restoreCompletedAt',
    new Date(document.releaseFreezeAt),
  );
  assertNotBeforeTimestamp(
    evidence.verificationCompletedAt,
    'restore drill verificationCompletedAt',
    new Date(document.releaseFreezeAt),
  );
}

function validateTrainingGateEvidence(
  filePath,
  rawText,
  document,
  referenceTime,
) {
  assert(
    /cashier/i.test(rawText),
    `training evidence must mention cashier training: ${filePath}`,
  );
  assert(
    /supervisor/i.test(rawText),
    `training evidence must mention supervisor training: ${filePath}`,
  );
  assert(
    /owner-admin/i.test(rawText),
    `training evidence must mention owner-admin training: ${filePath}`,
  );
  assert(
    /Status:\s*passed/i.test(rawText),
    `training evidence must conclude passed: ${filePath}`,
  );
  assert(
    !/Pilot Approver/i.test(rawText),
    `training evidence must not use placeholder names: ${filePath}`,
  );
  const recordedAt = matchFirst(rawText, [
    /Completed at:\s*([^\n]+)/i,
    /RecordedAt:\s*([^\n]+)/i,
  ]);
  if (recordedAt) {
    assertNotFutureTimestamp(
      recordedAt,
      `training gate evidence recordedAt`,
      referenceTime,
    );
    assertNotBeforeTimestamp(
      recordedAt,
      `training gate evidence recordedAt`,
      new Date(document.releaseFreezeAt),
    );
  }
}

function validateFinalApprovalEvidence(
  filePath,
  rawText,
  document,
  referenceTime,
) {
  assert(
    /Approved:\s*yes/i.test(rawText),
    `final approval must be explicit: ${filePath}`,
  );
  const approver = matchFirst(rawText, [/Approver:\s*([^\n]+)/i]);
  assert(
    isNonEmptyString(approver),
    `final approval must name an approver: ${filePath}`,
  );
  assert(
    !/Pilot Approver/i.test(approver),
    `final approval must use a real approver name: ${filePath}`,
  );
  const recordedAt = matchFirst(rawText, [/RecordedAt:\s*([^\n]+)/i]);
  if (recordedAt) {
    assertNotFutureTimestamp(
      recordedAt,
      `final approval recordedAt`,
      referenceTime,
    );
    assertNotBeforeTimestamp(
      recordedAt,
      `final approval recordedAt`,
      new Date(document.releaseFreezeAt),
    );
  }
  assert(
    /CI run:\s*https:\/\/github\.com\/.+\/actions\/runs\/\d+/i.test(rawText),
    `final approval must include the CI run: ${filePath}`,
  );
  assert(
    /Security run:\s*https:\/\/github\.com\/.+\/actions\/runs\/\d+/i.test(
      rawText,
    ),
    `final approval must include the security run: ${filePath}`,
  );
  assert(
    !/placeholder/i.test(rawText),
    `final approval must not use placeholder language: ${filePath}`,
  );
}

function isPlaceholderCertificationUrl(value) {
  return /(^https?:\/\/)?([^/]+\.)?example(?:[/:]|$)|127\.0\.0\.1|localhost/i.test(
    value,
  );
}

function assertRealEvidencePath(evidencePath) {
  const normalized = evidencePath.replace(/\\/g, '/');
  assert(
    !FORBIDDEN_EVIDENCE_PATTERNS.some((pattern) => pattern.test(normalized)),
    `evidence path must point at real release evidence: ${evidencePath}`,
  );
  assert(
    normalized.endsWith('/readiness.json') ||
      normalized.endsWith('readiness.json'),
    `evidence path must point at readiness.json: ${evidencePath}`,
  );
}

function isAllowedEvidenceReference(reference) {
  if (!isNonEmptyString(reference)) {
    return false;
  }

  const normalized = reference.replace(/\\/g, '/');
  return !FORBIDDEN_EVIDENCE_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidencePath = resolve(args.evidence ?? REAL_EVIDENCE_PATH);
  const evidenceDir = resolve(
    args['evidence-dir'] ?? 'docs/release-evidence/sprint-5-pilot',
  );
  const referenceTime = args['reference-time']
    ? new Date(args['reference-time'])
    : new Date();
  const document = loadJson(evidencePath);

  validateReadinessDocument(document, { evidencePath, referenceTime });
  validateEvidenceBundle(evidenceDir, document, { referenceTime });

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
