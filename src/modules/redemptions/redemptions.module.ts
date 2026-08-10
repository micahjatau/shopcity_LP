import { Module } from '@nestjs/common';
import { ActiveBalanceModule } from '../../common/balance/active-balance.module';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { FraudModule } from '../fraud/fraud.module';
import { RedemptionPolicyService } from './redemption-policy.service';
import { RedemptionsController } from './redemptions.controller';
import { RedemptionsService } from './redemptions.service';

@Module({
  imports: [PrismaModule, ActiveBalanceModule, AuditModule, FraudModule],
  controllers: [RedemptionsController],
  providers: [RedemptionsService, RedemptionPolicyService],
  exports: [RedemptionsService, RedemptionPolicyService],
})
export class RedemptionsModule {}
