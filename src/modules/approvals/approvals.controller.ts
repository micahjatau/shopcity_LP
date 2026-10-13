import {
  BadRequestException,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApprovalStatus, UserRole } from '@prisma/client';
import {
  APPROVAL_CATEGORY,
  type ApprovalCategory,
} from '../loyalty/approval-category';
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

type ApprovalStatusFilter =
  'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

function parseApprovalStatusFilter(
  status?: string,
): ApprovalStatus[] | undefined {
  if (!status || status === 'ALL') return undefined;
  switch (status as ApprovalStatusFilter) {
    case 'PENDING':
      return [ApprovalStatus.PENDING];
    case 'APPROVED':
      return [ApprovalStatus.APPROVED, ApprovalStatus.EXECUTED];
    case 'REJECTED':
      return [ApprovalStatus.REJECTED];
    case 'EXPIRED':
      return [ApprovalStatus.EXPIRED];
    default:
      throw new BadRequestException('Invalid approval status filter');
  }
}

function parseIncludeTotalCount(value?: string): boolean {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  throw new BadRequestException('includeTotalCount must be true or false');
}

function parseApprovalCategoryFilter(
  value?: string,
): ApprovalCategory | undefined {
  if (value === undefined) return undefined;
  if (Object.values(APPROVAL_CATEGORY).includes(value as ApprovalCategory)) {
    return value as ApprovalCategory;
  }
  throw new BadRequestException('Invalid approval category filter');
}

function parseApprovalSearch(value: unknown): string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    throw new BadRequestException('search must be a string');
  }
  const search = value?.trim();
  if (!search) return undefined;
  if (search.length > 100) {
    throw new BadRequestException('search must not exceed 100 characters');
  }
  return search;
}

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
          'category',
          'status',
          'requestedAmountKobo',
          'requestedAt',
          'expiresAt',
          'decidedAt',
          'executedAt',
          'customer',
          'receipt',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          receiptId: { type: 'string', format: 'uuid', nullable: true },
          redemptionId: { type: 'string', format: 'uuid', nullable: true },
          targetType: { type: 'string', enum: ['EARN', 'REDEEM'] },
          category: {
            type: 'string',
            enum: Object.values(APPROVAL_CATEGORY),
            nullable: true,
          },
          status: { type: 'string', example: 'PENDING' },
          reasonCode: { type: 'string', nullable: true },
          requestedAmountKobo: { type: 'integer', nullable: true },
          requestedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          decidedAt: { type: 'string', format: 'date-time', nullable: true },
          executedAt: { type: 'string', format: 'date-time', nullable: true },
          customer: {
            type: 'object',
            required: ['id', 'branchId'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              branchId: { type: 'string', format: 'uuid', nullable: true },
              fullName: { type: 'string', nullable: true },
            },
          },
          requester: {
            type: 'object',
            nullable: true,
            properties: {
              username: { type: 'string' },
              role: { type: 'string' },
            },
          },
          receipt: {
            type: 'object',
            nullable: true,
            required: [
              'id',
              'customerId',
              'posReceiptNumber',
              'purchaseAmountKobo',
              'occurredAt',
              'captureStatus',
              'reviewStatus',
              'branchId',
            ],
            properties: {
              id: { type: 'string', format: 'uuid' },
              customerId: { type: 'string', format: 'uuid', nullable: true },
              posReceiptNumber: { type: 'string' },
              purchaseAmountKobo: { type: 'integer' },
              occurredAt: { type: 'string', format: 'date-time' },
              captureStatus: { type: 'string' },
              reviewStatus: { type: 'string' },
              branchId: { type: 'string', format: 'uuid', nullable: true },
            },
          },
        },
      },
    },
    nextCursor: { type: 'string', nullable: true },
    hasMore: { type: 'boolean' },
    totalCount: {
      type: 'integer',
      minimum: 0,
      description: 'Exact count after applying the search and status filters.',
    },
    scopeTotalCount: {
      type: 'integer',
      minimum: 0,
      description:
        'Exact selected-category count within caller scope and status filter, before text search.',
    },
    categoryCounts: {
      type: 'object',
      required: Object.values(APPROVAL_CATEGORY),
      properties: {
        [APPROVAL_CATEGORY.HIGH_VALUE_TRANSACTION]: {
          type: 'integer',
          minimum: 0,
        },
        [APPROVAL_CATEGORY.LATE_RECEIPT_CLAIM]: {
          type: 'integer',
          minimum: 0,
        },
      },
      description:
        'Exact per-category counts under caller scope, status, and search, independent of cursor and selected category.',
    },
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
    description:
      'Cursor-paginated approvals with typed categories and exact scoped category counts',
    dataSchema: approvalListResponseSchema,
  })
  @ApiOperation({ summary: 'List approvals' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
    description:
      'Filter before cursor pagination; APPROVED includes executed approvals.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: Object.values(APPROVAL_CATEGORY),
    description:
      'Filter by category before cursor pagination. Category counts, when requested, remain independent of this filter.',
  })
  @ApiQuery({
    name: 'includeTotalCount',
    required: false,
    type: Boolean,
    description:
      'When true, include exact selected-category and pre-search scope totals plus per-category counts; all counts are independent of cursor pagination.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    schema: { type: 'string', maxLength: 100 },
    description:
      'Search approval fields within the caller’s authorized scope before cursor pagination; any status filter is applied as well.',
  })
  listApprovals(
    @CurrentSession() context: AuthContext,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
    @Query('includeTotalCount') includeTotalCount?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.approvalsService.listApprovals(
      context.user.tenantId,
      context,
      parseCursorPageRequest(limit, cursor),
      parseApprovalStatusFilter(status),
      parseIncludeTotalCount(includeTotalCount),
      parseApprovalSearch(search),
      parseApprovalCategoryFilter(category),
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
        netPaidAmountKobo: { type: 'integer', nullable: true },
        earnedKobo: { type: 'integer', nullable: true },
        earnTransactionId: { type: 'string', format: 'uuid', nullable: true },
        remainingBalanceKobo: { type: 'integer', nullable: true },
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
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  decideApproval(
    @CurrentSession() context: AuthContext,
    @Param('id') approvalId: string,
    @Body() dto: ApprovalDecisionDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.approvalsService.decideApproval(
      context.user.tenantId,
      context,
      approvalId,
      dto.decision,
      dto.reason,
      idempotencyKey,
    );
  }
}
