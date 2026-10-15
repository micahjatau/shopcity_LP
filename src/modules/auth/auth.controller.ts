import {
  Body,
  Controller,
  Get,
  HttpCode,
  Headers,
  Post,
  Res,
  Version,
} from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { DEVICE_TOKEN_COOKIE_NAME } from '../../common/auth/device-token';
import {
  CashierLoginCompleteDto,
  LoginDto,
  LocalCashierTestSessionDto,
  SmokeSessionBootstrapDto,
  authResponseSchema,
} from './auth.dto';
import { PublicRoute } from '../../common/auth/public-route.decorator';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildLoginThrottleKey } from '../../common/throttle/throttle.keys';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '../../config/app.constants';
import { CurrentSession } from '../../common/auth/current-user.decorator';
import type { AuthContext } from '../../common/auth/session.types';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import {
  clearCookie,
  buildCookie,
  buildCsrfCookie,
  parseCookies,
} from '../../common/auth/cookie';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';

export function buildCashierLoginCompletionThrottleKey(
  request: AuthenticatedRequest,
): string {
  const body = request.body;
  const attemptToken =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { attemptToken?: unknown }).attemptToken
      : undefined;
  const validToken =
    typeof attemptToken === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(attemptToken);
  const tokenHash = validToken
    ? createHash('sha256').update(attemptToken).digest('hex')
    : 'invalid-attempt';
  return `cashier-login-complete:${request.ip || 'unknown'}:${tokenHash}`;
}

