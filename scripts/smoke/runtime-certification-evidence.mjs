const SECRET_KEY_PATTERN =
  /(token|secret|password|cookie|authorization|credential|providerPayload|messageBody)/i;
const PHONE_PATTERN = /\+?\d{10,15}/;

export function assertSafeEvidence(value, path = 'evidence') {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    if (PHONE_PATTERN.test(value)) {
      throw new Error(`${path} contains an unmasked phone-like value`);
    }
    return;
  }
  if (typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new Error(`${childPath} is not allowed in smoke evidence`);
    }
    assertSafeEvidence(child, childPath);
  }
}

export function buildWorkerSmsTerminalEvidence(input) {
  const evidence = {
    apiRuntimeSha: input.apiRuntimeSha,
    workerRuntimeSha: input.workerRuntimeSha,
    workerDeploymentId: input.workerDeploymentId,
    workerReady: input.workerReady === true,
    outboxEventId: input.outboxEventId,
    smsMessageId: input.smsMessageId,
    outboxStatus: input.outboxStatus,
    smsStatus: input.smsStatus,
    attemptedAt: input.attemptedAt ?? null,
    terminalAt: input.terminalAt ?? null,
    stateCounts: input.stateCounts ?? {},
  };
  assertSafeEvidence(evidence, 'workerSmsTerminalEvidence');
  return evidence;
}

export function buildCardLifecycleSmokeEvidence(input) {
  const evidence = {
    candidateSha: input.candidateSha,
    assignmentStatus: input.assignmentStatus,
    replacementStatus: input.replacementStatus,
    blockStatus: input.blockStatus,
    unblockStatus: input.unblockStatus,
    replacementConcurrency: input.replacementConcurrency,
    eventIds: input.eventIds ?? [],
    capturedAt: input.capturedAt,
  };
  assertSafeEvidence(evidence, 'cardLifecycleSmokeEvidence');
  return evidence;
}

export function buildPerformanceFixtureEvidence(input) {
  const evidence = {
    runId: input.runId,
    reportBranchId: input.reportBranchId,
    setupStatus: input.setupStatus,
    invalidFixture404Count: input.invalidFixture404Count ?? 0,
    p95Ms: input.p95Ms ?? null,
  };
  assertSafeEvidence(evidence, 'performanceFixtureEvidence');
  return evidence;
}
