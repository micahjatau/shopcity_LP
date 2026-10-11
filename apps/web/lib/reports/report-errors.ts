export type ReportProblem = {
  status: number;
  title: string;
  detail: string;
  requestId?: string;
  retryAfterSeconds?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function retryAfterFromHeaders(headers?: Headers): number | undefined {
  const value = headers?.get('Retry-After');
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);

  const date = Date.parse(value);
  return Number.isNaN(date)
    ? undefined
    : Math.max(1, Math.ceil((date - Date.now()) / 1000));
}

export function reportProblemFromHttpResponse(
  status: number,
  payload: unknown,
  headers?: Headers,
): ReportProblem {
  const body = asRecord(payload);
  const error = asRecord(body?.error);
  const metadata = asRecord(body?.meta);
  const details = asRecord(error?.details);
  const requestId =
    nonEmptyString(metadata?.requestId) ??
    nonEmptyString(body?.requestId) ??
    nonEmptyString(error?.requestId);
  const retryAfterSeconds =
    status === 429
      ? (retryAfterFromHeaders(headers) ??
        (typeof details?.retryAfterSeconds === 'number' &&
        Number.isFinite(details.retryAfterSeconds) &&
        details.retryAfterSeconds > 0
          ? Math.ceil(details.retryAfterSeconds)
          : 60))
      : undefined;

  const title =
    status === 403
      ? "You don't have access to this report"
      : status === 429
        ? 'Report request limit reached'
        : status >= 500
          ? 'Reporting service unavailable'
          : (nonEmptyString(body?.title) ??
            nonEmptyString(error?.title) ??
            'Could not load this report');
  const detail =
    nonEmptyString(body?.detail) ??
    nonEmptyString(error?.message) ??
    (status === 403
      ? 'Your current role cannot access this report.'
      : status === 429
        ? 'Please wait before trying this report again.'
        : 'The report could not be loaded. Try again.');

  return { status, title, detail, requestId, retryAfterSeconds };
}

export function reportProblemFromSettled(
  result: PromiseSettledResult<unknown>,
): ReportProblem | null {
  if (result.status === 'rejected') {
    const reason = asRecord(result.reason);
    const response = asRecord(reason?.response);
    const status =
      typeof reason?.status === 'number'
        ? reason.status
        : typeof response?.status === 'number'
          ? response.status
          : 0;
    if (status >= 400) {
      return reportProblemFromHttpResponse(
        status,
        reason?.data ?? response?.data ?? reason?.body,
      );
    }
    return {
      status: 0,
      title: 'Reporting service unavailable',
      detail: 'The report service could not be reached. Try again.',
    };
  }

  const response = asRecord(result.value);
  const status = typeof response?.status === 'number' ? response.status : 0;
  if (status < 400) return null;

  return reportProblemFromHttpResponse(
    status,
    response?.data,
    response?.headers instanceof Headers ? response.headers : undefined,
  );
}
