import {
  Body,
  Controller,
  Headers,
  Get,
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
import { parseCursorPageRequest } from '../../common/pagination/cursor-pagination';

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
    dataSchema: {
      type: 'object',
      required: ['items', 'nextCursor', 'hasMore'],
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        nextCursor: { type: 'string', nullable: true },
        hasMore: { type: 'boolean' },
      },
    },
  })
  listCustomers(
    @Req() request: AuthenticatedRequest,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.customersService.listCustomers(
      request.authContext!.user.tenantId,
      request.authContext!,
      query,
      parseCursorPageRequest(limit, cursor),
    );
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ description: 'Customer created', status: 201 })
  @ApiOperation({ summary: 'Register customer' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createCustomer(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCustomerDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.customersService.createCustomer(
      request.authContext!.user.tenantId,
      request.authContext!,
      dto,
      idempotencyKey,
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
      request.authContext!,
    );
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  updateCustomer(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.customersService.updateCustomer(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto,
      idempotencyKey,
    );
  }

  @Patch(':id/status')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerStatusDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.customersService.updateCustomerStatus(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.status,
      idempotencyKey,
    );
  }
}
