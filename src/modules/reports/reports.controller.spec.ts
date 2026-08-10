import { UserRole } from '@prisma/client';
import type { FastifyReply } from 'fastify';
import { ReportsController } from './reports.controller';
import { ReportExportService } from './report-export.service';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  it('returns CSV export headers and body', async () => {
    const reportsService = reportsServiceStub();
    const exportService = exportServiceStub();
    const controller = new ReportsController(
      reportsService,
      exportService.service,
    );
    const { reply, type, header } = replyStub();

    const result = await controller.exportReport(
      adminContext(),
      'executive-summary',
      'csv',
      undefined,
      undefined,
      undefined,
      undefined,
      reply,
    );

    expect(result).toBe('scope,scopeKey\nTENANT,tenant-1');
    expect(type).toHaveBeenCalledWith('text/csv; charset=utf-8');
    expect(header).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="executive-summary-tenant-1.csv"',
    );
    expect(exportService.exportCsv).toHaveBeenCalledWith(
      'tenant-1',
      adminContext(),
      'executive-summary',
      expect.objectContaining({ format: 'csv' }),
    );
  });

  it('schedules report refresh', async () => {
    const exportService = exportServiceStub();
    const controller = new ReportsController(
      reportsServiceStub(),
      exportService.service,
    );

    await expect(
      controller.refreshReport(
        adminContext(),
        'executive-summary',
        undefined,
        undefined,
      ),
    ).resolves.toEqual({ status: 'accepted' });
    expect(exportService.refreshReport).toHaveBeenCalledWith(
      'tenant-1',
      adminContext(),
      'executive-summary',
      expect.objectContaining({ branchId: undefined }),
    );
  });
});

function adminContext() {
  return {
    session: {} as never,
    user: {
      id: 'admin-1',
      tenantId: 'tenant-1',
      role: UserRole.ADMIN,
      branchId: null,
    } as never,
  };
}

function reportsServiceStub(): ReportsService {
  return {
    listExecutiveSummary: jest.fn().mockResolvedValue({
      scope: 'TENANT',
      scopeKey: 'tenant-1',
      branchId: null,
      timezone: 'Africa/Lagos',
      items: [],
    }),
    listLiabilityAgeing: jest.fn(),
    listCustomerPerformance: jest.fn(),
    listMaterializationState: jest.fn(),
  } as unknown as ReportsService;
}

function exportServiceStub() {
  const exportCsv = jest.fn().mockResolvedValue({
    filename: 'executive-summary-tenant-1.csv',
    csv: 'scope,scopeKey\nTENANT,tenant-1',
    rowCount: 1,
  });
  const refreshReport = jest.fn().mockResolvedValue(undefined);

  return {
    service: {
      exportCsv,
      refreshReport,
    } as unknown as ReportExportService,
    exportCsv,
    refreshReport,
  };
}

function replyStub(): {
  reply: FastifyReply;
  type: jest.Mock;
  header: jest.Mock;
} {
  const type = jest.fn();
  const header = jest.fn();
  return {
    reply: { type, header } as unknown as FastifyReply,
    type,
    header,
  };
}
