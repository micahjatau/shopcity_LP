import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { FraudRulesService } from './fraud-rules.service';
import { FraudService } from './fraud.service';

@Module({
  imports: [PrismaModule],
  providers: [FraudRulesService, FraudService],
  exports: [FraudRulesService, FraudService],
})
export class FraudModule {}
