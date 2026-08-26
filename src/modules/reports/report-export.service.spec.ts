import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import type { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReportExportService } from './report-export.service';
import { ReportsService } from './reports.service';

describe('ReportExportService', () => {
  it('exports CSV with spreadsheet-safe escaping and masking', async () => {
    const reports = reportsServiceStub();
    const audit = auditServiceStub();
    const prisma = prismaStub();
    const service = new ReportExportService(
      reports.service,
      audit.service,
      prisma.service,
      configService(),
    );

    const result = await service.exportCsv(
      'tenant-1',
      supervisorContext(),
      'materialization-state',
      { format: 'csv' },
    );

    expect(result.rowCount).toBe(1);
    expect(result.filename).toContain('materialization-state-=TENANT');
    expect(result.csv).toContain("'=TENANT");
    expect(result.csv).toContain('234********78');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REPORT_EXPORTED_CSV',
        entityType: 'REPORT',
        entityId: 'materialization-state',
      }),
    );
  });

  it('rejects non-CSV export formats', async () => {
    const service = new ReportExportService(
      reportsServiceStub().service,
      auditServiceStub().service,
      prismaStub().service,
      configService(),
    );

    await expect(
      service.exportCsv('tenant-1', adminContext(), 'executive-summary', {
        format: 'xlsx',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('schedules admin report refresh durably', async () => {
    const audit = auditServiceStub();
    const prisma = prismaStub();
    const service = new ReportExportService(
      reportsServiceStub().service,
      audit.service,
      prisma.service,
      configService(),
    );

    await service.refreshReport(
      'tenant-1',
      adminContext(),
      'executive-summary',
      {},
      'report-key-1',
    );

    const refreshEventData: Record<string, unknown> = {
      tenantId: 'tenant-1',
      aggregateType: 'report',
      aggregateId: 'executive-summary',
      eventType: 'report.refresh',
    };

    const outboxEventCreateArgs = prisma.outboxEventCreate.mock.calls[0]?.[0];

    expect(outboxEventCreateArgs.data).toMatchObject(refreshEventData);
    expect(
      (audit.record.mock.calls[0]?.[0] as { action?: string }).action,
    ).toBe('REPORT_REFRESH_REQUESTED');
  });

  it('rejects non-admin refresh requests', async () => {
    const service = new ReportExportService(
      reportsServiceStub().service,
      auditServiceStub().service,
      prismaStub().service,
      configService(),
    );

    await expect(
      service.refreshReport(
        'tenant-1',
        supervisorContext(),
        'executive-summary',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function configService(): ConfigService {
  return {
    get: (key: string) => {
      if (key === 'REPORT_EXPORT_MAX_ROWS') {
        return 5000;
      }
      if (key === 'REPORT_EXPORT_RATE_LIMIT_PER_MINUTE') {
        return 10;
      }
      return undefined;
    },
  } as unknown as ConfigService;
}

function adminContext(): AuthContext {
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

function supervisorContext(): AuthContext {
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

function reportsServiceStub() {
  const listExecutiveSummary = jest.fn<Promise<ReportCollection>, []>();
  listExecutiveSummary.mockResolvedValue(reportCollection());
  const listLiabilityAgeing = jest.fn<Promise<never[]>, []>();
  listLiabilityAgeing.mockResolvedValue([]);
  const listCustomerPerformance = jest.fn<Promise<never[]>, []>();
  listCustomerPerformance.mockResolvedValue([]);
  const listMaterializationState = jest.fn<Promise<ReportCollection>, []>();
  listMaterializationState.mockResolvedValue(materializationStateCollection());

  return {
    service: {
      listExecutiveSummary,
      listLiabilityAgeing,
      listCustomerPerformance,
      listMaterializationState,
    } as unknown as ReportsService,
    listExecutiveSummary,
    listLiabilityAgeing,
    listCustomerPerformance,
    listMaterializationState,
  };
}

function auditServiceStub() {
  const record = jest.fn<Promise<void>, [{ [key: string]: unknown }]>();
  record.mockResolvedValue(undefined);

  return {
    service: {
      record,
    } as unknown as AuditService,
    record,
  };
}

function prismaStub() {
  const outboxEventCreate = jest.fn<
    Promise<unknown>,
    [{ [key: string]: unknown }]
  >();
  outboxEventCreate.mockResolvedValue({});
  const idempotencyRecord = {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
  };

  return {
    service: {
      idempotencyRecord,
      outboxEvent: {
        create: outboxEventCreate,
      },
    } as unknown as PrismaService,
    outboxEventCreate,
  };
}

type ReportCollection = {
  scope: string;
  scopeKey: string;
  branchId: string | null;
  timezone: string;
  items: Array<Record<string, unknown>>;
};

function reportCollection() {
  return {
    scope: 'TENANT',
    scopeKey: 'tenant-1',
    branchId: null,
    timezone: 'Africa/Lagos',
    items: [],
  };
}

function materializationStateCollection() {
  return {
    scope: 'TENANT',
    scopeKey: '=TENANT',
    branchId: null,
    timezone: 'Africa/Lagos',
    items: [
      {
        scope: 'TENANT',
        scopeKey: '=TENANT',
        branchId: null,
        asOf: new Date('2026-08-10T00:00:00.000Z'),
        status: 'FAILED',
        lastError: '+2348012345678',
        materializedAt: new Date('2026-08-10T12:00:00.000Z'),
        updatedAt: new Date('2026-08-10T12:00:00.000Z'),
      },
    ],
  };
}
