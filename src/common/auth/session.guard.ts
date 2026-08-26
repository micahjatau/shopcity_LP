import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { BranchStatus, TenantStatus, UserStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { SESSION_COOKIE_NAME } from '../../config/app.constants';
import { PUBLIC_ROUTE_KEY } from './auth.constants';
import { parseCookies } from './cookie';
import { AuthContext, AuthenticatedRequest, AuthUser } from './session.types';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authContext = await loadAuthContext(
      request,
      this.prismaService,
      this.configService,
    );
    if (!authContext) {
      throw new UnauthorizedException('Authentication required');
    }

    request.authContext = authContext;
    request.authTransport = extractAuthTransport(request);
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
    await this.prismaService.session.updateMany({
      where: {
        id: authContext.session.id,
        OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: staleThreshold } }],
      },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }
}

export function hashToken(token: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

export async function loadAuthContext(
  request: AuthenticatedRequest,
  prismaService: PrismaService,
  configService: ConfigService,
): Promise<AuthContext | null> {
  const token = extractSessionToken(request);
  if (!token) {
    return null;
  }

  const sessionTokenHash = hashToken(
    token,
    configService.get<string>('SESSION_SECRET') ?? '',
  );
  const session = await prismaService.session.findUnique({
    where: { sessionTokenHash },
    include: {
      user: { include: { tenant: true, branch: true } },
      device: { include: { branch: true } },
    },
  });

  if (
    !session ||
    session.status !== 'ACTIVE' ||
    session.expiresAt <= new Date() ||
    isSessionIdleExpired(session, session.user, configService)
  ) {
    return null;
  }

  if (!isAuthUserEligible(session.user)) {
    return null;
  }

  if (!isSessionDeviceEligible(session)) {
    return null;
  }

  return { session, user: session.user };
}

export function isSessionIdleExpired(
  session: { lastUsedAt: Date | null },
  user: Pick<AuthUser, 'role'>,
  configService: Pick<ConfigService, 'get'>,
  now = new Date(),
): boolean {
  if (!session.lastUsedAt) {
    return false;
  }

  const configKey =
    user.role === 'CASHIER'
      ? 'SESSION_IDLE_CASHIER_MINUTES'
      : user.role === 'SUPERVISOR'
        ? 'SESSION_IDLE_SUPERVISOR_MINUTES'
        : 'SESSION_IDLE_ADMIN_MINUTES';
  const idleMinutes = configService.get<number>(configKey) ?? 15;
  const cutoff = now.getTime() - idleMinutes * 60 * 1000;
  return session.lastUsedAt.getTime() <= cutoff;
}

export function extractSessionToken(
  request: AuthenticatedRequest,
): string | undefined {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  const cookies = parseCookies(request.headers.cookie);
  return cookies[SESSION_COOKIE_NAME];
}

export function extractAuthTransport(
  request: AuthenticatedRequest,
): 'bearer' | 'cookie' {
  const authorization = request.headers.authorization;
  return authorization?.startsWith('Bearer ') ? 'bearer' : 'cookie';
}

export function isAuthUserEligible(user: AuthUser): boolean {
  if (user.status !== UserStatus.ACTIVE) {
    return false;
  }

  if (user.tenant?.status !== TenantStatus.ACTIVE) {
    return false;
  }

  if (user.branchId && user.branch?.status !== BranchStatus.ACTIVE) {
    return false;
  }

  return true;
}

export function isSessionDeviceEligible(session: {
  deviceId: string | null;
  user: AuthUser;
  device?: {
    tenantId: string;
    status: string;
    branchId: string;
    branch?: { status: string };
  } | null;
}): boolean {
  if (!session.deviceId) {
    return true;
  }

  if (
    !session.device ||
    session.device.tenantId !== session.user.tenantId ||
    session.device.status !== 'ACTIVE' ||
    session.device.branch?.status !== 'ACTIVE'
  ) {
    return false;
  }

  if (
    session.user.branchId &&
    session.user.branchId !== session.device.branchId
  ) {
    return false;
  }

  return true;
}
