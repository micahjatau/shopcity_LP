import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ActiveBalanceService } from './active-balance.service';

@Module({
  imports: [PrismaModule],
  providers: [ActiveBalanceService],
  exports: [ActiveBalanceService],
})
export class ActiveBalanceModule {}
