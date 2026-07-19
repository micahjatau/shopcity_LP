import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from './customers.dto';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
@apiErrorEnvelopeResponses()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    dataSchema: { type: 'array', items: { type: 'object' } },
  })
  listCustomers(
    @Req() request: AuthenticatedRequest,
    @Query('q') query?: string,
  ) {
    return this.customersService.listCustomers(
      request.authContext!.user.tenantId,
      query,
    );
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ description: 'Customer created', status: 201 })
  @ApiOperation({ summary: 'Register customer' })
  createCustomer(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.createCustomer(
      request.authContext!.user.tenantId,
      request.authContext!,
      dto,
    );
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  getCustomer(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.customersService.getCustomer(
      request.authContext!.user.tenantId,
      id,
    );
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  updateCustomer(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerStatusDto,
  ) {
    return this.customersService.updateCustomerStatus(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.status,
    );
  }
}
