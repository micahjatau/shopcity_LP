import { Module } from '@nestjs/common';
import { ActiveBalanceModule } from '../../common/balance/active-balance.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../database/prisma.module';
import { AdjustmentsController } from './adjustments.controller';
import { AdjustmentsService } from './adjustments.service';

@Module({
  imports: [PrismaModule, ActiveBalanceModule, AuditModule],
  controllers: [AdjustmentsController],
  providers: [AdjustmentsService],
  exports: [AdjustmentsService],
})
export class AdjustmentsModule {}
