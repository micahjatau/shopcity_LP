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
  updateRole(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.role,
    );
  }

  @Patch(':id/status')
  @Version('1')
  @Roles(UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.status,
    );
  }
}
