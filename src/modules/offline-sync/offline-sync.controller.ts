import { Body, Controller, Post, Req, Res, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { OfflineEarnBatchRequestDto } from './offline-sync.dto';
import { OfflineSyncService } from './offline-sync.service';

const offlineSyncRecordResponseSchema = {
  type: 'object',
  required: [
    'localId',
    'status',
    'transactionId',
    'approvalId',
    'creditEarnedKobo',
    'errorCode',
    'retryable',
  ],
  properties: {
    localId: { type: 'string', format: 'uuid' },
    status: {
      type: 'string',
      enum: ['CONFIRMED', 'PENDING_APPROVAL', 'REJECTED', 'RETRYABLE'],
    },
    transactionId: { type: 'string', format: 'uuid', nullable: true },
    approvalId: { type: 'string', format: 'uuid', nullable: true },
    creditEarnedKobo: { type: 'integer', nullable: true },
    errorCode: { type: 'string', nullable: true },
    retryable: { type: 'boolean' },
  },
} as const;

const offlineSyncBatchResponseSchema = {
  type: 'object',
  required: ['deviceId', 'records'],
  properties: {
    deviceId: { type: 'string', format: 'uuid' },
    records: {
      type: 'array',
      items: offlineSyncRecordResponseSchema,
    },
  },
} as const;

@ApiTags('offline-sync')
@ApiBearerAuth()
@Controller('offline-sync')
@apiErrorEnvelopeResponses()
export class OfflineSyncController {
  constructor(private readonly offlineSyncService: OfflineSyncService) {}

  @Post('earn-batch')
  @Version('1')
  @Roles(UserRole.CASHIER)
  @apiSuccessEnvelopeResponse({
    description: 'Offline earn batch processed',
    dataSchema: offlineSyncBatchResponseSchema,
  })
  @apiErrorEnvelopeResponses({
    badRequest: {
      syncBatchTooLarge: {
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Offline sync batch is too large',
      },
      syncActorMismatch: {
        statusCode: 400,
        code: 'SYNC_ACTOR_MISMATCH',
        message: 'Offline earn sync requires a cashier session',
      },
      syncDeviceMismatch: {
        statusCode: 400,
        code: 'SYNC_DEVICE_MISMATCH',
        message: 'Offline sync device does not match the authenticated session',
      },
      syncBranchMismatch: {
        statusCode: 400,
        code: 'SYNC_BRANCH_MISMATCH',
        message: 'Branch context is required for offline sync',
      },
      validationError: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
    },
    conflict: {
      syncRecordConflict: {
        statusCode: 409,
        code: 'SYNC_RECORD_CONFLICT',
        message: 'Offline sync record conflicts with an existing record',
      },
      syncWeekMismatch: {
        statusCode: 409,
        code: 'SYNC_WEEK_MISMATCH',
        message: 'Offline sync receipt week does not match the server-derived week',
      },
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
  @ApiOperation({ summary: 'Synchronize offline earn records' })
  earnBatch(
    @Req() request: AuthenticatedRequest,
    @Body() dto: OfflineEarnBatchRequestDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.offlineSyncService
      .earnBatch(request.authContext!.user.tenantId, request.authContext!, dto)
      .then((response) => {
        reply.code(200);
        return response;
      });
  }
}
