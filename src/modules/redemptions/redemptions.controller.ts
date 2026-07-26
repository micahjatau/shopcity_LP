import { Body, Controller, Headers, Post, Req, Version } from '@nestjs/common';
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
import { apiErrorEnvelopeResponses } from '../../common/openapi-envelope';
import { RedeemTransactionDto } from './redemptions.dto';
import { RedemptionsService } from './redemptions.service';

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
  @ApiOperation({ summary: 'Redeem store credit' })
  redeem(
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: RedeemTransactionDto,
  ) {
    return this.redemptionsService.redeem(
      request.authContext!.user.tenantId,
      request.authContext!,
      idempotencyKey,
      dto,
    );
  }
}
