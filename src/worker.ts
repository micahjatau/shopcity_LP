import { ConfigService } from '@nestjs/config';
import { PrismaService } from './database/prisma.service';
import { AuditService } from './modules/audit/audit.service';
import { ReportMaterializerService } from './modules/reports/report-materializer.service';
import {
  loadWorkerConfig,
  OutboxWorkerRuntime,
} from './jobs/outbox-worker.runtime';
import { ApprovalExpiryWorkerRuntime } from './jobs/approval-expiry.worker';
import { createSmsProvider } from './jobs/sms.provider.factory';
import {
  loadReportMaterializationWorkerConfig,
  ReportMaterializationWorkerRuntime,
} from './jobs/report-materialization.worker';

export async function bootstrap() {
  if (process.argv.includes('--approval-expiry-only')) {
    await bootstrapApprovalExpiryOnly();
    return;
  }

  const config = loadWorkerConfig(process.env);
  const smsProvider = createSmsProvider(process.env);
  const prisma = new PrismaService();
  const reportMaterializer = new ReportMaterializerService(
    prisma,
    new ConfigService(process.env as Record<string, string | undefined>),
  );
  const reportConfig = loadReportMaterializationWorkerConfig();
  const runtime = new OutboxWorkerRuntime(prisma, config, smsProvider);
  const reportMaterializationRuntime = new ReportMaterializationWorkerRuntime(
    prisma,
    reportMaterializer,
    reportConfig,
  );
  const approvalExpiryRuntime = new ApprovalExpiryWorkerRuntime(
    prisma,
    new AuditService(prisma),
  );

  const shutdown = async () => {
    await Promise.allSettled([
      runtime.stop(),
      reportMaterializationRuntime.stop(),
      approvalExpiryRuntime.stop(),
    ]);
    await prisma.$disconnect().catch(() => undefined);
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });

  try {
    await prisma.$connect();
    await runtime.start();
    await reportMaterializationRuntime.start();
    await approvalExpiryRuntime.start();
  } catch (error) {
    await shutdown();
    throw error;
  }
}

async function bootstrapApprovalExpiryOnly() {
  const prisma = new PrismaService();
  const approvalExpiryRuntime = new ApprovalExpiryWorkerRuntime(
    prisma,
    new AuditService(prisma),
  );

  const shutdown = async () => {
    await approvalExpiryRuntime.stop();
    await prisma.$disconnect().catch(() => undefined);
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });

  try {
    await prisma.$connect();
    await approvalExpiryRuntime.start();
  } catch (error) {
    await shutdown();
    throw error;
  }
}

if (require.main === module) {
  if (process.argv.includes('--help')) {
    process.stdout.write(
      'Usage: node dist/src/worker.js [--help] [--approval-expiry-only]\n',
    );
    process.exit(0);
  }

  void bootstrap().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
