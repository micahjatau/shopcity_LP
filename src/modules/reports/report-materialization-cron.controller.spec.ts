import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReportMaterializerService } from './report-materializer.service';
import { ReportMaterializationCronController } from './report-materialization-cron.controller';

describe('ReportMaterializationCronController', () => {
  const secret = 'cron-secret-for-test';
  let controller: ReportMaterializationCronController;
  let findMany: jest.Mock;
  let rebuildTenant: jest.Mock;
  let getConfig: jest.Mock;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([{ id: 'tenant-a' }]);
    rebuildTenant = jest.fn().mockResolvedValue(undefined);
    getConfig = jest.fn().mockReturnValue(secret);
    controller = new ReportMaterializationCronController(
      { get: getConfig } as unknown as ConfigService,
      { tenant: { findMany } } as unknown as PrismaService,
      { rebuildTenant } as unknown as ReportMaterializerService,
    );
  });

  it('runs the bounded report sweep with a valid bearer secret', async () => {
    await expect(controller.run(`Bearer ${secret}`)).resolves.toMatchObject({
      success: true,
      tenantCount: 1,
    });

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
      take: 10,
      select: { id: true },
    });
    expect(rebuildTenant).toHaveBeenCalledWith('tenant-a', expect.any(Object));
  });

  it.each([undefined, 'Bearer wrong-secret', secret])(
    'rejects an absent or invalid bearer header (%s)',
    async (authorization) => {
      await expect(controller.run(authorization)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(findMany).not.toHaveBeenCalled();
      expect(rebuildTenant).not.toHaveBeenCalled();
    },
  );

  it('fails closed when CRON_SECRET is not configured', async () => {
    getConfig.mockReturnValue('  ');

    await expect(controller.run(`Bearer ${secret}`)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns a server error when a tenant materialization fails', async () => {
    rebuildTenant.mockRejectedValue(new Error('private database details'));

    await expect(controller.run(`Bearer ${secret}`)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
