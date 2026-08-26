#!/usr/bin/env node

const fs = require('node:fs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
}

function verifyFrontendEvidence(document, candidateSha) {
  assert(isSha(candidateSha), 'candidate SHA must be a 40-character git SHA');
  assert(
    document && typeof document === 'object',
    'evidence must be an object',
  );
  assert(document.candidateSha === candidateSha, 'candidate SHA mismatch');

  const deployment = document.canonicalDeployment;
  assert(deployment?.projectId, 'canonical project ID is required');
  assert(deployment?.deploymentId, 'canonical deployment ID is required');
  assert(deployment?.runtimeRegion, 'canonical runtime region is required');
  assert(
    deployment?.duplicateContextStatus,
    'duplicate context status is required',
  );
  assert(
    ['disconnected', 'excluded-approved', 'blocker'].includes(
      deployment.duplicateContextStatus,
    ),
    'duplicate context status must be explicit',
  );

  const topology = document.topology;
  for (const field of ['frontendRegion', 'backendRegion', 'databaseRegion']) {
    assert(topology?.[field], `${field} is required`);
  }

  assert(
    Array.isArray(document.checks) && document.checks.length > 0,
    'checks are required',
  );
  for (const check of document.checks) {
    assert(
      check.name && check.status && check.candidateSha,
      'each check needs name, status, and candidate SHA',
    );
    assert(
      check.candidateSha === candidateSha,
      `check SHA mismatch: ${check.name}`,
    );
  }

  const performance = document.performance;
  assert(
    Array.isArray(performance?.routes) && performance.routes.length > 0,
    'performance routes are required',
  );
  for (const route of performance.routes) {
    assert(
      route.path && Number.isFinite(route.warmJsBytes),
      'performance route metrics are incomplete',
    );
  }

  for (const exception of document.exceptions ?? []) {
    assert(exception.observedValue, 'exception observed value is required');
    assert(exception.owner, 'exception owner is required');
    assert(exception.followUpDate, 'exception follow-up date is required');
  }

  return true;
}

if (require.main === module) {
  const file = process.argv[2];
  const candidateSha = process.argv[3] ?? process.env.CANDIDATE_SHA;
  assert(
    file,
    'usage: verify-frontend-stabilization.cjs <evidence.json> <candidate-sha>',
  );
  verifyFrontendEvidence(
    JSON.parse(fs.readFileSync(file, 'utf8')),
    candidateSha,
  );
  console.log(`Frontend stabilization evidence verified for ${candidateSha}`);
}

module.exports = { verifyFrontendEvidence };
