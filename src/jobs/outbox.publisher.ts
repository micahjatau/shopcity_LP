import { Queue } from 'bullmq';
import { OUTBOX_RETRY_ATTEMPTS } from './outbox.constants';

export const OUTBOX_QUEUE_NAME = 'outbox';

export function createOutboxQueue(redisUrl: string): Queue {
  return new Queue(OUTBOX_QUEUE_NAME, {
    connection: { url: redisUrl },
  });
}

export async function publishOutboxEvent(
  queue: Queue,
  outboxEvent: {
    id: string;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: unknown;
  },
): Promise<void> {
  const existingJob = await queue.getJob(outboxEvent.id);

  if (existingJob) {
    const state = await existingJob.getState();

    if (state !== 'active') {
      await existingJob.remove();
    }
  }

  await queue.add(outboxEvent.eventType, outboxEvent, {
    jobId: outboxEvent.id,
    attempts: OUTBOX_RETRY_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: 1_000,
    },
    removeOnComplete: true,
    removeOnFail: true,
  });
}
