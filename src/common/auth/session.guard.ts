import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { SESSION_COOKIE_NAME } from '../../config/app.constants';
import { PUBLIC_ROUTE_KEY } from './auth.constants';
import { parseCookies } from './cookie';
import { AuthenticatedRequest } from './session.types';

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
    const token = this.extractSessionToken(request);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const sessionTokenHash = hashToken(
      token,
      this.configService.get<string>('SESSION_SECRET') ?? '',
    );
    const session = await this.prismaService.session.findUnique({
      where: { sessionTokenHash },
      include: { user: true },
    });

    if (
      !session ||
      session.status !== 'ACTIVE' ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    request.authContext = { session, user: session.user };
    await this.prismaService.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  private extractSessionToken(
    request: AuthenticatedRequest,
  ): string | undefined {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    const cookies = parseCookies(request.headers.cookie);
    return cookies[SESSION_COOKIE_NAME];
  }
}

export function hashToken(token: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}
