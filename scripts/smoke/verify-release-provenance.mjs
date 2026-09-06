#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const SHA = /^[0-9a-f]{40}$/i;

export function validateReleaseProvenance(record, candidateSha, environment) {
  if (!record || typeof record !== 'object')
    throw new Error('provenance must be an object');
  if (!SHA.test(candidateSha)) throw new Error('candidate SHA is invalid');
  if (record.candidateSha?.toLowerCase() !== candidateSha.toLowerCase())
    throw new Error('provenance candidate SHA mismatch');
  if (record.environment !== environment)
    throw new Error('provenance environment mismatch');
  for (const key of ['workflowDefinitionSha', 'deployedFrontendSha', 'deployedBackendSha']) {
    if (!SHA.test(record[key] ?? ''))
      throw new Error(`provenance ${key} is invalid`);
  }
  if (record.deployedFrontendSha.toLowerCase() !== candidateSha.toLowerCase())
    throw new Error('frontend deployment SHA mismatch');
  if (record.deployedBackendSha.toLowerCase() !== candidateSha.toLowerCase())
    throw new Error('backend deployment SHA mismatch');
  if (!/^\d+$/.test(String(record.workflowRunId ?? '')))
    throw new Error('workflow run ID is invalid');
  if (record.verifierVersion !== 'verify-smoke-evidence-v1')
    throw new Error('verifier version is invalid');
  if (!record.recordedAt || !Number.isFinite(Date.parse(record.recordedAt)))
    throw new Error('provenance timestamp is invalid');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fileIndex = process.argv.indexOf('--file');
  const shaIndex = process.argv.indexOf('--candidate-sha');
  const environmentIndex = process.argv.indexOf('--environment');
  if (fileIndex < 0 || shaIndex < 0 || environmentIndex < 0) {
    console.error(
      'Usage: verify-release-provenance.mjs --file <path> --candidate-sha <sha> --environment <environment>',
    );
    process.exitCode = 2;
  } else {
    try {
      const record = JSON.parse(await readFile(process.argv[fileIndex + 1], 'utf8'));
      validateReleaseProvenance(
        record,
        process.argv[shaIndex + 1],
        process.argv[environmentIndex + 1],
      );
      console.log('Release provenance is valid');
    } catch (error) {
      console.error(
        `Release provenance invalid: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      process.exitCode = 1;
    }
  }
}
