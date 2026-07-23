import { PrismaService } from './database/prisma.service';
import {
  loadWorkerConfig,
  OutboxWorkerRuntime,
} from './jobs/outbox-worker.runtime';
import { createSmsProvider } from './jobs/sms.provider.factory';

export async function bootstrap() {
  const config = loadWorkerConfig(process.env);
  const smsProvider = createSmsProvider(process.env);
  const prisma = new PrismaService();
  const runtime = new OutboxWorkerRuntime(prisma, config, smsProvider);

  const shutdown = async () => {
    await runtime.stop();
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });

  try {
    await runtime.start();
  } catch (error) {
    await shutdown();
    throw error;
  }
}

if (require.main === module) {
  void bootstrap().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