@ApiTags('auth')
@Controller('auth')
@apiErrorEnvelopeResponses({
  unauthorized: {
    authRequired: {
      statusCode: 401,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    },
    deviceRevoked: {
      statusCode: 401,
      code: 'DEVICE_REVOKED',
      message: 'Device session is no longer valid',
    },
  },
  conflict: {
    deviceAttestationReplayed: {
      statusCode: 409,
      code: 'DEVICE_ATTESTATION_REPLAYED',
      message: 'Device attestation has already been used',
    },
  },
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @PublicRoute()
  @Throttle({
    bucket: 'auth.login',
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyFactory: buildLoginThrottleKey,
  })
  @ApiHeader({ name: 'x-device-id', required: false })
  @ApiHeader({ name: 'x-device-attestation', required: false })
  @ApiHeader({ name: 'origin', required: false })
  @ApiHeader({ name: 'referer', required: false })
  @ApiHeader({
    name: 'cookie',
    required: false,
    description:
      'Browser-managed __Host-shopcity_pos_device cookie for DEVICE_TOKEN cashier login',
  })
  @Version('1')
  @HttpCode(200)
  @apiSuccessEnvelopeResponse({
    description: 'Authenticated session created',
    dataSchema: authResponseSchema(),
  })
  @apiSuccessEnvelopeResponse({
    description: 'Cashier password accepted; WebAuthn assertion required',
    status: 202,
    dataSchema: {
      type: 'object',
      required: ['code', 'attemptToken', 'options'],
      properties: {
        code: { type: 'string', enum: ['DEVICE_ASSERTION_REQUIRED'] },
        attemptToken: { type: 'string', minLength: 43, maxLength: 43 },
        options: { type: 'object', additionalProperties: true },
      },
      additionalProperties: false,
    },
  })
  @apiErrorEnvelopeResponses({
    unauthorized: {
      deviceAuthFailed: {
        statusCode: 401,
        code: 'DEVICE_AUTH_FAILED',
        message: 'Device authentication failed',
      },
    },
    tooManyRequests: {
      rateLimited: {
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      },
    },
  })
  @ApiOperation({ summary: 'Create authenticated session' })
  async login(
    @Body() dto: LoginDto,
    @Headers('x-device-id') deviceId: string | undefined,
    @Headers('x-device-attestation') deviceAttestation: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Headers('origin') origin: string | undefined,
    @Headers('referer') referer: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.authService.assertPublicLoginOrigin(origin, referer);
    const deviceToken = parseCookies(cookieHeader)[DEVICE_TOKEN_COOKIE_NAME];
    const result = await this.authService.login(
      dto.username,
      dto.password,
      deviceId,
      deviceAttestation,
      deviceToken,
    );
    if (!('sessionToken' in result)) {
      reply.code(202);
      return {
        code: result.code,
        attemptToken: result.attemptToken,
        options: result.options,
      };
    }
    const issued = result;
    const maxAge = Math.max(
      0,
      Math.floor(
        (issued.context.session.expiresAt.getTime() - Date.now()) / 1000,
      ),
    );

    this.setSessionCookies(
      reply,
      issued.sessionToken,
      issued.csrfToken,
      maxAge,
    );

    return this.authService.toResponse(issued.context);
  }

  @Post('cashier-login/complete')
  @PublicRoute()
  @Throttle({
    bucket: 'auth.cashier_login.complete',
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyFactory: buildCashierLoginCompletionThrottleKey,
  })
  @Version('1')
  @HttpCode(200)
  @apiSuccessEnvelopeResponse({
    description:
      'Authenticated cashier session created after WebAuthn assertion',
    dataSchema: authResponseSchema(),
  })
  @apiErrorEnvelopeResponses({
    unauthorized: {
      deviceAuthFailed: {
        statusCode: 401,
        code: 'DEVICE_AUTH_FAILED',
        message: 'Device authentication failed',
      },
    },
    tooManyRequests: {
      rateLimited: {
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      },
    },
  })
  @ApiOperation({ summary: 'Complete cashier WebAuthn login' })
  async completeCashierLogin(
    @Body() dto: CashierLoginCompleteDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const issued = await this.authService.completeCashierLogin(
      dto.attemptToken,
      dto.assertion,
    );
    const maxAge = Math.max(
      0,
      Math.floor(
        (issued.context.session.expiresAt.getTime() - Date.now()) / 1000,
      ),
    );
    this.setSessionCookies(
      reply,
      issued.sessionToken,
      issued.csrfToken,
      maxAge,
    );
    return this.authService.toResponse(issued.context);
  }

  @Post('smoke-session')
  @PublicRoute()
  @Throttle({
    bucket: 'auth.smoke_session',
    // The complete role-based smoke suite bootstraps more than ten sessions
    // while retaining a finite abuse-control window.
    limit: 100,
    windowMs: 15 * 60 * 1000,
  })
  @Version('1')
  @HttpCode(200)
  @ApiHeader({ name: 'x-smoke-session-bootstrap-secret', required: true })
  @ApiHeader({ name: 'x-device-id', required: false })
  @ApiHeader({ name: 'x-device-attestation', required: false })
  @apiSuccessEnvelopeResponse({
    description: 'Smoke session created',
    dataSchema: authResponseSchema(),
  })
  @ApiOperation({ summary: 'Create a secret-gated smoke test session' })
  async smokeSession(
    @Body() dto: SmokeSessionBootstrapDto,
    @Headers('x-smoke-session-bootstrap-secret')
    bootstrapSecret: string | undefined,
    @Headers('x-device-id') deviceId: string | undefined,
    @Headers('x-device-attestation') deviceAttestation: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const issued = await this.authService.bootstrapSmokeSession(
      bootstrapSecret,
      dto.role,
      dto.userId,
      dto.tenantId,
      deviceId,
      deviceAttestation,
    );
    const maxAge = Math.max(
      0,
      Math.floor(
        (issued.context.session.expiresAt.getTime() - Date.now()) / 1000,
      ),
    );

    this.setSessionCookies(
      reply,
      issued.sessionToken,
      issued.csrfToken,
      maxAge,
    );

    return this.authService.toResponse(issued.context);
  }

  @Post('dev/cashier-test-session')
  @PublicRoute()
  @Throttle({
    bucket: 'auth.dev_cashier_test_session',
    limit: 3,
    windowMs: 15 * 60 * 1000,
  })
  @Version('1')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async localCashierTestSession(
    @Body() dto: LocalCashierTestSessionDto,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const issued = await this.authService.createLocalCashierTestSession(
      dto.username,
      origin,
    );
    const maxAge = Math.max(
      0,
      Math.floor(
        (issued.context.session.expiresAt.getTime() - Date.now()) / 1000,
      ),
    );

    this.setSessionCookies(
      reply,
      issued.sessionToken,
      issued.csrfToken,
      maxAge,
      origin?.startsWith('https://') === true,
    );

    return this.authService.toResponse(issued.context);
  }

  @Post('refresh')
  @Version('1')
  @HttpCode(200)
  @apiSuccessEnvelopeResponse({
    description: 'Session rotated',
    dataSchema: authResponseSchema(),
  })
  @ApiOperation({ summary: 'Rotate authenticated session' })
  async refresh(
    @CurrentSession() context: AuthContext,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const issued = await this.authService.refresh(context.session.id);
    const maxAge = Math.max(
      0,
      Math.floor(
        (issued.context.session.expiresAt.getTime() - Date.now()) / 1000,
      ),
    );

    this.setSessionCookies(
      reply,
      issued.sessionToken,
      issued.csrfToken,
      maxAge,
    );

    return this.authService.toResponse(issued.context);
  }

  @Post('logout')
  @Version('1')
  @HttpCode(200)
  @apiSuccessEnvelopeResponse({ description: 'Session revoked' })
  @ApiOperation({ summary: 'End authenticated session' })
  async logout(
    @CurrentSession() context: AuthContext,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.authService.logout(context.session.id);
    reply.header('Set-Cookie', [
      clearCookie(SESSION_COOKIE_NAME, process.env.NODE_ENV === 'production'),
      clearCookie(CSRF_COOKIE_NAME, process.env.NODE_ENV === 'production'),
    ]);
    return { status: 'ok' };
  }

  @Get('me')
  @Version('1')
  @apiSuccessEnvelopeResponse({
    description: 'Current user and session',
    dataSchema: authResponseSchema(),
  })
  @ApiOperation({ summary: 'Read current authenticated user' })
  me(@CurrentSession() context: AuthContext) {
    return this.authService.toResponse(context);
  }

  private setSessionCookies(
    reply: FastifyReply,
    sessionToken: string,
    csrfToken: string,
    maxAge: number,
    secure = process.env.NODE_ENV === 'production',
  ): void {
    reply.header('Set-Cookie', [
      buildCookie(SESSION_COOKIE_NAME, sessionToken, maxAge, secure),
      buildCsrfCookie(CSRF_COOKIE_NAME, csrfToken, maxAge, secure),
    ]);
  }
}
