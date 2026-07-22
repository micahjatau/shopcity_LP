import { Worker, type Job } from 'bullmq';
import { OUTBOX_QUEUE_NAME } from './outbox.publisher';

export interface OutboxJobPayload {
  id: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createOutboxWorker(
  redisUrl: string,
  handler: (job: Job<OutboxJobPayload>) => Promise<void>,
) {
  return new Worker<OutboxJobPayload>(OUTBOX_QUEUE_NAME, handler, {
    connection: { url: redisUrl },
  });
}
