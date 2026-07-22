import { Queue } from 'bullmq';

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
  await queue.add(outboxEvent.eventType, outboxEvent, {
    jobId: outboxEvent.id,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1_000,
    },
  });
}
