import {
  approvalsControllerListApprovalsV1,
  auditControllerListV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListMaterializationStateV1,
} from '../api/generated-client';
import { createApiRequest } from '../api/request';
import { refreshSessionOnce } from '../api/session';
import type {
  ReportPeriod,
  ReportRow,
} from '../reports/supervisor-report-metrics';

export type ApiMeta = {
  timestamp: string;
  path: string;
  requestId: string;
};

type ApiResponse = {
  status: number;
  data: unknown;
  headers?: Headers;
};

type SuccessEnvelope = {
  success: true;
  data: Record<string, unknown> | unknown[];
  meta: ApiMeta;
};

export type AdminOverviewReportData = {
  items: ReportRow[];
  meta: ApiMeta;
};

export type AdminOverviewMaterialization = {
  status: string | null;
  materializedAt: string | null;
  updatedAt: string | null;
  metaTimestamp: string;
};

export type AdminOverviewPendingApprovals = {
  totalCount: number | null;
  meta: ApiMeta;
};

export type AdminOverviewAuditEvent = {
  id?: string;
  action?: string;
  entityType?: string;
  entityId?: string | null;
  actorId?: string | null;
  actorDisplayName?: string;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
};

export class OverviewApiError extends Error {
  readonly name = 'OverviewApiError';

