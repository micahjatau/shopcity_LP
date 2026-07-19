import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { SESSION_COOKIE_NAME } from '../../config/app.constants';
import { PUBLIC_ROUTE_KEY } from './auth.constants';
import { parseCookies } from './cookie';
import { AuthContext, AuthenticatedRequest } from './session.types';

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
    await this.prismaService.session.update({
      where: { id: authContext.session.id },
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
    include: { user: true },
  });

  if (
    !session ||
    session.status !== 'ACTIVE' ||
    session.expiresAt <= new Date() ||
    session.user.status !== UserStatus.ACTIVE
  ) {
    return null;
  }

  return { session, user: session.user };
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
