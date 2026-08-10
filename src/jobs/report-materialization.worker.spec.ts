import { runReportMaterializationSweep } from './report-materialization.worker';

describe('runReportMaterializationSweep', () => {
  it('materializes tenants in bounded batches and advances the watermark', async () => {
    type TenantFindManyArgs = {
      where?: { id: { gt: string } };
      orderBy: { id: 'asc' };
      take: number;
      select: { id: true };
    };
    type RebuildTenantArgs = {
      materializedAt?: Date;
      asOf?: Date;
    };

    const findMany = jest
      .fn<Promise<Array<{ id: string }>>, [TenantFindManyArgs]>()
      .mockResolvedValue([{ id: 'tenant-a' }, { id: 'tenant-b' }]);
    const rebuildTenant = jest.fn<Promise<void>, [string, RebuildTenantArgs]>();
    rebuildTenant.mockResolvedValue(undefined);
    const prisma = {
      tenant: {
        findMany,
      },
    };
    const reportMaterializer = {
      rebuildTenant,
    };

    await expect(
      runReportMaterializationSweep(
        prisma as never,
        reportMaterializer as never,
        2,
      ),
    ).resolves.toMatchObject({
      tenantCount: 2,
      watermarkBefore: null,
      watermarkAfter: 'tenant-b',
    });

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
      take: 2,
      select: { id: true },
    });
    const firstCall = findMany.mock.calls[0]?.[0] as
      TenantFindManyArgs | undefined;
    expect(firstCall?.where).toBeUndefined();

    const firstRebuildCall = rebuildTenant.mock.calls[0] as
      [string, RebuildTenantArgs] | undefined;
    const secondRebuildCall = rebuildTenant.mock.calls[1] as
      [string, RebuildTenantArgs] | undefined;

    expect(firstRebuildCall?.[0]).toBe('tenant-a');
    expect(firstRebuildCall?.[1].materializedAt).toBeInstanceOf(Date);
    expect(firstRebuildCall?.[1].asOf).toBeInstanceOf(Date);
    expect(secondRebuildCall?.[0]).toBe('tenant-b');
    expect(secondRebuildCall?.[1].materializedAt).toBeInstanceOf(Date);
    expect(secondRebuildCall?.[1].asOf).toBeInstanceOf(Date);
  });
});
