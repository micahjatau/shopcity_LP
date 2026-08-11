import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { ReportMaterializerService } from '../modules/reports/report-materializer.service';
import { loadWorkerConfig, OutboxWorkerRuntime } from './outbox-worker.runtime';
import { createSmsProvider } from './sms.provider.factory';

export function bootstrapWorker(redisUrl: string) {
  const config = loadWorkerConfig({ ...process.env, REDIS_URL: redisUrl });
  const smsProvider = createSmsProvider({
    ...process.env,
    REDIS_URL: redisUrl,
  });
  const prismaService = new PrismaService();
  const reportMaterializer = new ReportMaterializerService(
    prismaService,
    new ConfigService(process.env as Record<string, string | undefined>),
  );

  return new OutboxWorkerRuntime(
    prismaService,
    config,
    smsProvider,
    undefined,
    reportMaterializer,
  );
}