  constructor(
    readonly status: number,
    readonly code: string,
    readonly title: string,
    readonly detail: string,
    readonly requestId: string | null,
    readonly retryAt: number | null,
  ) {
    super(title);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readRequestId(value: unknown, headers?: Headers): string | null {
  if (isRecord(value) && isRecord(value.meta)) {
    const metaId = stringField(value.meta.requestId);
    if (metaId) return metaId;
  }
  return (
    headers?.get('x-request-id') ?? headers?.get('x-correlation-id') ?? null
  );
}

function retryAt(headers?: Headers): number {
  const fallback = Date.now() + 30_000;
  const value = headers?.get('retry-after');
  if (!value) return fallback;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Date.now() + seconds * 1_000;
  }
  const date = Date.parse(value);
  return Number.isNaN(date) ? fallback : Math.max(Date.now(), date);
}

function problemFromResponse(response: ApiResponse): OverviewApiError {
  const body = isRecord(response.data) ? response.data : {};
  const error = isRecord(body.error) ? body.error : body;
  const details = isRecord(error.details) ? error.details : {};
  const status = Number.isSafeInteger(response.status) ? response.status : 0;
  const title =
    stringField(error.title) ??
    stringField(error.message) ??
    (status === 429
      ? 'Too many requests'
      : status === 403
        ? 'Access denied'
        : status === 401
          ? 'Authentication required'
          : 'Unable to load this section');
  const detail =
    stringField(error.detail) ??
    stringField(details.detail) ??
    stringField(details.message) ??
    (status === 0 ? 'Check your connection and try again.' : '');

  return new OverviewApiError(
    status,
    stringField(error.code) ?? 'REQUEST_FAILED',
    title,
    detail,
    readRequestId(body, response.headers),
    response.status === 429 ? retryAt(response.headers) : null,
  );
}

function invalidResponse(endpoint: string, value?: unknown): OverviewApiError {
  return new OverviewApiError(
    502,
    'INVALID_API_RESPONSE',
    'Unexpected response',
    `The ${endpoint} response did not match the documented API contract.`,
    readRequestId(value),
    null,
  );
}

async function delayBeforeRetry() {
  await new Promise((resolve) => setTimeout(resolve, 200));
}

async function execute<T>(
  endpoint: string,
  request: () => Promise<unknown>,
  parse: (value: unknown, headers?: Headers) => T,
): Promise<T> {
  let response: ApiResponse;
  try {
    response = (await request()) as ApiResponse;
  } catch {
    throw problemFromResponse({ status: 0, data: null });
  }

  if (response.status === 401) {
    let refreshed = false;
    try {
      refreshed = Boolean(await refreshSessionOnce());
    } catch {
      refreshed = false;
    }
    if (refreshed) {
      try {
        response = (await request()) as ApiResponse;
      } catch {
        throw problemFromResponse({ status: 0, data: null });
      }
    }
  }

  if (response.status >= 500 && response.status <= 599) {
    await delayBeforeRetry();
    try {
      response = (await request()) as ApiResponse;
    } catch {
      throw problemFromResponse({ status: 0, data: null });
    }
  }

  if (response.status !== 200) throw problemFromResponse(response);

  try {
    return parse(response.data, response.headers);
  } catch (error) {
    if (error instanceof OverviewApiError) throw error;
    throw invalidResponse(endpoint, response.data);
  }
}

function readSuccessEnvelope(
  value: unknown,
  endpoint: string,
): SuccessEnvelope {
  if (
    !isRecord(value) ||
    value.success !== true ||
    (!isRecord(value.data) && !Array.isArray(value.data)) ||
    !isRecord(value.meta)
  ) {
    throw invalidResponse(endpoint, value);
  }

  const { timestamp, path, requestId } = value.meta;
  if (
    typeof timestamp !== 'string' ||
    typeof path !== 'string' ||
    typeof requestId !== 'string'
  ) {
    throw invalidResponse(endpoint, value);
  }

  return {
    success: true,
    data: value.data,
    meta: { timestamp, path, requestId },
  };
}

function readItems(value: unknown, endpoint: string) {
  const envelope = readSuccessEnvelope(value, endpoint);
  if (!isRecord(envelope.data) || !Array.isArray(envelope.data.items)) {
    throw invalidResponse(endpoint, value);
  }
  if (!envelope.data.items.every(isRecord))
    throw invalidResponse(endpoint, value);
  return { envelope, data: envelope.data, items: envelope.data.items };
}

export function getAdminOverviewReports(
  period: ReportPeriod,
): Promise<AdminOverviewReportData> {
  return execute(
    'executive summary',
    () =>
      reportsControllerListExecutiveSummaryV1(
        { from: period.from, to: period.to, timezone: 'Africa/Lagos' },
        createApiRequest(),
      ),
    (value) => {
      const { envelope, items } = readItems(value, 'executive summary');
      return { items, meta: envelope.meta };
    },
  );
}

export function getAdminOverviewMaterialization(): Promise<AdminOverviewMaterialization> {
  return execute(
    'report materialization state',
    () =>
      reportsControllerListMaterializationStateV1(
        { timezone: 'Africa/Lagos' },
        createApiRequest(),
      ),
    (value) => {
      const { envelope, items } = readItems(
        value,
        'report materialization state',
      );
      const state = items[0];
      return {
        status: state ? stringField(state.status) : null,
        materializedAt: state ? stringField(state.materializedAt) : null,
        updatedAt: state ? stringField(state.updatedAt) : null,
        metaTimestamp: envelope.meta.timestamp,
      };
    },
  );
}

export function getAdminOverviewPendingApprovals(): Promise<AdminOverviewPendingApprovals> {
  return execute(
    'pending approvals',
    () =>
      approvalsControllerListApprovalsV1(
        {
          limit: '1',
          cursor: '',
          status: 'PENDING',
          includeTotalCount: true,
        },
        createApiRequest(),
      ),
    (value) => {
      const { envelope, data } = readItems(value, 'pending approvals');
      const count = data.totalCount;
      if (
        count !== undefined &&
        (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
      ) {
        throw invalidResponse('pending approvals', value);
      }
      return {
        totalCount: typeof count === 'number' ? count : null,
        meta: envelope.meta,
      };
    },
  );
}

export function getAdminOverviewActivity(): Promise<{
  items: AdminOverviewAuditEvent[];
  meta: ApiMeta;
}> {
  return execute(
    'recent activity',
    // OpenAPI requires actorId but the backend treats an empty value as no filter.
    () => auditControllerListV1({ actorId: '' }, createApiRequest()),
    (value) => {
      const envelope = readSuccessEnvelope(value, 'recent activity');
      if (!Array.isArray(envelope.data) || !envelope.data.every(isRecord)) {
        throw invalidResponse('recent activity', value);
      }
      const items = envelope.data.map((event): AdminOverviewAuditEvent => ({
        id: stringField(event.id) ?? undefined,
        action: stringField(event.action) ?? undefined,
        entityType: stringField(event.entityType) ?? undefined,
        entityId:
          typeof event.entityId === 'string' || event.entityId === null
            ? event.entityId
            : undefined,
        actorId:
          typeof event.actorId === 'string' || event.actorId === null
            ? event.actorId
            : undefined,
        actorDisplayName: stringField(event.actorDisplayName) ?? undefined,
        createdAt: stringField(event.createdAt) ?? undefined,
        metadata: isRecord(event.metadata) ? event.metadata : null,
      }));
      return { items, meta: envelope.meta };
    },
  );
}
