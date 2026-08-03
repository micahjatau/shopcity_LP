import {
  Body,
  Controller,
  Headers,
  HttpCode,
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

const reversalReviewResponseSchema = {
  type: 'object',
  required: ['code', 'transactionId'],
  properties: {
    code: { type: 'string', example: 'REVERSAL_REVIEW_REQUIRED' },
    transactionId: { type: 'string', format: 'uuid' },
  },
} as const;

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
  @HttpCode(202)
  @apiSuccessEnvelopeResponse({
    status: 202,
    description: 'Reversal review accepted',
    dataSchema: reversalReviewResponseSchema,
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
      idempotencyInProgress: {
        statusCode: 409,
        code: 'IDEMPOTENCY_IN_PROGRESS',
        message: 'Idempotency key is still being processed',
      },
    },
    tooManyRequests: {
      rateLimited: {
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      },
    },
  })
  @ApiOperation({
    summary: 'Request a transaction reversal review',
    description: 'Returns REVERSAL_REVIEW_REQUIRED for manual processing.',
  })
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
