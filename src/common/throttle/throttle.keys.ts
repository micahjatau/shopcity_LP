import type { AuthenticatedRequest } from '../auth/session.types';

export function normalizeThrottleIdentity(value: string): string {
  return value.trim().toLowerCase();
}

export function buildLoginThrottleKey(request: AuthenticatedRequest): string {
  const body = request.body as { username?: string } | undefined;
  const username = body?.username
    ? normalizeThrottleIdentity(body.username)
    : '';
  return `login:${request.ip || 'unknown'}:${username}`;
}

export function buildCardLookupThrottleKey(
  request: AuthenticatedRequest,
): string {
  const tenantId = request.authContext?.user.tenantId ?? 'unknown-tenant';
  const userId = request.authContext?.user.id ?? 'unknown-user';
  return `card-lookup:${tenantId}:${userId}:${request.ip || 'unknown'}`;
}
