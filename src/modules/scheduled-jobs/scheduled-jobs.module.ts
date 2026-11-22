import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CreditExpiryModule } from '../credit-expiry/credit-expiry.module';
import { OutboxProcessingModule } from '../outbox-processing/outbox-processing.module';
import { ReportsModule } from '../reports/reports.module';
import { ScheduledJobsController } from './scheduled-jobs.controller';
import { ScheduledJobsService } from './scheduled-jobs.service';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    CreditExpiryModule,
    OutboxProcessingModule,
    ReportsModule,
  ],
  controllers: [ScheduledJobsController],
  providers: [ScheduledJobsService],
})
export class ScheduledJobsModule {}
