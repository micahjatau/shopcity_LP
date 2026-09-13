import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertSafeEvidence,
  buildCardLifecycleSmokeEvidence,
  buildPerformanceFixtureEvidence,
  buildWorkerSmsTerminalEvidence,
} from './runtime-certification-evidence.mjs';

describe('runtime certification evidence', () => {
  it('builds terminal worker SMS evidence without provider payloads', () => {
    const evidence = buildWorkerSmsTerminalEvidence({
      apiRuntimeSha: 'sha-1',
      workerRuntimeSha: 'sha-1',
      workerDeploymentId: 'worker-deploy-1',
      workerReady: true,
      outboxEventId: 'outbox-1',
      smsMessageId: 'sms-1',
      outboxStatus: 'COMPLETED',
      smsStatus: 'SENT',
      stateCounts: { queued: 0, sent: 1, failed: 0 },
    });

    assert.equal(evidence.workerReady, true);
    assert.equal(evidence.smsStatus, 'SENT');
  });

  it('builds card lifecycle smoke evidence from outcomes instead of logs', () => {
    const evidence = buildCardLifecycleSmokeEvidence({
      candidateSha: 'sha-1',
      assignmentStatus: 'PASS',
      replacementStatus: 'PASS',
      blockStatus: 'PASS',
      unblockStatus: 'PASS',
      replacementConcurrency: 'ONE_SUCCESS_ONE_CONFLICT',
      eventIds: ['event-1'],
      capturedAt: '2026-09-13T00:00:00.000Z',
    });

    assert.equal(evidence.replacementConcurrency, 'ONE_SUCCESS_ONE_CONFLICT');
  });

  it('records safe k6 fixture identity and setup result', () => {
    const evidence = buildPerformanceFixtureEvidence({
      runId: 'run-1',
      reportBranchId: 'branch-redacted-fixture',
      setupStatus: 'PASS',
      invalidFixture404Count: 0,
      p95Ms: 300,
    });

    assert.equal(evidence.invalidFixture404Count, 0);
  });

  it('rejects secret-bearing keys and raw phone values', () => {
    assert.throws(
      () => assertSafeEvidence({ providerPayload: { id: 'raw' } }),
      /providerPayload is not allowed/,
    );
    assert.throws(
      () => assertSafeEvidence({ maskedPhone: '+2348012345678' }),
      /unmasked phone-like value/,
    );
  });
});
