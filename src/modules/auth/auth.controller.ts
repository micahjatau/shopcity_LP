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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { LoginDto, authResponseSchema } from './auth.dto';
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
@apiErrorEnvelopeResponses()
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
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const issued = await this.authService.login(
      dto.username,
      dto.password,
      deviceId,
    );
    const maxAge = Math.max(
      0,
      Math.floor(
        (issued.context.session.expiresAt.getTime() - Date.now()) / 1000,
      ),
    );

    reply.header('Set-Cookie', [
      buildCookie(
        SESSION_COOKIE_NAME,
        issued.sessionToken,
        maxAge,
        process.env.NODE_ENV === 'production',
      ),
      buildCsrfCookie(
        CSRF_COOKIE_NAME,
        issued.csrfToken,
        maxAge,
        process.env.NODE_ENV === 'production',
      ),
    ]);

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

    reply.header('Set-Cookie', [
      buildCookie(
        SESSION_COOKIE_NAME,
        issued.sessionToken,
        maxAge,
        process.env.NODE_ENV === 'production',
      ),
      buildCsrfCookie(
        CSRF_COOKIE_NAME,
        issued.csrfToken,
        maxAge,
        process.env.NODE_ENV === 'production',
      ),
    ]);

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
}
