import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../database/prisma.module';
import { ActiveBalanceModule } from '../../common/balance/active-balance.module';
import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminTransactionSearchService } from './admin-transaction-search.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({
  imports: [PrismaModule, AuditModule, ActiveBalanceModule],
  controllers: [LoyaltyController, AdminTransactionsController],
  providers: [LoyaltyService, AdminTransactionSearchService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
