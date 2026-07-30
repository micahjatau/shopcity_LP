import {
  Body,
  Controller,
  Headers,
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
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildRedeemThrottleKey } from '../../common/throttle/throttle.keys';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import type { FastifyReply } from 'fastify';
import { RedeemTransactionDto } from './redemptions.dto';
import { RedemptionsService } from './redemptions.service';

const redeemAllocationSchema = {
  type: 'object',
  required: ['creditLotId', 'amountKobo', 'allocationOrder', 'expiresAt'],
  properties: {
    creditLotId: { type: 'string', format: 'uuid' },
    amountKobo: { type: 'integer' },
    allocationOrder: { type: 'integer' },
    expiresAt: { type: 'string', format: 'date-time' },
  },
} as const;

const redeemResponseSchema = {
  type: 'object',
  required: [
    'id',
    'transactionId',
    'redemptionId',
    'receiptId',
    'approvalId',
    'state',
    'tenantId',
    'branchId',
    'deviceId',
    'customerId',
    'cardSerialNumber',
    'posReceiptNumber',
    'basketAmountKobo',
    'requestedRedemptionKobo',
    'redeemedAmountKobo',
    'maximumAllowedKobo',
    'remainingBalanceKobo',
    'allocations',
    'smsStatus',
    'occurredAt',
    'requestedAt',
    'policyVersion',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    transactionId: { type: 'string', format: 'uuid', nullable: true },
    redemptionId: { type: 'string', format: 'uuid' },
    receiptId: { type: 'string', format: 'uuid' },
    approvalId: { type: 'string', format: 'uuid', nullable: true },
    state: { type: 'string', enum: ['CONFIRMED', 'PENDING_APPROVAL'] },
    tenantId: { type: 'string', format: 'uuid' },
    branchId: { type: 'string', format: 'uuid' },
    deviceId: { type: 'string', format: 'uuid' },
    customerId: { type: 'string', format: 'uuid' },
    cardSerialNumber: { type: 'string' },
    posReceiptNumber: { type: 'string' },
    basketAmountKobo: { type: 'integer' },
    requestedRedemptionKobo: { type: 'integer' },
    redeemedAmountKobo: { type: 'integer', nullable: true },
    maximumAllowedKobo: { type: 'integer' },
    remainingBalanceKobo: { type: 'integer', nullable: true },
    allocations: { type: 'array', items: redeemAllocationSchema },
    smsStatus: { type: 'string', nullable: true },
    occurredAt: { type: 'string', format: 'date-time' },
    requestedAt: { type: 'string', format: 'date-time' },
    policyVersion: { type: 'string' },
  },
} as const;

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
@apiErrorEnvelopeResponses()
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @Post('redeem')
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @Throttle({
    bucket: 'transactions.redeem',
    limit: 30,
    windowMs: 60_000,
    keyFactory: buildRedeemThrottleKey,
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Confirmed redemption',
    status: 201,
    dataSchema: redeemResponseSchema,
  })
  @apiSuccessEnvelopeResponse({
    description: 'Pending redemption approval',
    status: 202,
    dataSchema: redeemResponseSchema,
  })
  @apiErrorEnvelopeResponses({
    badRequest: {
      validationError: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
      sessionDeviceRequired: {
        statusCode: 400,
        code: 'SESSION_DEVICE_REQUIRED',
        message: 'Session device is required',
      },
    },
    unprocessableEntity: {
      offlineRedemptionNotAllowed: {
        statusCode: 422,
        code: 'OFFLINE_REDEMPTION_NOT_ALLOWED',
        message: 'Redemption occurredAt is outside the allowed clock skew',
      },
      basketCapExceeded: {
        statusCode: 422,
        code: 'REDEMPTION_BASKET_CAP_EXCEEDED',
        message: 'Requested redemption exceeds the basket cap',
      },
      insufficientBalance: {
        statusCode: 422,
        code: 'INSUFFICIENT_BALANCE',
        message: 'Active balance is lower than requested redemption amount',
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
  })
  @ApiOperation({ summary: 'Redeem store credit' })
  async redeem(
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: RedeemTransactionDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const response = await this.redemptionsService.redeem(
      request.authContext!.user.tenantId,
      request.authContext!,
      idempotencyKey,
      dto,
    );

    reply.code(response.state === 'PENDING_APPROVAL' ? 202 : 201);
    return response;
  }
}
