import { Controller, Get, Query, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentSession } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthContext } from '../../common/auth/session.types';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { ReportsService } from './reports.service';

const reportCollectionSchema = {
  type: 'object',
  required: ['scope', 'scopeKey', 'branchId', 'timezone', 'items'],
  properties: {
    scope: { type: 'string', enum: ['TENANT', 'BRANCH'] },
    scopeKey: { type: 'string' },
    branchId: { type: 'string', nullable: true },
    timezone: { type: 'string' },
    items: { type: 'array', items: { type: 'object' } },
  },
} as const;

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@apiErrorEnvelopeResponses()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('executive-summary')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @apiSuccessEnvelopeResponse({
    description: 'Executive summary rows',
    dataSchema: reportCollectionSchema,
  })
  @ApiOperation({ summary: 'List executive summary report rows' })
  listExecutiveSummary(
    @CurrentSession() context: AuthContext,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.reportsService.listExecutiveSummary(
      context.user.tenantId,
      context,
      {
        branchId,
        from,
        to,
        timezone,
      },
    );
  }

  @Get('liability-ageing')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @apiSuccessEnvelopeResponse({
    description: 'Liability ageing rows',
    dataSchema: reportCollectionSchema,
  })
  @ApiOperation({ summary: 'List liability ageing report rows' })
  listLiabilityAgeing(
    @CurrentSession() context: AuthContext,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.reportsService.listLiabilityAgeing(
      context.user.tenantId,
      context,
      {
        branchId,
        from,
        to,
        timezone,
      },
    );
  }

  @Get('customer-performance')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @apiSuccessEnvelopeResponse({
    description: 'Customer performance rows',
    dataSchema: reportCollectionSchema,
  })
  @ApiOperation({ summary: 'List customer performance report rows' })
  listCustomerPerformance(
    @CurrentSession() context: AuthContext,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.reportsService.listCustomerPerformance(
      context.user.tenantId,
      context,
      {
        branchId,
        from,
        to,
        timezone,
      },
    );
  }

  @Get('materialization-state')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @apiSuccessEnvelopeResponse({
    description: 'Materialization state rows',
    dataSchema: reportCollectionSchema,
  })
  @ApiOperation({ summary: 'List report materialization state rows' })
  listMaterializationState(
    @CurrentSession() context: AuthContext,
    @Query('branchId') branchId?: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.reportsService.listMaterializationState(
      context.user.tenantId,
      context,
      {
        branchId,
        timezone,
      },
    );
  }
}
