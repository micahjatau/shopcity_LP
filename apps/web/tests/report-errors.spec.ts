import {
  reportProblemFromHttpResponse,
  reportProblemFromSettled,
} from '../lib/reports/report-errors';

describe('report error presentation', () => {
  it('extracts friendly 403 detail and request reference from the existing API envelope', () => {
    const problem = reportProblemFromHttpResponse(403, {
      success: false,
      error: {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Report refresh is admin-only',
      },
      meta: { requestId: 'req-forbidden' },
    });

    expect(problem).toMatchObject({
      status: 403,
      title: "You don't have access to this report",
      detail: 'Report refresh is admin-only',
      requestId: 'req-forbidden',
    });
  });

  it('supports RFC 7807 problem fields and Retry-After when available', () => {
    const problem = reportProblemFromHttpResponse(
      429,
      {
        type: 'about:blank',
        title: 'Too many report requests',
        detail: 'Please wait before retrying.',
        requestId: 'req-rate-limit',
      },
      new Headers({ 'Retry-After': '9' }),
    );

    expect(problem).toMatchObject({
      status: 429,
      title: 'Report request limit reached',
      detail: 'Please wait before retrying.',
      requestId: 'req-rate-limit',
      retryAfterSeconds: 9,
    });
  });

  it('uses the documented one-minute fallback when a 429 omits retry metadata', () => {
    expect(reportProblemFromHttpResponse(429, {}).retryAfterSeconds).toBe(60);
  });

  it('distinguishes successful responses from unavailable network requests', () => {
    expect(
      reportProblemFromSettled({
        status: 'fulfilled',
        value: { status: 200, data: { data: { items: [] } } },
      }),
    ).toBeNull();
    expect(
      reportProblemFromSettled({
        status: 'rejected',
        reason: new Error('offline'),
      }),
    ).toMatchObject({
      status: 0,
      title: 'Reporting service unavailable',
    });
  });
});
