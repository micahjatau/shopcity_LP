import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../database/prisma.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [LoyaltyModule, PrismaModule, AuditModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
