import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../database/prisma.module';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { ActiveBalanceService } from './active-balance.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LoyaltyController],
  providers: [ActiveBalanceService, LoyaltyService],
  exports: [ActiveBalanceService, LoyaltyService],
})
export class LoyaltyModule {}
