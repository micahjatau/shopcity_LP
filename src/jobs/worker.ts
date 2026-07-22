import { createOutboxWorker } from './outbox.worker';

export function bootstrapWorker(redisUrl: string) {
  return createOutboxWorker(redisUrl, async (job) => {
    // The worker stays intentionally thin for now; outbox publication happens
    // by replaying persisted events from PostgreSQL and can be extended later.
    void job;
  });
}
