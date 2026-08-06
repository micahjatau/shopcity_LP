import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildEarnThrottleKey } from '../../common/throttle/throttle.keys';
import { parseCursorPageRequest } from '../../common/pagination/cursor-pagination';
import { EarnTransactionDto } from './loyalty.dto';
import { LoyaltyService } from './loyalty.service';

const ledgerCreditLotSchema = {
  type: 'object',
  nullable: true,
  required: [
    'id',
    'originalAmountKobo',
    'remainingAmountKobo',
    'earnedAt',
    'expiresAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    originalAmountKobo: { type: 'integer' },
    remainingAmountKobo: { type: 'integer' },
    earnedAt: { type: 'string', format: 'date-time' },
    expiresAt: { type: 'string', format: 'date-time' },
  },
} as const;

const transactionLedgerItemSchema = {
  type: 'object',
  required: [
    'id',
    'receiptId',
    'type',
    'direction',
    'amountKobo',
    'status',
    'effectiveAt',
    'smsStatus',
    'creditLot',
    'restorations',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    receiptId: { type: 'string', format: 'uuid', nullable: true },
    redemptionId: { type: 'string', format: 'uuid', nullable: true },
    type: { type: 'string', enum: ['EARN', 'REDEEM', 'REVERSAL', 'ADJUSTMENT'] },
    direction: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
    amountKobo: { type: 'integer' },
    status: { type: 'string', example: 'CONFIRMED' },
    effectiveAt: { type: 'string', format: 'date-time' },
    smsStatus: { type: 'string', nullable: true },
    allocations: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'id',
          'creditLotId',
          'amountKobo',
          'allocationOrder',
          'expiresAt',
          'restorations',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          creditLotId: { type: 'string', format: 'uuid' },
          amountKobo: { type: 'integer' },
          allocationOrder: { type: 'integer' },
          expiresAt: { type: 'string', format: 'date-time' },
          restorations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'amountKobo', 'reversalLedgerEntryId'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                amountKobo: { type: 'integer' },
                reversalLedgerEntryId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
    },
    creditLot: ledgerCreditLotSchema,
    restorations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'allocationId', 'creditLotId', 'amountKobo', 'reversalLedgerEntryId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          allocationId: { type: 'string', format: 'uuid' },
          creditLotId: { type: 'string', format: 'uuid' },
          amountKobo: { type: 'integer' },
          reversalLedgerEntryId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
} as const;

const transactionResponseSchema = {
  type: 'object',
  required: [
    'id',
    'transactionId',
    'type',
    'direction',
    'tenantId',
    'branchId',
    'customerId',
    'deviceId',
    'cardSerialNumber',
    'posReceiptNumber',
    'purchaseAmountKobo',
    'occurredAt',
    'capturedAt',
    'state',
    'captureStatus',
    'reviewStatus',
    'approvalId',
    'approvalStatus',
    'ledgerEntryId',
    'creditKobo',
    'redeemedAmountKobo',
    'redemptionId',
    'availableBalanceKobo',
    'expiresAt',
    'smsStatus',
    'ledger',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    transactionId: { type: 'string', format: 'uuid' },
    type: {
      type: 'string',
      enum: ['EARN', 'REDEEM', 'REVERSAL', 'ADJUSTMENT'],
    },
    direction: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
    tenantId: { type: 'string', format: 'uuid' },
    branchId: { type: 'string', format: 'uuid' },
    customerId: { type: 'string', format: 'uuid' },
    deviceId: { type: 'string', format: 'uuid', nullable: true },
    cardSerialNumber: { type: 'string' },
    posReceiptNumber: { type: 'string' },
    purchaseAmountKobo: { type: 'integer' },
    occurredAt: { type: 'string', format: 'date-time' },
    capturedAt: { type: 'string', format: 'date-time' },
    state: { type: 'string', example: 'CONFIRMED' },
    captureStatus: { type: 'string', example: 'CAPTURED' },
    reviewStatus: { type: 'string', example: 'APPROVED' },
    approvalId: { type: 'string', format: 'uuid', nullable: true },
    approvalStatus: { type: 'string', nullable: true },
    ledgerEntryId: { type: 'string', format: 'uuid' },
    creditKobo: { type: 'integer' },
    redeemedAmountKobo: { type: 'integer', nullable: true },
    redemptionId: { type: 'string', format: 'uuid', nullable: true },
    availableBalanceKobo: { type: 'integer' },
    expiresAt: { type: 'string', format: 'date-time', nullable: true },
    smsStatus: { type: 'string', nullable: true },
    ledger: transactionLedgerItemSchema,
  },
} as const;

