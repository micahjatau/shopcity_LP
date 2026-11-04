import {
  approvalsControllerListApprovalsV1,
  auditControllerListV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListMaterializationStateV1,
} from '../lib/api/generated-client';
import { refreshSessionOnce } from '../lib/api/session';
import {
  getAdminOverviewActivity,
  getAdminOverviewMaterialization,
  getAdminOverviewPendingApprovals,
  getAdminOverviewReports,
} from '../lib/admin-overview/api';
import { recentReportPeriod } from '../lib/reports/supervisor-report-metrics';

jest.mock('../lib/api/generated-client', () => ({
  approvalsControllerListApprovalsV1: jest.fn(),
  auditControllerListV1: jest.fn(),
  reportsControllerListExecutiveSummaryV1: jest.fn(),
  reportsControllerListMaterializationStateV1: jest.fn(),
}));
jest.mock('../lib/api/session', () => ({ refreshSessionOnce: jest.fn() }));

const meta = {
  timestamp: '2026-10-27T12:00:00.000Z',
  path: '/api/v1/reports/executive-summary',
  requestId: 'request-123',
};

function response(status: number, data: unknown, headers = new Headers()) {
  return { status, data, headers } as never;
}

function reportEnvelope(items: unknown[] = []) {
  return {
    success: true,
    data: {
      scope: 'TENANT',
      scopeKey: 'tenant-1',
      branchId: null,
      timezone: 'Africa/Lagos',
      items,
    },
    meta,
  };
}

function errorEnvelope(status: number, code: string, message: string) {
  return {
    success: false,
    error: {
      statusCode: status,
      code,
      message,
      details: { detail: 'Try later.' },
    },
    meta,
  };
}

describe('Admin Overview API adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mockResolvedValue(
        response(
          200,
          reportEnvelope([{ reportDate: '2026-10-27', creditIssuedKobo: 0 }]),
        ) as never,
      );
    jest.mocked(reportsControllerListMaterializationStateV1).mockResolvedValue(
      response(200, {
        ...reportEnvelope([
          { status: 'COMPLETED', materializedAt: '2026-10-27T11:00:00.000Z' },
        ]),
        data: {
          ...reportEnvelope().data,
          items: [
            {
              status: 'COMPLETED',
              materializedAt: '2026-10-27T11:00:00.000Z',
            },
          ],
        },
      }) as never,
    );
    jest.mocked(approvalsControllerListApprovalsV1).mockResolvedValue(
      response(200, {
        success: true,
        data: { items: [], totalCount: 0 },
        meta,
      }) as never,
    );
    jest
      .mocked(auditControllerListV1)
      .mockResolvedValue(
        response(200, { success: true, data: [], meta }) as never,
      );
  });

  it('validates each existing endpoint envelope and keeps explicit zero distinct from missing data', async () => {
    const [reports, state, approvals, activity] = await Promise.all([
      getAdminOverviewReports(recentReportPeriod(7)),
      getAdminOverviewMaterialization(),
      getAdminOverviewPendingApprovals(),
      getAdminOverviewActivity(),
    ]);

    expect(reports.items[0].creditIssuedKobo).toBe(0);
    expect(state.status).toBe('COMPLETED');
    expect(approvals.totalCount).toBe(0);
    expect(activity.items).toEqual([]);
  });

  it('normalizes API errors and honors Retry-After without automatic retries', async () => {
    jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mockResolvedValueOnce(
        response(
          429,
          errorEnvelope(429, 'RATE_LIMITED', 'Too many requests'),
          new Headers({ 'Retry-After': '30' }),
        ) as never,
      );

    await expect(
      getAdminOverviewReports(recentReportPeriod(7)),
    ).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      title: 'Too many requests',
      detail: 'Try later.',
      requestId: 'request-123',
      retryAt: expect.any(Number),
    });
    expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(1);
  });

  it('applies a default cooldown when a 429 omits Retry-After', async () => {
    const startedAt = Date.now();
    jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mockResolvedValueOnce(
        response(
          429,
          errorEnvelope(429, 'RATE_LIMITED', 'Too many requests'),
        ) as never,
      );

    const error = await getAdminOverviewReports(recentReportPeriod(7)).catch(
      (caught: unknown) => caught,
    );
    expect(error).toMatchObject({ status: 429, code: 'RATE_LIMITED' });
    expect((error as { retryAt: number }).retryAt).toBeGreaterThanOrEqual(
      startedAt + 29_999,
    );
    expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(1);
  });

  it('refreshes an expired session once and retries the original endpoint once', async () => {
    jest.mocked(refreshSessionOnce).mockResolvedValue({} as never);
    jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mockResolvedValueOnce(
        response(
          401,
          errorEnvelope(401, 'AUTH_REQUIRED', 'Authentication required'),
        ) as never,
      )
      .mockResolvedValueOnce(response(200, reportEnvelope()) as never);

    const result = await getAdminOverviewReports(recentReportPeriod(7));

    expect(result.items).toEqual([]);
    expect(refreshSessionOnce).toHaveBeenCalledTimes(1);
    expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed success envelopes with a typed contract error', async () => {
    jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mockResolvedValueOnce(
        response(200, { success: true, data: { items: [] } }) as never,
      );

    const result = getAdminOverviewReports(recentReportPeriod(7));
    await expect(result).rejects.toMatchObject({
      name: 'OverviewApiError',
      status: 502,
      code: 'INVALID_API_RESPONSE',
    });
  });

  it('retries a 5xx response at most once', async () => {
    jest.useFakeTimers();
    jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mockResolvedValueOnce(
        response(
          503,
          errorEnvelope(503, 'SERVICE_UNAVAILABLE', 'Unavailable'),
        ) as never,
      )
      .mockResolvedValueOnce(
        response(
          503,
          errorEnvelope(503, 'SERVICE_UNAVAILABLE', 'Unavailable'),
        ) as never,
      );

    try {
      const result = expect(
        getAdminOverviewReports(recentReportPeriod(7)),
      ).rejects.toMatchObject({ status: 503 });
      await jest.advanceTimersByTimeAsync(200);
      await result;
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
