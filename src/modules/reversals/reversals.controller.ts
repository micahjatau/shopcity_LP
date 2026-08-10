import {
  Body,
  Controller,
  HttpCode,
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
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildReverseThrottleKey } from '../../common/throttle/throttle.keys';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { ReverseTransactionDto } from './reversals.dto';
import { ReversalsService } from './reversals.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class ReversalsController {
  constructor(private readonly reversalsService: ReversalsService) {}

  @Post(':transactionId/reverse')
  @HttpCode(201)
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @Throttle({
    bucket: 'transactions.reverse',
    limit: 20,
    windowMs: 60_000,
    keyFactory: buildReverseThrottleKey,
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Reverse a transaction',
    description: 'Creates an immutable compensating reversal transaction.',
  })
  @apiSuccessEnvelopeResponse({
    description: 'Reversal transaction created',
    status: 201,
    dataSchema: {
      type: 'object',
      required: [
        'id',
        'transactionId',
        'originalTransactionId',
        'originalTransactionType',
        'reversedAmountKobo',
        'newActiveBalanceKobo',
        'allocations',
        'restorations',
        'smsStatus',
        'occurredAt',
        'requestedAt',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        transactionId: { type: 'string', format: 'uuid' },
        originalTransactionId: { type: 'string', format: 'uuid' },
        originalTransactionType: { type: 'string' },
        reversedAmountKobo: { type: 'integer' },
        newActiveBalanceKobo: { type: 'integer' },
        allocations: { type: 'array', items: { type: 'object' } },
        restorations: { type: 'array', items: { type: 'object' } },
        smsStatus: { type: 'string', nullable: true },
        occurredAt: { type: 'string', format: 'date-time' },
        requestedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @apiErrorEnvelopeResponses({
    badRequest: {
      validationError: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
    },
    notFound: {
      transactionNotFound: {
        statusCode: 404,
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
      },
    },
    conflict: {
      transactionAlreadyReversed: {
        statusCode: 409,
        code: 'TRANSACTION_ALREADY_REVERSED',
        message: 'Transaction already has a reversal',
      },
    },
    unprocessableEntity: {
      reversalReviewRequired: {
        statusCode: 422,
        code: 'REVERSAL_REVIEW_REQUIRED',
        message: 'Transaction reversal requires manual review',
      },
    },
  })
  async reverse(
    @Req() request: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: ReverseTransactionDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const response = await this.reversalsService.reverse(
      request.authContext!.user.tenantId,
      request.authContext!,
      transactionId,
      idempotencyKey,
      dto,
    );

    reply.code(201);
    return response;
  }
}
