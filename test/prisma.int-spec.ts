/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

describe('Prisma + PostgreSQL', () => {
  let container: PostgreSqlContainer;
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
    const rows = await prisma.$queryRawUnsafe<Array<{ one: number }>>(
      'SELECT 1::int AS one',
    );
    expect(Number(rows[0].one)).toBe(1);
  });
});
