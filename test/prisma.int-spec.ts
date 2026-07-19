import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

interface StartedPostgresContainer {
  getConnectionUri(): string;
  stop(): Promise<unknown>;
}

describe('Prisma + PostgreSQL', () => {
  let container: StartedPostgresContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: container.getConnectionUri(),
        },
      },
    });

    await prisma.$connect();
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  }, 120000);

  it('executes a basic query', async () => {
    const rows = await prisma.$queryRaw<
      { one: number }[]
    >`SELECT 1::int AS one`;
    expect(rows[0].one).toBe(1);
  });
});
