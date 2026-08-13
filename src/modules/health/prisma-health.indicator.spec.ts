import { PrismaHealthIndicator } from './prisma-health.indicator';
import { PrismaService } from '../../database/prisma.service';

describe('PrismaHealthIndicator', () => {
  it('reports postgres readiness when the query succeeds', async () => {
    const queryRawMock = jest.fn().mockResolvedValue([{ one: 1 }]);
    const prismaService = {
      $queryRaw: queryRawMock,
    } as unknown as PrismaService;
    const indicator = new PrismaHealthIndicator(prismaService);

    const result = await indicator.pingCheck('database');

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    expect(result.database.status).toBe('up');
    expect(result.database.database).toBe('postgresql');
  });

  it('reports postgres unavailability when the query fails', async () => {
    const queryRawMock = jest
      .fn()
      .mockRejectedValue(new Error('connect failed'));
    const prismaService = {
      $queryRaw: queryRawMock,
    } as unknown as PrismaService;
    const indicator = new PrismaHealthIndicator(prismaService);

    const result = await indicator.pingCheck('database');

    expect(result.database.status).toBe('down');
    expect(result.database.database).toBe('postgresql');
    expect(result.database.message).toBe('Postgres is unavailable');
    expect(result.database.error).toBe('connect failed');
  });
});
