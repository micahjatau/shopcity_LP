#!/usr/bin/env node

const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const args = parseArgs(process.argv.slice(2));
const evidenceDir = args['evidence-dir'] ?? 'docs/release-evidence/sprint-3-halfway';
const releaseSha = args['release-sha'];

const requiredFiles = [
  'validation-summary.json',
  'README.md',
  'deployment-checklist.md',
  'rollback-checklist.md',
];
const generatedEvidenceFiles = [
  'migration-reconciliation.json',
  'object-probes.json',
  'backup-checksum.txt',
  'prisma-status.txt',
  'final-outcome.json',
];

for (const file of requiredFiles) {
  const filePath = join(process.cwd(), evidenceDir, file);
  assertFile(filePath, file);
}

if (evidenceDir.startsWith('test-results/')) {
  for (const file of generatedEvidenceFiles) {
    const filePath = join(process.cwd(), evidenceDir, file);
    assertFile(filePath, file);
  }
}

const validationSummary = readJson(
  join(process.cwd(), evidenceDir, 'validation-summary.json'),
);
if (releaseSha && validationSummary.releaseSha !== releaseSha) {
  fail(`releaseSha mismatch: expected ${releaseSha}, got ${validationSummary.releaseSha}`);
}

if (evidenceDir.startsWith('test-results/')) {
  const migrationReconciliation = readJson(
    join(process.cwd(), evidenceDir, 'migration-reconciliation.json'),
  );
  const objectProbes = readJson(
    join(process.cwd(), evidenceDir, 'object-probes.json'),
  );
  const finalOutcome = readJson(
    join(process.cwd(), evidenceDir, 'final-outcome.json'),
  );

  if (!Array.isArray(migrationReconciliation.restoredMigrations)) {
    fail('migration-reconciliation.json is missing restoredMigrations');
  }

  if (!Array.isArray(migrationReconciliation.committedMigrations)) {
    fail('migration-reconciliation.json is missing committedMigrations');
  }

  if (
    !Array.isArray(objectProbes.functions) ||
    !Array.isArray(objectProbes.indexes)
  ) {
    fail('object-probes.json is missing function or index probes');
  }

  if (
    typeof finalOutcome.backupChecksum !== 'string' ||
    finalOutcome.backupChecksum.length < 16
  ) {
    fail('final-outcome.json is missing backupChecksum');
  }

  if (finalOutcome.prismaMigrateStatus !== 'passed') {
    fail('final-outcome.json does not report a passed prisma migrate status');
  }

  if (finalOutcome.finalOutcome !== 'passed') {
    fail('final-outcome.json does not report a passed final outcome');
  }
}

console.log(`Halfway release evidence verified at ${evidenceDir}`);

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

function assertFile(filePath, label) {
  if (!existsSync(filePath)) {
    fail(`missing ${label}: ${filePath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function fail(message) {
  throw new Error(message);
}
