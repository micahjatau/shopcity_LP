import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/auth/auth.constants';
import type { FastifyReply } from 'fastify';
import { ReportsController } from './reports.controller';
import { ReportExportService } from './report-export.service';
import { ReportMaterializerService } from './report-materializer.service';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  it('restricts the Admin Overview metrics endpoint to Admin', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      ReportsController.prototype,
      'getAdminOverviewMetrics',
    );
    expect(descriptor).toBeDefined();
    expect(Reflect.getMetadata(ROLES_KEY, descriptor?.value as object)).toEqual(
      [UserRole.ADMIN],
    );
  });

  it('passes validated cashier page and limit to the report service', async () => {
    const { service, listCashierToday } = reportsServiceStub();
    const controller = new ReportsController(
      service,
      exportServiceStub().service,
      reportMaterializerServiceStub().service,
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
      reportMaterializerServiceStub().service,
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

  it('delegates Admin Overview metric reads using the session tenant', async () => {
    const { service, getAdminOverviewMetrics } = reportsServiceStub();
    const controller = new ReportsController(
      service,
      exportServiceStub().service,
      reportMaterializerServiceStub().service,
    );
    const context = adminContext();

    await expect(controller.getAdminOverviewMetrics(context)).resolves.toEqual({
      activeVirtualCardCount: 4,
    });
    expect(getAdminOverviewMetrics).toHaveBeenCalledWith('tenant-1', context);
  });

  it('delegates pilot operations summary reads', async () => {
    const { service: reportsService, getPilotOperationsSummary } =
      reportsServiceStub();
    const controller = new ReportsController(
      reportsService,
      exportServiceStub().service,
      reportMaterializerServiceStub().service,
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

  it('delegates pilot operations history with session tenant scope', async () => {
    const { service, getPilotOperationsHistory } = reportsServiceStub();
    const controller = new ReportsController(
      service,
      exportServiceStub().service,
      reportMaterializerServiceStub().service,
    );
    const context = adminContext();

    await expect(
      controller.getPilotOperationsHistory(context, '30d'),
    ).resolves.toMatchObject({ window: '30d', items: [] });
    expect(getPilotOperationsHistory).toHaveBeenCalledWith(
      'tenant-1',
      context,
      '30d',
    );
  });

  it('schedules and immediately materializes a Supervisor branch dashboard refresh', async () => {
    const exportService = exportServiceStub();
    const materializer = reportMaterializerServiceStub();
    const controller = new ReportsController(
      reportsServiceStub().service,
      exportService.service,
      materializer.service,
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
    expect(materializer.materializeBranch).toHaveBeenCalledWith(
      'tenant-1',
      'branch-1',
    );
  });

  it('does not repeat immediate materialization for an idempotent replay', async () => {
    const exportService = exportServiceStub();
    exportService.refreshSupervisorDashboard.mockResolvedValue(false);
    const materializer = reportMaterializerServiceStub();
    const controller = new ReportsController(
      reportsServiceStub().service,
      exportService.service,
      materializer.service,
    );

    await controller.refreshSupervisorDashboard(
      supervisorContext(),
      'supervisor-key-1',
    );

    expect(materializer.materializeBranch).not.toHaveBeenCalled();
  });

  it('returns a failure when immediate branch materialization fails', async () => {
    const materializer = reportMaterializerServiceStub();
    materializer.materializeBranch.mockRejectedValue(
      new Error('materialization failed'),
    );
    const controller = new ReportsController(
      reportsServiceStub().service,
      exportServiceStub().service,
      materializer.service,
    );

    await expect(
      controller.refreshSupervisorDashboard(
        supervisorContext(),
        'supervisor-key-1',
      ),
    ).rejects.toThrow('materialization failed');
  });

  it('schedules report refresh', async () => {
    const exportService = exportServiceStub();
    const controller = new ReportsController(
      reportsServiceStub().service,
      exportService.service,
      reportMaterializerServiceStub().service,
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
  getPilotOperationsHistory: jest.Mock;
  listCashierToday: jest.Mock;
  getAdminOverviewMetrics: jest.Mock;
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
  const getAdminOverviewMetrics = jest
    .fn()
    .mockResolvedValue({ activeVirtualCardCount: 4 });
  const getPilotOperationsHistory = jest.fn().mockResolvedValue({
    window: '30d',
    generatedAt: '2026-08-13T00:00:00.000Z',
    items: [],
  });

  return {
    service: {
      getAdminOverviewMetrics,
      listExecutiveSummary: jest.fn().mockResolvedValue({
        scope: 'TENANT',
        scopeKey: 'tenant-1',
        branchId: null,
        timezone: 'Africa/Lagos',
        items: [],
      }),
      getPilotOperationsSummary,
      getPilotOperationsHistory,
      listCashierToday,
      listLiabilityAgeing: jest.fn(),
      listCustomerPerformance: jest.fn(),
      listMaterializationState: jest.fn(),
    } as unknown as ReportsService,
    getPilotOperationsSummary,
    getPilotOperationsHistory,
    listCashierToday,
    getAdminOverviewMetrics,
  };
}

function exportServiceStub() {
  const exportCsv = jest.fn().mockResolvedValue({
    filename: 'executive-summary-tenant-1.csv',
    csv: 'scope,scopeKey\nTENANT,tenant-1',
    rowCount: 1,
  });
  const refreshReport = jest.fn().mockResolvedValue(undefined);
  const refreshSupervisorDashboard = jest.fn().mockResolvedValue(true);

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

function reportMaterializerServiceStub() {
  const materializeBranch = jest.fn().mockResolvedValue(undefined);
  return {
    service: {
      materializeBranch,
    } as unknown as ReportMaterializerService,
    materializeBranch,
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
