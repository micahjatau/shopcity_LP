import { PrismaService } from '../database/prisma.service';
import { loadWorkerConfig, OutboxWorkerRuntime } from './outbox-worker.runtime';
import { createSmsProvider } from './sms.provider.factory';

export function bootstrapWorker(redisUrl: string) {
  const config = loadWorkerConfig({ ...process.env, REDIS_URL: redisUrl });
  const smsProvider = createSmsProvider({
    ...process.env,
    REDIS_URL: redisUrl,
  });
  const prismaService = new PrismaService();

  return new OutboxWorkerRuntime(prismaService, config, smsProvider);
}
