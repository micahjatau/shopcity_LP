import { Module } from '@nestjs/common';
import { ActiveBalanceModule } from '../../common/balance/active-balance.module';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ReversalsController } from './reversals.controller';
import { ReversalsService } from './reversals.service';

@Module({
  imports: [PrismaModule, ActiveBalanceModule, AuditModule],
  controllers: [ReversalsController],
  providers: [ReversalsService],
  exports: [ReversalsService],
})
export class ReversalsModule {}
