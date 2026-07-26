import { HttpStatus, Injectable } from '@nestjs/common';
import { ActiveBalanceService } from '../../common/balance/active-balance.service';
import { LotAllocationService } from '../../common/balance/lot-allocation.service';
import type { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../database/prisma.service';
import { RedemptionPolicyService } from './redemption-policy.service';
import { RedeemTransactionDto } from './redemptions.dto';

@Injectable()
export class RedemptionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly activeBalanceService: ActiveBalanceService,
    private readonly lotAllocationService: LotAllocationService,
    private readonly redemptionPolicyService: RedemptionPolicyService,
  ) {}

  get dependenciesReady(): boolean {
    return Boolean(
      this.prismaService &&
        this.activeBalanceService &&
        this.lotAllocationService &&
        this.redemptionPolicyService,
    );
  }

  async redeem(
    tenantId: string,
    actor: AuthContext,
    idempotencyKey: string | undefined,
    dto: RedeemTransactionDto,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new DomainHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Idempotency-Key header is required',
      );
    }

    if (!actor.session.deviceId) {
      throw new DomainHttpException(
        HttpStatus.BAD_REQUEST,
        'SESSION_DEVICE_REQUIRED',
        'Session device is required',
      );
    }

    void tenantId;
    void dto;

    throw new DomainHttpException(
      HttpStatus.NOT_IMPLEMENTED,
      'REDEMPTION_NOT_IMPLEMENTED',
      'Redemption financial execution will be added by the next implementation task',
    );
  }
}
