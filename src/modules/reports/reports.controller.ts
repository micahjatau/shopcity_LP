import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  Version,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { CurrentSession } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthContext } from '../../common/auth/session.types';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { Throttle } from '../../common/throttle/throttle.decorator';
import {
  ReportExportService,
  type ReportExportName,
} from './report-export.service';
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
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportExportService: ReportExportService,
  ) {}

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

  @Get(':report/export')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @Throttle({
    bucket: 'reports.export',
    limit: 10,
    windowMs: 60_000,
    keyFactory: (request) => [
      request.authContext?.user.id ?? request.ip ?? 'unknown',
      String((request.params as { report?: string }).report ?? 'unknown'),
    ],
  })
  @ApiParam({
    name: 'report',
    enum: [
      'executive-summary',
      'liability-ageing',
      'customer-performance',
      'materialization-state',
    ],
  })
  @ApiQuery({
    name: 'format',
    required: false,
    schema: { type: 'string', enum: ['csv'] },
  })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @ApiOkResponse({
    description: 'CSV export',
    content: {
      'text/csv': {
        schema: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Export a report as CSV' })
  async exportReport(
    @CurrentSession() context: AuthContext,
    @Param('report') report: ReportExportName,
    @Query('format') format?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('timezone') timezone?: string,
    @Res({ passthrough: true }) reply?: FastifyReply,
  ) {
    const result = await this.reportExportService.exportCsv(
      context.user.tenantId,
      context,
      report,
      {
        format,
        branchId,
        from,
        to,
        timezone,
      },
    );

    reply?.type('text/csv; charset=utf-8');
    reply?.header(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );

    return result.csv;
  }

  @Post(':report/refresh')
  @Version('1')
  @HttpCode(202)
  @Roles(UserRole.ADMIN)
  @ApiParam({
    name: 'report',
    enum: [
      'executive-summary',
      'liability-ageing',
      'customer-performance',
      'materialization-state',
    ],
  })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiAcceptedResponse({ description: 'Report refresh scheduled' })
  @ApiOperation({ summary: 'Schedule report refresh' })
  async refreshReport(
    @CurrentSession() context: AuthContext,
    @Param('report') report: ReportExportName,
    @Query('branchId') branchId?: string,
    @Query('timezone') timezone?: string,
  ) {
    await this.reportExportService.refreshReport(
      context.user.tenantId,
      context,
      report,
      {
        branchId,
        timezone,
      },
    );
    return { status: 'accepted' };
  }
}
