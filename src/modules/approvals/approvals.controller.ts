import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentSession } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthContext } from '../../common/auth/session.types';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { parseCursorPageRequest } from '../../common/pagination/cursor-pagination';
import { ApprovalDecisionDto } from '../loyalty/loyalty.dto';
import { ApprovalsService } from './approvals.service';

const approvalListResponseSchema = {
  type: 'object',
  required: ['items', 'nextCursor', 'hasMore'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'id',
          'receiptId',
          'redemptionId',
          'targetType',
          'status',
          'requestedAt',
          'expiresAt',
          'decidedAt',
          'executedAt',
          'receipt',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          receiptId: { type: 'string', format: 'uuid' },
          redemptionId: { type: 'string', format: 'uuid', nullable: true },
          targetType: { type: 'string', enum: ['EARN', 'REDEEM'] },
          status: { type: 'string', example: 'PENDING' },
          reasonCode: { type: 'string', nullable: true },
          requestedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          decidedAt: { type: 'string', format: 'date-time', nullable: true },
          executedAt: { type: 'string', format: 'date-time', nullable: true },
          receipt: {
            type: 'object',
            required: [
              'id',
              'posReceiptNumber',
              'purchaseAmountKobo',
              'captureStatus',
              'reviewStatus',
            ],
            properties: {
              id: { type: 'string', format: 'uuid' },
              posReceiptNumber: { type: 'string' },
              purchaseAmountKobo: { type: 'integer' },
              captureStatus: { type: 'string' },
              reviewStatus: { type: 'string' },
            },
          },
        },
      },
    },
    nextCursor: { type: 'string', nullable: true },
    hasMore: { type: 'boolean' },
  },
} as const;

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('approvals')
@apiErrorEnvelopeResponses()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Pending approvals',
    dataSchema: approvalListResponseSchema,
  })
  @ApiOperation({ summary: 'List approvals' })
  listApprovals(
    @CurrentSession() context: AuthContext,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.approvalsService.listApprovals(
      context.user.tenantId,
      parseCursorPageRequest(limit, cursor),
    );
  }

  @Post(':id/decision')
  @Version('1')
  @HttpCode(200)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Approval decision recorded',
    dataSchema: {
      type: 'object',
      required: ['id', 'status', 'receiptId', 'decidedAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', example: 'EXECUTED' },
        receiptId: { type: 'string', format: 'uuid' },
        redemptionId: { type: 'string', format: 'uuid', nullable: true },
        ledgerEntryId: { type: 'string', format: 'uuid', nullable: true },
        creditKobo: { type: 'integer', nullable: true },
        redeemedAmountKobo: { type: 'integer', nullable: true },
        reason: { type: 'string', nullable: true },
        decidedAt: { type: 'string', format: 'date-time' },
        executedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @apiErrorEnvelopeResponses({
    unprocessableEntity: {
      approvalPolicyChanged: {
        statusCode: 422,
        code: 'APPROVAL_POLICY_CHANGED',
        message: 'Approval policy changed after the request was captured',
      },
    },
  })
  @ApiOperation({ summary: 'Decide approval' })
  decideApproval(
    @CurrentSession() context: AuthContext,
    @Param('id') approvalId: string,
    @Body() dto: ApprovalDecisionDto,
  ) {
    return this.approvalsService.decideApproval(
      context.user.tenantId,
      context,
      approvalId,
      dto.decision,
      dto.reason,
    );
  }
}
