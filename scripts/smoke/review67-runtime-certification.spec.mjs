import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import {
  loadRuntimeCertificationConfig,
  runCardLifecycle,
  runDuplicateReceiptRegression,
  runReportPerformance,
  runWorkerTerminalState,
} from './review67-runtime-certification.mjs';

const baseConfig = {
  baseUrl: 'https://staging.example.test',
  sessionToken: 'session-redacted',
  csrfToken: 'csrf-redacted',
  branchId: 'branch-1',
  activeCardSerial: 'ACTIVE-CARD-1',
  lifecycleCustomerId: 'customer-1',
  assignCardSerial: 'ASSIGN-CARD-1',
  replaceCardSerial: 'REPLACE-CARD-1',
  outputPath: '/tmp/review67-runtime-certification.json',
  candidateSha: 'a'.repeat(40),
  workerRuntimeSha: 'a'.repeat(40),
  workerDeploymentId: 'worker-1',
  workerReady: true,
  reportIterations: 3,
  reportP95ThresholdMs: 1800,
};

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify({ data: body }),
  };
}

describe('Review 67 runtime certification runner', () => {
  it('requires authenticated runtime configuration', () => {
    assert.throws(
      () => loadRuntimeCertificationConfig({}),
      /REVIEW67_BASE_URL/,
    );
  });

  it('accepts duplicate receipt 409 and rejects 500 regressions', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      response(fetchMock.mock.callCount() === 0 ? 201 : 409, {
        transactionId: 'tx-1',
      }),
    );
    try {
      const evidence = await runDuplicateReceiptRegression(baseConfig);
      assert.equal(evidence.result, 'PASS');
      assert.equal(evidence.httpStatus, 409);
    } finally {
      fetchMock.mock.restore();
    }

    const failedFetch = mock.method(globalThis, 'fetch', async () =>
      response(failedFetch.mock.callCount() === 0 ? 201 : 500, {
        code: 'INTERNAL',
      }),
    );
    try {
      await assert.rejects(
        () => runDuplicateReceiptRegression(baseConfig),
        /returned 500/,
      );
    } finally {
      failedFetch.mock.restore();
    }
  });

  it('captures card lifecycle and one-success replacement concurrency', async () => {
    const statuses = [201, 200, 200, 201, 409];
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      response(statuses.shift() ?? 500, { id: 'card-1' }),
    );
    try {
      const evidence = await runCardLifecycle(baseConfig);
      assert.equal(evidence.result, 'PASS');
      assert.equal(evidence.replacementConcurrency, 'ONE_SUCCESS_ONE_CONFLICT');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('enforces report p95 threshold while recording fixture identity', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      response(200, { items: [] }),
    );
    try {
      const evidence = await runReportPerformance(baseConfig);
      assert.equal(evidence.result, 'PASS');
      assert.equal(evidence.invalidFixture404Count, 0);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('builds worker/provider terminal-state evidence from sms operations', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      response(200, { items: [{ status: 'SENT' }, { status: 'FAILED' }] }),
    );
    try {
      const evidence = await runWorkerTerminalState(baseConfig);
      assert.equal(evidence.result, 'PASS');
      assert.equal(evidence.workerReady, true);
      assert.deepEqual(evidence.stateCounts, { sent: 1, failed: 1 });
    } finally {
      fetchMock.mock.restore();
    }
  });
});
