#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const SECRET_KEY =
  /password|secret|cookie|csrf|authorization|bearer|storageState|session[_-]?(token|id)|access[_-]?token|service[_-]?role|redis[_-]?(url|token)/i;

function usage() {
  console.error(
    'Usage: verify-smoke-evidence.mjs --manifest <path> --candidate-sha <40-hex-sha>',
  );
  process.exitCode = 2;
}

function assertSafe(value, path = 'manifest') {
  if (Array.isArray(value))
    return value.forEach((item, i) => assertSafe(item, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY.test(key))
      throw new Error(`secret-like evidence key at ${path}.${key}`);
    assertSafe(nested, `${path}.${key}`);
  }
}

export function validateEvidence(manifest, candidateSha) {
  assertSafe(manifest);
  if (!/^[0-9a-f]{40}$/i.test(candidateSha))
    throw new Error('candidate SHA is invalid');
  if (manifest.candidateSha?.toLowerCase() !== candidateSha.toLowerCase())
    throw new Error('candidate SHA mismatch');
  if (!/^SMOKE-[A-Z0-9-]+$/i.test(manifest.smokeRunId ?? ''))
    throw new Error('smokeRunId is invalid');
  if (!['staging', 'production'].includes(manifest.environment))
    throw new Error('environment is invalid');
  if (!['PASS'].includes(manifest.result))
    throw new Error('smoke result is not PASS');
  if (!manifest.startedAt || !manifest.completedAt)
    throw new Error('timestamps are required');
  const startedAt = Date.parse(manifest.startedAt);
  const completedAt = Date.parse(manifest.completedAt);
  if (
    !Number.isFinite(startedAt) ||
    !Number.isFinite(completedAt) ||
    completedAt < startedAt
  )
    throw new Error('timestamps are invalid or out of order');
  if (!manifest.groups || typeof manifest.groups !== 'object')
    throw new Error('groups are required');
  const groups = [
    'cashier',
    'supervisor',
    'admin',
    'crossRole',
    'guardrails',
    'reconciliation',
  ];
  for (const group of groups)
    if (manifest.groups?.[group] !== 'PASS')
      throw new Error(`mandatory group ${group} did not PASS`);
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifestIndex = process.argv.indexOf('--manifest');
  const shaIndex = process.argv.indexOf('--candidate-sha');
  if (manifestIndex < 0 || shaIndex < 0) usage();
  else {
    try {
      const manifest = JSON.parse(
        await readFile(process.argv[manifestIndex + 1], 'utf8'),
      );
      validateEvidence(manifest, process.argv[shaIndex + 1]);
      console.log('Smoke evidence is valid');
    } catch (error) {
      console.error(
        `Smoke evidence invalid: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      process.exitCode = 1;
    }
  }
}
