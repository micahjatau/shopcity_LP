import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
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
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { PublicRoute } from '../../common/auth/public-route.decorator';
import { BranchesService } from './branches.service';
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
  @PublicRoute()
  @apiSuccessEnvelopeResponse({ description: 'Device credential activated' })
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
  updateDevice(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.branchesService.updateDevice(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto,
      idempotencyKey,
    );
  }
}
