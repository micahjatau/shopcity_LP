import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { ReceiptsController } from './receipts.controller';

@Module({
  imports: [PrismaModule, AuditModule, ApprovalsModule, LoyaltyModule],
  controllers: [ReceiptsController],
})
export class ReceiptsModule {}
