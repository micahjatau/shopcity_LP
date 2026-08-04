import {
  Body,
  Controller,
  HttpCode,
  Headers,
  Param,
  Post,
  Req,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildReverseThrottleKey } from '../../common/throttle/throttle.keys';
import { apiErrorEnvelopeResponses } from '../../common/openapi-envelope';
import { ReverseTransactionDto } from './reversals.dto';
import { ReversalsService } from './reversals.service';

@ApiTags('transactions')
@ApiBearerAuth()
@apiErrorEnvelopeResponses({
  serviceUnavailable: {
    REVERSAL_UNAVAILABLE: {
      statusCode: 503,
      code: 'REVERSAL_UNAVAILABLE',
      message: 'Transaction reversal is not available in this release',
    },
  },
})
@Controller('transactions')
export class ReversalsController {
  constructor(private readonly reversalsService: ReversalsService) {}

  @Post(':transactionId/reverse')
  @HttpCode(503)
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiErrorEnvelopeResponses({
    serviceUnavailable: {
      REVERSAL_UNAVAILABLE: {
        statusCode: 503,
        code: 'REVERSAL_UNAVAILABLE',
        message: 'Transaction reversal is not available in this release',
      },
    },
  })
  @Throttle({
    bucket: 'transactions.reverse',
    limit: 20,
    windowMs: 60_000,
    keyFactory: buildReverseThrottleKey,
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Unavailable transaction reversal',
    description:
      'Reversal execution is deferred for this release and no reversal request is queued.',
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
