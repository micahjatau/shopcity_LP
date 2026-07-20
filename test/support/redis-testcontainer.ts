import { createClient } from 'redis';
import { GenericContainer } from 'testcontainers';

export interface RedisTestEnvironment {
  container: { stop(): Promise<unknown> };
  redisUrl: string;
  flushDb(): Promise<void>;
  getKeys(pattern: string): Promise<string[]>;
  close(): Promise<void>;
}

export async function createRedisTestEnvironment(): Promise<RedisTestEnvironment> {
  const container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withCommand(['redis-server', '--save', '', '--appendonly', 'no'])
    .start();

  const redisUrl = `redis://${container.getHost()}:${container.getMappedPort(6379)}`;

  return {
    container,
    redisUrl,
    async flushDb() {
      const client = createClient({ url: redisUrl });
      await client.connect();
      try {
        await client.flushDb();
      } finally {
        await client.quit();
      }
    },
    async getKeys(pattern: string) {
      const client = createClient({ url: redisUrl });
      await client.connect();
      try {
        return await client.keys(pattern);
      } finally {
        await client.quit();
      }
    },
    async close() {
      await container.stop();
    },
  };
}
