import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';

interface StartedPostgresContainer {
  getConnectionUri(): string;
  stop(): Promise<unknown>;
}

interface StartedRedisContainer {
  getHost(): string;
  getMappedPort(port: number): number;
  stop(): Promise<unknown>;
}

describe('Health readiness (int)', () => {
  let postgres: StartedPostgresContainer;
  let redis: StartedRedisContainer;
  let app: Awaited<ReturnType<typeof import('../src/bootstrap').createApp>>;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine').start();
    redis = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    process.env.DATABASE_URL = postgres.getConnectionUri();
    process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
    const { createApp } = require('../src/bootstrap') as typeof import('../src/bootstrap');
    app = await createApp({ enableDocs: false });
    await app.getHttpAdapter().getInstance().ready();
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await redis?.stop();
    await postgres?.stop();
  }, 120000);

  it('/health/ready (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          success: boolean;
          data: {
            status: string;
            info: { database: { status: string }; redis: { status: string } };
          };
        };

        expect(body.success).toBe(true);
        expect(body.data.status).toBe('ok');
        expect(body.data.info.database.status).toBe('up');
        expect(body.data.info.redis.status).toBe('up');
      });
  });
});