const customerLedgerResponseSchema = {
  type: 'object',
  required: ['customerId', 'items', 'nextCursor', 'hasMore'],
  properties: {
    customerId: { type: 'string', format: 'uuid' },
    items: {
      type: 'array',
      items: transactionLedgerItemSchema,
    },
    nextCursor: { type: 'string', nullable: true },
    hasMore: { type: 'boolean' },
  },
} as const;

const earnConfirmedResponseSchema = {
  type: 'object',
  required: [
    'id',
    'transactionId',
    'state',
    'receiptId',
    'tenantId',
    'branchId',
    'deviceId',
    'customerId',
    'cardSerialNumber',
    'posReceiptNumber',
    'purchaseAmountKobo',
    'creditKobo',
    'captureStatus',
    'availableBalanceKobo',
    'expiresAt',
    'smsStatus',
    'occurredAt',
    'capturedAt',
    'reviewStatus',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    transactionId: { type: 'string', format: 'uuid' },
    state: { type: 'string', example: 'CONFIRMED' },
    receiptId: { type: 'string', format: 'uuid' },
    approvalId: { type: 'string', format: 'uuid', nullable: true },
    ledgerEntryId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    branchId: { type: 'string', format: 'uuid' },
    deviceId: { type: 'string', format: 'uuid' },
    customerId: { type: 'string', format: 'uuid' },
    cardSerialNumber: { type: 'string' },
    posReceiptNumber: { type: 'string' },
    purchaseAmountKobo: { type: 'integer' },
    creditKobo: { type: 'integer' },
    captureStatus: { type: 'string', example: 'CAPTURED' },
    availableBalanceKobo: { type: 'integer' },
    expiresAt: { type: 'string', format: 'date-time' },
    smsStatus: { type: 'string', example: 'QUEUED' },
    occurredAt: { type: 'string', format: 'date-time' },
    capturedAt: { type: 'string', format: 'date-time' },
    reviewStatus: { type: 'string', example: 'APPROVED' },
  },
} as const;

const earnPendingApprovalResponseSchema = {
  type: 'object',
  required: [
    'id',
    'transactionId',
    'state',
    'receiptId',
    'approvalId',
    'tenantId',
    'branchId',
    'deviceId',
    'customerId',
    'cardSerialNumber',
    'posReceiptNumber',
    'purchaseAmountKobo',
    'creditKobo',
    'captureStatus',
    'availableBalanceKobo',
    'expiresAt',
    'smsStatus',
    'occurredAt',
    'capturedAt',
    'reviewStatus',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    transactionId: { type: 'string', format: 'uuid', nullable: true },
    state: { type: 'string', example: 'PENDING_APPROVAL' },
    receiptId: { type: 'string', format: 'uuid' },
    approvalId: { type: 'string', format: 'uuid' },
    ledgerEntryId: { type: 'string', format: 'uuid', nullable: true },
    tenantId: { type: 'string', format: 'uuid' },
    branchId: { type: 'string', format: 'uuid' },
    deviceId: { type: 'string', format: 'uuid' },
    customerId: { type: 'string', format: 'uuid' },
    cardSerialNumber: { type: 'string' },
    posReceiptNumber: { type: 'string' },
    purchaseAmountKobo: { type: 'integer' },
    creditKobo: { type: 'integer', nullable: true },
    captureStatus: { type: 'string', example: 'PENDING_APPROVAL' },
    availableBalanceKobo: { type: 'integer', nullable: true },
    expiresAt: { type: 'string', format: 'date-time', nullable: true },
    smsStatus: { type: 'string', nullable: true },
    occurredAt: { type: 'string', format: 'date-time' },
    capturedAt: { type: 'string', format: 'date-time' },
    reviewStatus: { type: 'string', example: 'PENDING' },
  },
} as const;

