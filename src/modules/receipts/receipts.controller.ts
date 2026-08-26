import {
  Body,
  Controller,
  Headers,
  HttpCode,
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
import { CurrentSession } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthContext } from '../../common/auth/session.types';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { CaptureReceiptDto } from './receipts.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

@ApiTags('receipts')
@ApiBearerAuth()
@Controller('receipts')
@apiErrorEnvelopeResponses()
export class ReceiptsController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  @Post()
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Receipt captured',
    status: 201,
    dataSchema: {
      type: 'object',
      required: [
        'id',
        'tenantId',
        'branchId',
        'customerId',
        'cardSerialNumber',
        'posReceiptNumber',
        'purchaseAmountKobo',
        'occurredAt',
        'capturedAt',
        'status',
        'reviewStatus',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        branchId: { type: 'string', format: 'uuid' },
        customerId: { type: 'string', format: 'uuid' },
        cardSerialNumber: { type: 'string' },
        posReceiptNumber: { type: 'string' },
        purchaseAmountKobo: { type: 'integer' },
        occurredAt: { type: 'string', format: 'date-time' },
        capturedAt: { type: 'string', format: 'date-time' },
        status: { type: 'string', example: 'CAPTURED' },
        reviewStatus: { type: 'string', example: 'APPROVED' },
      },
    },
  })
  @apiSuccessEnvelopeResponse({
    description: 'Receipt captured and queued for approval',
    status: 202,
    dataSchema: {
      type: 'object',
      required: [
        'id',
        'tenantId',
        'branchId',
        'customerId',
        'cardSerialNumber',
        'posReceiptNumber',
        'purchaseAmountKobo',
        'occurredAt',
        'capturedAt',
        'status',
        'reviewStatus',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        branchId: { type: 'string', format: 'uuid' },
        customerId: { type: 'string', format: 'uuid' },
        cardSerialNumber: { type: 'string' },
        posReceiptNumber: { type: 'string' },
        purchaseAmountKobo: { type: 'integer' },
        occurredAt: { type: 'string', format: 'date-time' },
        capturedAt: { type: 'string', format: 'date-time' },
        status: { type: 'string', example: 'PENDING_APPROVAL' },
        reviewStatus: { type: 'string', example: 'PENDING' },
      },
    },
  })
  @ApiOperation({
    summary: 'Capture receipt',
    deprecated: true,
    description:
      'Deprecated for new frontend integration. Use POST /api/v1/transactions/earn instead.',
  })
  captureReceipt(
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CaptureReceiptDto,
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

        return {
          id: response.id,
          tenantId: response.tenantId,
          branchId: response.branchId,
          customerId: response.customerId,
          cardSerialNumber: response.cardSerialNumber,
          deviceId: response.deviceId,
          posReceiptNumber: response.posReceiptNumber,
          purchaseAmountKobo: response.purchaseAmountKobo,
          occurredAt: response.occurredAt,
          capturedAt: response.capturedAt,
          status: response.captureStatus,
          reviewStatus: response.reviewStatus,
        };
      });
  }

  @Post(':id/approve')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @HttpCode(200)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Receipt approved',
    dataSchema: {
      type: 'object',
      required: ['id', 'status', 'receiptId', 'decidedAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', example: 'EXECUTED' },
        receiptId: { type: 'string', format: 'uuid' },
        decidedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiOperation({
    summary: 'Approve pending receipt',
    deprecated: true,
    description:
      'Deprecated for new frontend integration. Use POST /api/v1/approvals/{id}/decision instead.',
  })
  approveReceipt(
    @CurrentSession() context: AuthContext,
    @Param('id') receiptId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.approvalsService.approveReceipt(
      context.user.tenantId,
      context,
      receiptId,
      idempotencyKey,
    );
  }

  @Post(':id/reject')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @HttpCode(200)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Receipt rejected',
    dataSchema: {
      type: 'object',
      required: ['id', 'status', 'receiptId', 'decidedAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', example: 'REJECTED' },
        receiptId: { type: 'string', format: 'uuid' },
        decidedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiOperation({
    summary: 'Reject pending receipt',
    deprecated: true,
    description:
      'Deprecated for new frontend integration. Use POST /api/v1/approvals/{id}/decision instead.',
  })
  rejectReceipt(
    @CurrentSession() context: AuthContext,
    @Param('id') receiptId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.approvalsService.rejectReceipt(
      context.user.tenantId,
      context,
      receiptId,
      idempotencyKey,
    );
  }
}
