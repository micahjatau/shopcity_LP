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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildReverseThrottleKey } from '../../common/throttle/throttle.keys';
import { ReverseTransactionDto } from './reversals.dto';
import { ReversalsService } from './reversals.service';

const reversalDeferredResponseSchema = {
  type: 'object',
  required: ['code', 'transactionId'],
  properties: {
    code: { type: 'string', example: 'REVERSAL_DEFERRED' },
    transactionId: { type: 'string', format: 'uuid' },
  },
} as const;

const reversalDeferredEnvelopeSchema = {
  type: 'object',
  required: ['success', 'data', 'meta'],
  properties: {
    success: { type: 'boolean', example: false },
    data: reversalDeferredResponseSchema,
    meta: {
      type: 'object',
      required: ['timestamp', 'path', 'requestId'],
      properties: {
        timestamp: { type: 'string', example: '2026-07-19T00:00:00.000Z' },
        path: { type: 'string', example: '/api/v1/transactions/123/reverse' },
        requestId: { type: 'string', example: 'req-123' },
      },
    },
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
  @ApiResponse({
    status: 202,
    description: 'Reversal is deferred for this release',
    content: {
      'application/json': {
        schema: reversalDeferredEnvelopeSchema as never,
      },
    },
  })
  @ApiOperation({
    summary: 'Deferred transaction reversal',
    description: 'Reversal is unavailable for this release.',
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
