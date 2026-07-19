export interface ApiMeta {
  timestamp: string;
  path: string;
  requestId: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  meta: ApiMeta;
}

export function isApiEnvelope(value: unknown): boolean {
  return Boolean(
    value && typeof value === 'object' && 'success' in value && 'meta' in value,
  );
}
