import {
  PILOT_OPERATIONS_HISTORY_RETENTION_MS,
  runPilotOperationsHistorySweep,
} from './pilot-operations-history.worker';

describe('runPilotOperationsHistorySweep', () => {
  const sampledAt = new Date('2026-11-01T12:34:56.000Z');

  it('samples tenants in bounded sequential batches and prunes expired snapshots', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'tenant-a' }, { id: 'tenant-b' }])
      .mockResolvedValueOnce([{ id: 'tenant-c' }]);
    const deleteMany = jest.fn().mockResolvedValue({ count: 3 });
    const prisma = {
      tenant: { findMany },
      pilotOperationsSnapshot: { deleteMany },
    };
    const recordPilotOperationsSnapshot = jest
      .fn()
      .mockResolvedValue(undefined);

    const result = await runPilotOperationsHistorySweep(
      prisma as never,
      { recordPilotOperationsSnapshot },
      2,
      sampledAt,
    );

    expect(findMany).toHaveBeenNthCalledWith(1, {
      orderBy: { id: 'asc' },
      take: 2,
      select: { id: true },
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { id: { gt: 'tenant-b' } },
      orderBy: { id: 'asc' },
      take: 2,
      select: { id: true },
    });
    expect(recordPilotOperationsSnapshot.mock.calls).toEqual([
      ['tenant-a', sampledAt],
      ['tenant-b', sampledAt],
      ['tenant-c', sampledAt],
    ]);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        capturedAt: {
          lt: new Date(
            sampledAt.getTime() - PILOT_OPERATIONS_HISTORY_RETENTION_MS,
          ),
        },
      },
    });
    expect(result).toMatchObject({
      sampledAt: sampledAt.toISOString(),
      tenantCount: 3,
      capturedCount: 3,
      failureCount: 0,
      deletedCount: 3,
    });
  });

  it('continues after an individual tenant capture failure', async () => {
    const prisma = {
      tenant: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'tenant-a' }, { id: 'tenant-b' }]),
      },
      pilotOperationsSnapshot: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const recordPilotOperationsSnapshot = jest
      .fn()
      .mockRejectedValueOnce(new Error('capture failed'))
      .mockResolvedValueOnce(undefined);

    const result = await runPilotOperationsHistorySweep(
      prisma as never,
      { recordPilotOperationsSnapshot },
      10,
      sampledAt,
    );

    expect(recordPilotOperationsSnapshot).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      tenantCount: 2,
      capturedCount: 1,
      failureCount: 1,
    });
  });
});
