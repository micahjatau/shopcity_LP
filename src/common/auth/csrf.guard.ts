import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { createHash } from 'node:crypto';
import { CSRF_COOKIE_NAME } from '../../config/app.constants';
import { PUBLIC_ROUTE_KEY } from './auth.constants';
import { AuthenticatedRequest } from './session.types';
import { extractAuthTransport, loadAuthContext } from './session.guard';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic || isSafeMethod(request.method)) {
      return true;
    }

    const authTransport =
      request.authTransport ?? extractAuthTransport(request);
    if (authTransport === 'bearer') {
      return true;
    }

    const contextState =
      request.authContext ??
      (await loadAuthContext(request, this.prismaService, this.configService));
    if (!contextState) {
      throw new ForbiddenException(
        'CSRF verification requires an authenticated session',
      );
    }

    const headerToken =
      (request.headers['x-csrf-token'] as string | undefined) ??
      (request.headers['x-xsrf-token'] as string | undefined);
    const cookieToken = parseCsrfCookie(
      request.headers.cookie,
      CSRF_COOKIE_NAME,
    );

    if (!headerToken || !cookieToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    if (headerToken !== cookieToken) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    const secret = this.configService.get<string>('CSRF_SECRET') ?? '';
    const providedHash = createHash('sha256')
      .update(`${secret}:${headerToken}`)
      .digest('hex');

    if (!timingSafeEquals(contextState.session.csrfTokenHash, providedHash)) {
      throw new ForbiddenException('CSRF token invalid');
    }

    return true;
  }
}

function isSafeMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function parseCsrfCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const match = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${cookieName}=`));
  return match?.slice(`${cookieName}=`.length);
}

function timingSafeEquals(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}
