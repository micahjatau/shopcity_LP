import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
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
    'creditLot',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    receiptId: { type: 'string', format: 'uuid' },
    type: { type: 'string', example: 'EARN' },
    direction: { type: 'string', example: 'CREDIT' },
    amountKobo: { type: 'integer' },
    status: { type: 'string', example: 'CONFIRMED' },
    effectiveAt: { type: 'string', format: 'date-time' },
    creditLot: ledgerCreditLotSchema,
  },
} as const;

const transactionResponseSchema = {
  type: 'object',
  required: [
    'id',
    'transactionId',
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
    'availableBalanceKobo',
    'expiresAt',
    'smsStatus',
    'ledger',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    transactionId: { type: 'string', format: 'uuid' },
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
    availableBalanceKobo: { type: 'integer' },
    expiresAt: { type: 'string', format: 'date-time', nullable: true },
    smsStatus: { type: 'string', nullable: true },
    ledger: transactionLedgerItemSchema,
  },
} as const;

const customerLedgerResponseSchema = {
  type: 'object',
  required: ['customerId', 'items'],
  properties: {
    customerId: { type: 'string', format: 'uuid' },
    items: {
      type: 'array',
      items: transactionLedgerItemSchema,
    },
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
  @apiSuccessEnvelopeResponse({
    description: 'Transaction details',
    dataSchema: transactionResponseSchema,
  })
  @ApiOperation({ summary: 'Get transaction details' })
  getTransaction(
    @Req() request: AuthenticatedRequest,
    @Param('id') transactionId: string,
  ) {
    return this.loyaltyService.getTransaction(
      request.authContext!.user.tenantId,
      transactionId,
    );
  }

  @Get('customers/:id/ledger')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Customer ledger',
    dataSchema: customerLedgerResponseSchema,
  })
  @ApiOperation({ summary: 'Get customer ledger' })
  getCustomerLedger(
    @Req() request: AuthenticatedRequest,
    @Param('id') customerId: string,
  ) {
    return this.loyaltyService.listCustomerLedger(
      request.authContext!.user.tenantId,
      customerId,
    );
  }
}
