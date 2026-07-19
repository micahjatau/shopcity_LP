import { randomUUID } from 'node:crypto';
import { FastifyReply, FastifyRequest } from 'fastify';

export const REQUEST_ID_HEADER = 'x-request-id';

export function resolveRequestId(request: FastifyRequest): string {
  const headerValue =
    request.headers[REQUEST_ID_HEADER] ?? request.headers['x-correlation-id'];
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  if (
    Array.isArray(headerValue) &&
    headerValue.length > 0 &&
    headerValue[0].trim().length > 0
  ) {
    return headerValue[0].trim();
  }

  return request.id || randomUUID();
}

export function setRequestIdHeader(
  reply: FastifyReply,
  requestId: string,
): void {
  reply.header('X-Request-Id', requestId);
}
