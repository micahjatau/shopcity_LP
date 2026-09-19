import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './users.dto';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@apiErrorEnvelopeResponses()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'User list',
    dataSchema: { type: 'array', items: { type: 'object' } },
  })
  listUsers(@Req() request: AuthenticatedRequest) {
    return this.usersService.listUsers(request.authContext!.user.tenantId);
  }

  @Get('cashiers')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Authorized cashier directory',
    dataSchema: { type: 'array', items: { type: 'object' } },
  })
  listCashiers(
    @Req() request: AuthenticatedRequest,
    @Query('q') query?: string,
  ) {
    return this.usersService.listCashiers(
      request.authContext!.user.tenantId,
      request.authContext!,
      query,
    );
  }

  @Post()
  @Version('1')
  @Roles(UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ description: 'User created', status: 201 })
  @ApiOperation({ summary: 'Create staff user' })
  createUser(@Req() request: AuthenticatedRequest, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(
      request.authContext!.user.tenantId,
      request.authContext!,
      dto,
    );
  }

  @Patch(':id/role')
  @Version('1')
  @Roles(UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  updateRole(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.usersService.updateRole(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.role,
      idempotencyKey,
    );
  }

  @Patch(':id/status')
  @Version('1')
  @Roles(UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.usersService.updateStatus(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.status,
      idempotencyKey,
    );
  }
}
