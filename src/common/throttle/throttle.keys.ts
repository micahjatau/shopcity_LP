import type { AuthenticatedRequest } from '../auth/session.types';

export function normalizeThrottleIdentity(value: string): string {
  return value.trim().toLowerCase();
}

export function buildLoginThrottleKey(request: AuthenticatedRequest): string[] {
  const body = request.body as { username?: string } | undefined;
  const username = body?.username
    ? normalizeThrottleIdentity(body.username)
    : '';

  const ip = request.ip || 'unknown';
  return [
    `login:ip:${ip}`,
    `login:account:${username || 'unknown-account'}`,
    `login:pair:${ip}:${username || 'unknown-account'}`,
  ];
}

export function buildCardLookupThrottleKey(
  request: AuthenticatedRequest,
): string {
  const tenantId = request.authContext?.user.tenantId ?? 'unknown-tenant';
  const userId = request.authContext?.user.id ?? 'unknown-user';
  return `card-lookup:${tenantId}:${userId}:${request.ip || 'unknown'}`;
}

export function buildEarnThrottleKey(request: AuthenticatedRequest): string {
  const tenantId = request.authContext?.user.tenantId ?? 'unknown-tenant';
  const userId = request.authContext?.user.id ?? 'unknown-user';
  const deviceId = request.authContext?.session.deviceId ?? 'unknown-device';
  return `earn:${tenantId}:${userId}:${deviceId}`;
}

export function buildRedeemThrottleKey(request: AuthenticatedRequest): string {
  const tenantId = request.authContext?.user.tenantId ?? 'unknown-tenant';
  const userId = request.authContext?.user.id ?? 'unknown-user';
  const deviceId = request.authContext?.session.deviceId ?? 'unknown-device';
  return `redeem:${tenantId}:${userId}:${deviceId}`;
}

export function buildReverseThrottleKey(request: AuthenticatedRequest): string {
  const tenantId = request.authContext?.user.tenantId ?? 'unknown-tenant';
  const userId = request.authContext?.user.id ?? 'unknown-user';
  return `reverse:${tenantId}:${userId}:${request.ip || 'unknown'}`;
}
