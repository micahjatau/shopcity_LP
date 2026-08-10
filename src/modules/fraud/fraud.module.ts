import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../database/prisma.module';
import { FraudController } from './fraud.controller';
import { FraudReviewService } from './fraud-review.service';
import { FraudRulesService } from './fraud-rules.service';
import { FraudService } from './fraud.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [FraudController],
  providers: [FraudRulesService, FraudService, FraudReviewService],
  exports: [FraudRulesService, FraudService, FraudReviewService],
})
export class FraudModule {}
