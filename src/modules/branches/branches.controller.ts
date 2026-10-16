import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  Version,
  Headers,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { PublicRoute } from '../../common/auth/public-route.decorator';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { BranchesService } from './branches.service';
import {
  buildPosDeviceTokenCookie,
  clearPosDeviceTokenCookie,
} from '../../common/auth/cookie';
import { DEVICE_TOKEN_COOKIE_NAME } from '../../common/auth/device-token';
import {
  CreateBranchDto,
  CreateDeviceDto,
  UpdateBranchDto,
  UpdateDeviceDto,
  CompleteDeviceEnrollmentDto,
} from './branches.dto';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';

function readPosDeviceTokenCookie(
  request: AuthenticatedRequest,
): string | undefined {
  const values = (request.headers.cookie ?? '')
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(`${DEVICE_TOKEN_COOKIE_NAME}=`))
    .map((entry) => entry.slice(DEVICE_TOKEN_COOKIE_NAME.length + 1));
  if (values.length !== 1) return undefined;
  try {
    const token = decodeURIComponent(values[0]);
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
  } catch {
    return undefined;
  }
}

function buildDeviceEnrollmentCompletionThrottleKey(
  request: AuthenticatedRequest,
): string[] {
  const params = request.params;
  const deviceId =
    typeof params === 'object' &&
    params !== null &&
    'id' in params &&
    typeof params.id === 'string'
      ? params.id
      : 'unknown-device';
  const ip = request.ip || 'unknown';
  return [
    `device-enrollment-complete:ip:${ip}`,
    `device-enrollment-complete:device:${deviceId}`,
  ];
}

@ApiTags('branches')
@ApiBearerAuth()
@Controller()
@apiErrorEnvelopeResponses()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get('branches')
  @Version('1')
  @Roles(UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Branch list',
    dataSchema: { type: 'array', items: { type: 'object' } },
  })
  @ApiOperation({ summary: 'List branches' })
  listBranches(@Req() request: AuthenticatedRequest) {
    return this.branchesService.listBranches(
      request.authContext!.user.tenantId,
    );
  }

  @Post('branches')
  @Version('1')
  @Roles(UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ description: 'Branch created', status: 201 })
  createBranch(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchesService.createBranch(
      request.authContext!.user.tenantId,
      request.authContext!,
      dto,
    );
  }

  @Patch('branches/:id')
  @Version('1')
  @Roles(UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  updateBranch(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.updateBranch(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto,
    );
  }

  @Get('devices')
  @Version('1')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({
    dataSchema: { type: 'array', items: { type: 'object' } },
  })
  listDevices(@Req() request: AuthenticatedRequest) {
    return this.branchesService.listDevices(
      request.authContext!.user.tenantId,
      request.authContext!,
    );
  }

  @Post('devices/:id/token/pair')
  @Version('1')
  @HttpCode(200)
  @ApiHeader({ name: 'origin', required: true })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({ description: 'POS browser paired' })
  @ApiOperation({ summary: 'Pair this authorized browser to a POS device' })
  async pairDeviceToken(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.branchesService.assertDeviceTokenBrowserOrigin(origin);
    const paired = await this.branchesService.pairDeviceToken(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
    );
    reply.header('Set-Cookie', buildPosDeviceTokenCookie(paired.token));
    return { status: 'paired', pairedAt: paired.pairedAt };
  }

  @Post('devices/:id/token/reset')
  @Version('1')
  @HttpCode(200)
  @ApiHeader({ name: 'origin', required: true })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({ description: 'POS device token reset' })
  @ApiOperation({ summary: 'Reset and unpair a POS browser credential' })
  async resetDeviceToken(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.branchesService.assertDeviceTokenBrowserOrigin(origin);
    const clearDeviceTokenCookie = await this.branchesService.resetDeviceToken(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      readPosDeviceTokenCookie(request),
    );
    if (clearDeviceTokenCookie) {
      reply.header('Set-Cookie', clearPosDeviceTokenCookie());
    }
    return { status: 'reset' };
  }

  @Post('devices')
  @Version('1')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({ description: 'Device created', status: 201 })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createDevice(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateDeviceDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.branchesService.createDevice(
      request.authContext!.user.tenantId,
      request.authContext!,
      dto,
      idempotencyKey,
    );
  }

  @Post('devices/:id/enrollment')
  @Version('1')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({
    description: 'Short-lived device enrollment options',
    status: 201,
  })
  @ApiOperation({
    summary:
      'Create one-time device pairing authorization and registration options',
  })
  createDeviceEnrollment(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.branchesService.createDeviceEnrollment(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
    );
  }

  @Post('devices/:id/enrollment/complete')
  @Version('1')
  @HttpCode(200)
  @PublicRoute()
  @Throttle({
    bucket: 'device.enrollment.complete',
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyFactory: buildDeviceEnrollmentCompletionThrottleKey,
  })
  @apiSuccessEnvelopeResponse({ description: 'Device credential activated' })
  @apiErrorEnvelopeResponses({
    badRequest: {
      deviceEnrollmentInvalid: {
        statusCode: 400,
        code: 'DEVICE_ENROLLMENT_INVALID',
        message: 'Device enrollment is invalid',
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
  @ApiOperation({
    summary: 'Complete target-device WebAuthn enrollment',
    security: [],
  })
  @ApiBody({ type: CompleteDeviceEnrollmentDto })
  completeDeviceEnrollment(@Param('id') id: string, @Body() body: unknown) {
    const payload =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {};
    return this.branchesService.completeDeviceEnrollment(
      id,
      payload.authorizationToken,
      payload.response,
    );
  }

  @Get('devices/:id/credentials')
  @Version('1')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({
    dataSchema: { type: 'array', items: { type: 'object' } },
  })
  listDeviceCredentials(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.branchesService.listDeviceCredentials(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
    );
  }

  @Post('devices/:id/credentials/:credentialId/revoke')
  @Version('1')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({ description: 'Credential revoked' })
  revokeDeviceCredential(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('credentialId') credentialId: string,
  ) {
    return this.branchesService.revokeDeviceCredential(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      credentialId,
    );
  }

  @Patch('devices/:id')
  @Version('1')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async updateDevice(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const updated = await this.branchesService.updateDevice(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto,
      idempotencyKey,
      readPosDeviceTokenCookie(request),
    );
    const updateResult = updated as typeof updated & {
      clearDeviceTokenCookie?: boolean;
    };
    const { clearDeviceTokenCookie, ...safeUpdated } = updateResult;
    if (clearDeviceTokenCookie) {
      reply.header('Set-Cookie', clearPosDeviceTokenCookie());
    }
    return safeUpdated;
  }
}
