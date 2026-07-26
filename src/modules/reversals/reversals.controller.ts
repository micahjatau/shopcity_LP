import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
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
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildReverseThrottleKey } from '../../common/throttle/throttle.keys';
import { ReverseTransactionDto } from './reversals.dto';
import { ReversalsService } from './reversals.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class ReversalsController {
  constructor(private readonly reversalsService: ReversalsService) {}

  @Post(':transactionId/reverse')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @Throttle({
    bucket: 'transactions.reverse',
    limit: 20,
    windowMs: 60_000,
    keyFactory: buildReverseThrottleKey,
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Transaction reversal processed',
    status: 201,
  })
  @apiErrorEnvelopeResponses({
    badRequest: {
      validationError: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      },
    },
    conflict: {
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
    unprocessableEntity: {
      reviewRequired: {
        statusCode: 422,
        code: 'REVERSAL_REVIEW_REQUIRED',
        message: 'Automatic reversal requires manual review',
      },
    },
  })
  @ApiOperation({ summary: 'Reverse a confirmed transaction' })
  reverse(
    @Req() request: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: ReverseTransactionDto,
  ) {
    return this.reversalsService.reverse(
      request.authContext!.user.tenantId,
      request.authContext!,
      transactionId,
      idempotencyKey,
      dto,
    );
  }
}
