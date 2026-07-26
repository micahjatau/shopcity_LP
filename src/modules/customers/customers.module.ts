import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ActiveBalanceModule } from '../../common/balance/active-balance.module';
import { AuditModule } from '../audit/audit.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [PrismaModule, AuditModule, ActiveBalanceModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
