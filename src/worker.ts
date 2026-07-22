import { PrismaService } from './database/prisma.service';
import {
  loadWorkerConfig,
  OutboxWorkerRuntime,
} from './jobs/outbox-worker.runtime';
import { DeterministicSmsProvider } from './jobs/sms.provider';

async function bootstrap() {
  const config = loadWorkerConfig(process.env);
  const prisma = new PrismaService();
  const runtime = new OutboxWorkerRuntime(
    prisma,
    config,
    new DeterministicSmsProvider(),
  );

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

void bootstrap().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
