import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PrismaModule } from '../../database/prisma.module';
import { OutboxWorkerRuntime } from '../../jobs/outbox-worker.runtime';
import { FraudModule } from '../fraud/fraud.module';
import { FraudService } from '../fraud/fraud.service';
import { ReportsModule } from '../reports/reports.module';
import { ReportMaterializerService } from '../reports/report-materializer.service';
import { DeferredSmsProvider } from './deferred-sms.provider';
import { OutboxProcessingCronController } from './outbox-processing-cron.controller';
import { OutboxProcessingService } from './outbox-processing.service';

@Module({
  imports: [PrismaModule, FraudModule, ReportsModule],
  controllers: [OutboxProcessingCronController],
  providers: [
    {
      provide: OutboxWorkerRuntime,
      useFactory: (
        prisma: PrismaService,
        config: ConfigService,
        fraud: FraudService,
        reports: ReportMaterializerService,
      ) =>
        new OutboxWorkerRuntime(
          prisma,
          {
            redisUrl: '',
            publishBatchSize: 10,
            publishIntervalMs: 5_000,
            deliveryReportPollIntervalMs: 300_000,
            deliveryReportPollBatchSize: Math.max(
              1,
              Math.min(5, config.get<number>('SMS_DLR_POLL_BATCH_SIZE', 5)),
            ),
            retryDelayMs: config.get<number>('OUTBOX_RETRY_DELAY_MS', 30_000),
            recoveryThresholdMs: config.get<number>(
              'OUTBOX_RECOVERY_THRESHOLD_MS',
              60_000,
            ),
          },
          new DeferredSmsProvider(),
          undefined,
          reports,
          fraud,
        ),
      inject: [
        PrismaService,
        ConfigService,
        FraudService,
        ReportMaterializerService,
      ],
    },
    OutboxProcessingService,
  ],
  exports: [OutboxProcessingService],
})
export class OutboxProcessingModule {}
