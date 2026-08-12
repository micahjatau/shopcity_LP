#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const evidencePath = resolve(
  args.evidence ?? 'docs/release-evidence/sprint-5-pilot/restore-drill.json',
);
const maxRpoMinutes = Number(args['max-rpo-minutes'] ?? '60');
const maxRtoMinutes = Number(args['max-rto-minutes'] ?? '120');

if (!existsSync(evidencePath)) {
  throw new Error(`missing restore drill evidence: ${evidencePath}`);
}

const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const requiredKeys = [
  'releaseSha',
  'releaseArtifact',
  'backupCompletedAt',
  'restoreCompletedAt',
  'verificationCompletedAt',
  'restoreStartedAt',
  'providerBackupControl',
  'commands',
];

for (const key of requiredKeys) {
  if (!(key in evidence)) {
    throw new Error(`restore drill evidence missing ${key}`);
  }
}

const backupCompletedAt = new Date(evidence.backupCompletedAt);
const restoreStartedAt = new Date(evidence.restoreStartedAt);
const restoreCompletedAt = new Date(evidence.restoreCompletedAt);
const verificationCompletedAt = new Date(evidence.verificationCompletedAt);

if (
  [
    backupCompletedAt,
    restoreStartedAt,
    restoreCompletedAt,
    verificationCompletedAt,
  ].some((value) => Number.isNaN(value.getTime()))
) {
  throw new Error('restore drill timestamps must be valid ISO datetimes');
}

const observedRpoMinutes = minutesBetween(backupCompletedAt, restoreStartedAt);
const observedRtoMinutes = minutesBetween(
  restoreStartedAt,
  verificationCompletedAt,
);

if (observedRpoMinutes > maxRpoMinutes) {
  throw new Error(
    `observed RPO ${observedRpoMinutes}m exceeds ${maxRpoMinutes}m`,
  );
}

if (observedRtoMinutes > maxRtoMinutes) {
  throw new Error(
    `observed RTO ${observedRtoMinutes}m exceeds ${maxRtoMinutes}m`,
  );
}

if (!Array.isArray(evidence.commands) || evidence.commands.length === 0) {
  throw new Error(
    'restore drill evidence must record executed verification commands',
  );
}

for (const command of evidence.commands) {
  if (
    typeof command.command !== 'string' ||
    typeof command.status !== 'string'
  ) {
    throw new Error('restore drill commands must include command and status');
  }
}

if (evidence.commands.some((command) => command.status !== 'passed')) {
  throw new Error('restore drill evidence contains failed commands');
}

if (
  typeof evidence.providerBackupControl !== 'string' ||
  evidence.providerBackupControl.trim().length < 10
) {
  throw new Error(
    'restore drill evidence must document provider-managed backup control',
  );
}

console.log(
  JSON.stringify(
    {
      evidencePath,
      observedRpoMinutes,
      observedRtoMinutes,
      releaseSha: evidence.releaseSha,
      releaseArtifact: evidence.releaseArtifact,
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = 'true';
    }
  }
  return result;
}

function minutesBetween(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
