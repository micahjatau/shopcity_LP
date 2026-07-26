import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ActiveBalanceService } from './active-balance.service';
import { LotAllocationService } from './lot-allocation.service';

@Module({
  imports: [PrismaModule],
  providers: [ActiveBalanceService, LotAllocationService],
  exports: [ActiveBalanceService, LotAllocationService],
})
export class ActiveBalanceModule {}
