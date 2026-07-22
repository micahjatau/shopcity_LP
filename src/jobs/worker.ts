import { createOutboxWorker } from './outbox.worker';
import { PrismaService } from '../database/prisma.service';

export function bootstrapWorker(redisUrl: string) {
  const prismaService = new PrismaService();

  return createOutboxWorker(redisUrl, async (job) => {
    const now = new Date();

    try {
      await prismaService.outboxEvent.update({
        where: { id: job.data.id },
        data: {
          status: 'PUBLISHED',
          attempts: job.attemptsMade + 1,
          publishedAt: now,
          nextAttemptAt: null,
        },
      });
    } catch {
      await prismaService.outboxEvent.update({
        where: { id: job.data.id },
        data: {
          status: 'FAILED',
          attempts: job.attemptsMade + 1,
          nextAttemptAt: null,
        },
      });
      throw new Error('Outbox processing failed');
    }
  });
}
