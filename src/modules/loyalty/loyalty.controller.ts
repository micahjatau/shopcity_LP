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
    dataSchema: {
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
        'occurredAt',
        'capturedAt',
        'reviewStatus',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        transactionId: { type: 'string', format: 'uuid', nullable: true },
        state: { type: 'string', example: 'CONFIRMED' },
        receiptId: { type: 'string', format: 'uuid' },
        approvalId: { type: 'string', format: 'uuid', nullable: true },
        ledgerEntryId: { type: 'string', format: 'uuid', nullable: true },
        tenantId: { type: 'string', format: 'uuid' },
        branchId: { type: 'string', format: 'uuid' },
        deviceId: { type: 'string', format: 'uuid' },
        customerId: { type: 'string', format: 'uuid' },
        cardSerialNumber: { type: 'string' },
        posReceiptNumber: { type: 'string' },
        purchaseAmountKobo: { type: 'integer' },
        creditKobo: { type: 'integer' },
        captureStatus: { type: 'string', example: 'CAPTURED' },
        availableBalanceKobo: { type: 'integer', nullable: true },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
        smsStatus: { type: 'string', nullable: true },
        occurredAt: { type: 'string', format: 'date-time' },
        capturedAt: { type: 'string', format: 'date-time' },
        reviewStatus: { type: 'string' },
      },
    },
  })
  @apiSuccessEnvelopeResponse({
    description: 'Earn transaction pending approval',
    status: 202,
    dataSchema: {
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
        'occurredAt',
        'capturedAt',
        'reviewStatus',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        transactionId: { type: 'string', format: 'uuid', nullable: true },
        state: { type: 'string', example: 'PENDING_APPROVAL' },
        receiptId: { type: 'string', format: 'uuid' },
        approvalId: { type: 'string', format: 'uuid', nullable: true },
        ledgerEntryId: { type: 'string', format: 'uuid', nullable: true },
        tenantId: { type: 'string', format: 'uuid' },
        branchId: { type: 'string', format: 'uuid' },
        deviceId: { type: 'string', format: 'uuid' },
        customerId: { type: 'string', format: 'uuid' },
        cardSerialNumber: { type: 'string' },
        posReceiptNumber: { type: 'string' },
        purchaseAmountKobo: { type: 'integer' },
        creditKobo: { type: 'integer' },
        captureStatus: { type: 'string', example: 'PENDING_APPROVAL' },
        availableBalanceKobo: { type: 'integer', nullable: true },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
        smsStatus: { type: 'string', nullable: true },
        occurredAt: { type: 'string', format: 'date-time' },
        capturedAt: { type: 'string', format: 'date-time' },
        reviewStatus: { type: 'string' },
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
  @apiSuccessEnvelopeResponse({
    description: 'Transaction details',
    dataSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        transactionId: { type: 'string', format: 'uuid' },
      },
    },
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
    dataSchema: { type: 'object' },
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
