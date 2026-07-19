import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { BranchesService } from './branches.service';
import {
  CreateBranchDto,
  CreateDeviceDto,
  UpdateBranchDto,
  UpdateDeviceDto,
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
    return this.branchesService.listDevices(request.authContext!.user.tenantId);
  }

  @Post('devices')
  @Version('1')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({ description: 'Device created', status: 201 })
  createDevice(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateDeviceDto,
  ) {
    return this.branchesService.createDevice(
      request.authContext!.user.tenantId,
      request.authContext!,
      dto,
    );
  }

  @Patch('devices/:id')
  @Version('1')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  updateDevice(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.branchesService.updateDevice(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto,
    );
  }
}