@ApiTags('transactions')
@ApiBearerAuth()
@Controller()
@apiErrorEnvelopeResponses()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Post('transactions/earn')
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @Throttle({
    bucket: 'transactions.earn',
    limit: 30,
    windowMs: 60_000,
    keyFactory: buildEarnThrottleKey,
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Earn transaction processed',
    status: 201,
    dataSchema: earnConfirmedResponseSchema,
  })
  @apiSuccessEnvelopeResponse({
    description: 'Earn transaction pending approval',
    status: 202,
    dataSchema: earnPendingApprovalResponseSchema,
  })
  @apiErrorEnvelopeResponses({
    badRequest: {
      sessionDeviceRequired: {
        statusCode: 400,
        code: 'SESSION_DEVICE_REQUIRED',
        message: 'Session device is required',
      },
      deviceNotActive: {
        statusCode: 400,
        code: 'DEVICE_NOT_ACTIVE',
        message: 'Device is not active',
      },
      validationError: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
    },
    notFound: {
      cardNotFound: {
        statusCode: 404,
        code: 'CARD_NOT_FOUND',
        message: 'Card not found',
      },
    },
    conflict: {
      receiptAlreadyUsed: {
        statusCode: 409,
        code: 'RECEIPT_ALREADY_USED',
        message: 'Physical receipt already captured',
      },
      idempotencyConflict: {
        statusCode: 409,
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Idempotency key reused with different payload',
      },
    },
    tooManyRequests: {
      rateLimited: {
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      },
    },
    serviceUnavailable: {
      earnTransactionConflict: {
        statusCode: 503,
        code: 'EARN_TRANSACTION_CONFLICT',
        message: 'Earn transaction conflicted; retry the request',
      },
      dependencyUnavailable: {
        statusCode: 503,
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Required dependency is unavailable',
      },
    },
  })
  @ApiOperation({ summary: 'Record an earn transaction' })
  earn(
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: EarnTransactionDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.loyaltyService
      .earn(
        request.authContext!.user.tenantId,
        request.authContext!,
        idempotencyKey,
        dto,
      )
      .then((response) => {
        reply.code(response.state === 'PENDING_APPROVAL' ? 202 : 201);

        return response;
      });
  }

  @Get('transactions/:id')
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiErrorEnvelopeResponses({
    unprocessableEntity: {
      UNSUPPORTED_TRANSACTION_TYPE: {
        statusCode: 422,
        code: 'UNSUPPORTED_TRANSACTION_TYPE',
        message:
          'This transaction type is not available through the earn transaction read model yet',
      },
    },
  })
  @apiSuccessEnvelopeResponse({
    description: 'Receipt-backed transaction details',
    dataSchema: transactionResponseSchema,
  })
  @ApiOperation({ summary: 'Get receipt-backed transaction details' })
  getTransaction(
    @Req() request: AuthenticatedRequest,
    @Param('id') transactionId: string,
  ) {
    return this.loyaltyService.getTransaction(
      request.authContext!.user.tenantId,
      request.authContext!,
      transactionId,
    );
  }

  @Get('customers/:id/ledger')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Customer ledger for receipt-backed transactions',
    dataSchema: customerLedgerResponseSchema,
  })
  @ApiOperation({ summary: 'Get receipt-backed customer ledger' })
  getCustomerLedger(
    @Req() request: AuthenticatedRequest,
    @Param('id') customerId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.loyaltyService.listCustomerLedger(
      request.authContext!.user.tenantId,
      request.authContext!,
      customerId,
      parseCursorPageRequest(limit, cursor),
    );
  }
}
