import { PrismaService } from './database/prisma.service';
import { AuditService } from './modules/audit/audit.service';
import {
  loadWorkerConfig,
  OutboxWorkerRuntime,
} from './jobs/outbox-worker.runtime';
import { ApprovalExpiryWorkerRuntime } from './jobs/approval-expiry.worker';
import { createSmsProvider } from './jobs/sms.provider.factory';

export async function bootstrap() {
  const config = loadWorkerConfig(process.env);
  const smsProvider = createSmsProvider(process.env);
  const prisma = new PrismaService();
  const runtime = new OutboxWorkerRuntime(prisma, config, smsProvider);
  const approvalExpiryRuntime = new ApprovalExpiryWorkerRuntime(
    prisma,
    new AuditService(prisma),
  );

  const shutdown = async () => {
    await Promise.allSettled([runtime.stop(), approvalExpiryRuntime.stop()]);
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });

  try {
    await runtime.start();
    await approvalExpiryRuntime.start();
  } catch (error) {
    await shutdown();
    throw error;
  }
}

if (require.main === module) {
  if (process.argv.includes('--help')) {
    process.stdout.write('Usage: node dist/src/worker.js [--help]\n');
    process.exit(0);
  }

  void bootstrap().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
