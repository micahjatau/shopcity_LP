import { UserRole } from '@prisma/client';
import type { FastifyReply } from 'fastify';
import { ReportsController } from './reports.controller';
import { ReportExportService } from './report-export.service';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  it('passes validated cashier page and limit to the report service', async () => {
    const { service, listCashierToday } = reportsServiceStub();
    const controller = new ReportsController(
      service,
      exportServiceStub().service,
    );
    const context = {
      session: {} as never,
      user: {
        id: 'cashier-1',
        tenantId: 'tenant-1',
        role: UserRole.CASHIER,
        branchId: 'branch-1',
      } as never,
    };

    await controller.listCashierToday(context, ' customer-1 ', '3', '5');

    expect(listCashierToday).toHaveBeenCalledWith(
      'tenant-1',
      context,
      'customer-1',
      5,
      3,
    );
  });

  it('returns CSV export headers and body', async () => {
    const reportsService = reportsServiceStub().service;
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

  it('delegates pilot operations summary reads', async () => {
    const { service: reportsService, getPilotOperationsSummary } =
      reportsServiceStub();
    const controller = new ReportsController(
      reportsService,
      exportServiceStub().service,
    );

    await expect(
      controller.getPilotOperationsSummary(adminContext()),
    ).resolves.toMatchObject({
      release: { version: '1.2.3', sha: 'abc123' },
    });
    expect(getPilotOperationsSummary).toHaveBeenCalledWith(
      'tenant-1',
      adminContext(),
    );
  });

  it('schedules a Supervisor branch dashboard refresh', async () => {
    const exportService = exportServiceStub();
    const controller = new ReportsController(
      reportsServiceStub().service,
      exportService.service,
    );
    const context = supervisorContext();

    await expect(
      controller.refreshSupervisorDashboard(context, 'supervisor-key-1'),
    ).resolves.toEqual({ status: 'accepted' });
    expect(exportService.refreshSupervisorDashboard).toHaveBeenCalledWith(
      'tenant-1',
      context,
      'supervisor-key-1',
    );
  });

  it('schedules report refresh', async () => {
    const exportService = exportServiceStub();
    const controller = new ReportsController(
      reportsServiceStub().service,
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
      undefined,
    );
  });
});

function supervisorContext() {
  return {
    session: {} as never,
    user: {
      id: 'supervisor-1',
      tenantId: 'tenant-1',
      role: UserRole.SUPERVISOR,
      branchId: 'branch-1',
    } as never,
  };
}

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

function reportsServiceStub(): {
  service: ReportsService;
  getPilotOperationsSummary: jest.Mock;
  listCashierToday: jest.Mock;
} {
  const listCashierToday = jest.fn().mockResolvedValue({
    branchId: 'branch-1',
    timezone: 'Africa/Lagos',
    monthlyEarnKobo: null,
    page: 1,
    limit: 10,
    totalCount: 0,
    items: [],
  });
  const getPilotOperationsSummary = jest.fn().mockResolvedValue({
    release: { version: '1.2.3', sha: 'abc123', sentryConfigured: true },
    generatedAt: '2026-08-13T00:00:00.000Z',
    outbox: { backlogCount: 1, staleCount: 0 },
    sms: { failedCount: 0 },
    offlineSync: { failureCount: 0 },
    fraud: { openCount: 0 },
    reports: { staleCount: 0 },
    reconciliation: { healthy: true, mismatchCount: 0 },
  });

  return {
    service: {
      listExecutiveSummary: jest.fn().mockResolvedValue({
        scope: 'TENANT',
        scopeKey: 'tenant-1',
        branchId: null,
        timezone: 'Africa/Lagos',
        items: [],
      }),
      getPilotOperationsSummary,
      listCashierToday,
      listLiabilityAgeing: jest.fn(),
      listCustomerPerformance: jest.fn(),
      listMaterializationState: jest.fn(),
    } as unknown as ReportsService,
    getPilotOperationsSummary,
    listCashierToday,
  };
}

function exportServiceStub() {
  const exportCsv = jest.fn().mockResolvedValue({
    filename: 'executive-summary-tenant-1.csv',
    csv: 'scope,scopeKey\nTENANT,tenant-1',
    rowCount: 1,
  });
  const refreshReport = jest.fn().mockResolvedValue(undefined);
  const refreshSupervisorDashboard = jest.fn().mockResolvedValue(undefined);

  return {
    service: {
      exportCsv,
      refreshReport,
      refreshSupervisorDashboard,
    } as unknown as ReportExportService,
    exportCsv,
    refreshReport,
    refreshSupervisorDashboard,
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
