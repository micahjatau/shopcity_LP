import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FraudSeverity, UserRole } from '@prisma/client';
import { CurrentSession } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthContext } from '../../common/auth/session.types';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { parseCursorPageRequest } from '../../common/pagination/cursor-pagination';
import { FraudFlagDecisionDto } from './fraud.dto';
import {
  FraudReviewService,
  type FraudFlagListItem,
  type FraudListResult,
} from './fraud-review.service';

const fraudFlagListSchema = {
  type: 'object',
  required: ['scope', 'scopeKey', 'branchId', 'items', 'nextCursor', 'hasMore'],
  properties: {
    scope: { type: 'string', enum: ['TENANT', 'BRANCH'] },
    scopeKey: { type: 'string' },
    branchId: { type: 'string', nullable: true },
    items: { type: 'array', items: { type: 'object' } },
    nextCursor: { type: 'string', nullable: true },
    hasMore: { type: 'boolean' },
  },
} as const;

@ApiTags('fraud')
@ApiBearerAuth()
@Controller('fraud-flags')
@apiErrorEnvelopeResponses()
export class FraudController {
  constructor(private readonly fraudReviewService: FraudReviewService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'ruleCode', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @apiSuccessEnvelopeResponse({
    description: 'Fraud flag list',
    dataSchema: fraudFlagListSchema,
  })
  @ApiOperation({ summary: 'List fraud flags' })
  listFraudFlags(
    @CurrentSession() context: AuthContext,
    @Query('status') status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED',
    @Query('severity') severity?: FraudSeverity,
    @Query('ruleCode') ruleCode?: string,
    @Query('branchId') branchId?: string,
    @Query('actorId') actorId?: string,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<FraudListResult<FraudFlagListItem>> {
    return this.fraudReviewService.listFraudFlags(
      context.user.tenantId,
      context,
      {
        status,
        severity,
        ruleCode,
        branchId,
        actorId,
        customerId,
        from,
        to,
      },
      parseCursorPageRequest(limit, cursor, 50, 100),
    );
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiParam({ name: 'id' })
  @apiSuccessEnvelopeResponse({
    description: 'Fraud flag detail',
    dataSchema: { type: 'object' },
  })
  @ApiOperation({ summary: 'Read a fraud flag' })
  getFraudFlag(
    @CurrentSession() context: AuthContext,
    @Param('id') id: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.fraudReviewService.getFraudFlag(
      context.user.tenantId,
      context,
      id,
      branchId,
    );
  }

  @Post(':id/decision')
  @Version('1')
  @HttpCode(200)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiParam({ name: 'id' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Fraud decision recorded',
    dataSchema: { type: 'object' },
  })
  @ApiOperation({ summary: 'Record a fraud decision' })
  decideFraudFlag(
    @CurrentSession() context: AuthContext,
    @Param('id') id: string,
    @Body() dto: FraudFlagDecisionDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.fraudReviewService.decideFraudFlag(
      context.user.tenantId,
      context,
      id,
      dto.decision,
      dto.reason,
      idempotencyKey,
    );
  }
}
