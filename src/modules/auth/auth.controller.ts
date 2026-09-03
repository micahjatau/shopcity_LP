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
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import {
  LoginDto,
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
import {
  clearCookie,
  buildCookie,
  buildCsrfCookie,
} from '../../common/auth/cookie';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';

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
  @Version('1')
  @HttpCode(200)
  @apiSuccessEnvelopeResponse({
    description: 'Authenticated session created',
    dataSchema: authResponseSchema(),
  })
  @ApiOperation({ summary: 'Create authenticated session' })
  async login(
    @Body() dto: LoginDto,
    @Headers('x-device-id') deviceId: string | undefined,
    @Headers('x-device-attestation') deviceAttestation: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const issued = await this.authService.login(
      dto.username,
      dto.password,
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

  @Post('smoke-session')
  @PublicRoute()
  @Throttle({
    bucket: 'auth.smoke_session',
    limit: 10,
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
  ): void {
    reply.header('Set-Cookie', [
      buildCookie(
        SESSION_COOKIE_NAME,
        sessionToken,
        maxAge,
        process.env.NODE_ENV === 'production',
      ),
      buildCsrfCookie(
        CSRF_COOKIE_NAME,
        csrfToken,
        maxAge,
        process.env.NODE_ENV === 'production',
      ),
    ]);
  }
}
