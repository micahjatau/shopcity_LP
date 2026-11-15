import { Controller, Get, Query, Req, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { AdminTransactionSearchService } from './admin-transaction-search.service';

const adminTransactionSearchSchema = {
  type: 'object',
  required: ['items', 'staffOptions', 'nextCursor', 'hasMore'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'transactionId',
          'receiptNumber',
          'operation',
          'amountKobo',
          'creditKobo',
          'customerName',
          'purchaseAmountKobo',
          'status',
          'occurredAt',
        ],
        properties: {
          transactionId: { type: 'string', format: 'uuid' },
          receiptNumber: { type: 'string' },
          operation: { type: 'string', enum: ['EARN', 'REDEEM'] },
          amountKobo: { type: 'integer' },
          creditKobo: { type: 'integer', nullable: true },
          customerName: { type: 'string', nullable: true },
          purchaseAmountKobo: { type: 'integer', nullable: true },
          status: { type: 'string', enum: ['CONFIRMED', 'REVERSED'] },
          occurredAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    staffOptions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          label: { type: 'string' },
        },
      },
    },
    nextCursor: { type: 'string', nullable: true },
    hasMore: { type: 'boolean' },
  },
} as const;

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('admin/transactions')
@apiErrorEnvelopeResponses()
export class AdminTransactionsController {
  constructor(
    private readonly adminTransactionSearchService: AdminTransactionSearchService,
  ) {}

  @Get()
  @Version('1')
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'receiptNumber', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['CONFIRMED', 'REVERSED'],
  })
  @ApiQuery({ name: 'branchId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'staffId', required: false, type: String })
  @ApiQuery({
    name: 'minReceiptAmountKobo',
    required: false,
    schema: { type: 'string', pattern: '^[0-9]{1,19}$' },
    description: 'Minimum receipt purchase amount in integer kobo',
  })
  @apiSuccessEnvelopeResponse({
    description: 'Tenant-scoped Admin transaction search results',
    dataSchema: adminTransactionSearchSchema,
  })
  @ApiOperation({ summary: 'List and filter tenant transactions for Admin' })
  searchTransactions(
    @Req() request: AuthenticatedRequest,
    @Query('receiptNumber') receiptNumber?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('staffId') staffId?: string,
    @Query('minReceiptAmountKobo') minReceiptAmountKobo?: string,
  ) {
    return this.adminTransactionSearchService.searchTransactions(
      request.authContext!.user.tenantId,
      request.authContext!,
      receiptNumber,
      limit,
      cursor,
      { branchId, status, staffId, minReceiptAmountKobo },
    );
  }
}
