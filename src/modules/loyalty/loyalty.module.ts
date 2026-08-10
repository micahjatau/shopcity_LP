import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FraudModule } from '../fraud/fraud.module';
import { PrismaModule } from '../../database/prisma.module';
import { ActiveBalanceModule } from '../../common/balance/active-balance.module';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({
  imports: [PrismaModule, AuditModule, FraudModule, ActiveBalanceModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
