import { ForbiddenException } from '@nestjs/common';
import { FraudFlagStatus, FraudSeverity, UserRole } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import type { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  FraudReviewService,
  type FraudFlagListItem,
  type FraudListResult,
} from './fraud-review.service';

describe('FraudReviewService', () => {
  it('lists fraud flags within the caller branch scope', async () => {
    const findMany = jest.fn<
      Promise<FraudFlagListItem[]>,
      [Record<string, unknown>]
    >();
    findMany.mockResolvedValue([
      flag({
        id: 'flag-2',
        lastDetectedAt: new Date('2026-08-10T09:00:00.000Z'),
      }),
      flag({
        id: 'flag-1',
        lastDetectedAt: new Date('2026-08-10T10:00:00.000Z'),
      }),
    ]);
    const prisma = prismaStub({ findMany });
    const audit = auditStub();
    const service = new FraudReviewService(prisma, audit.service);

    const result: FraudListResult<FraudFlagListItem> =
      await service.listFraudFlags(
        'tenant-1',
        supervisorContext(),
        { severity: 'HIGH' },
        { limit: 1 },
      );

    const query = findMany.mock.calls[0]?.[0] as {
      take: number;
      where: { tenantId: string; branchId: string; severity: FraudSeverity };
    };

    expect(query.take).toBe(2);
    expect(query.where).toMatchObject({
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      severity: 'HIGH',
    });
    expect(result).toMatchObject({
      scope: 'BRANCH',
      scopeKey: 'branch-1',
      branchId: 'branch-1',
      hasMore: true,
    });
    expect(result.nextCursor).toBeTruthy();
    expect(result.items).toHaveLength(1);
  });

  it('blocks cross-branch fraud detail lookups', async () => {
    const service = new FraudReviewService(
      prismaStub({ findFirst: jest.fn() }),
      auditStub().service,
    );

    await expect(
      service.getFraudFlag(
        'tenant-1',
        supervisorContext(),
        'flag-1',
        'branch-2',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('records fraud decisions idempotently', async () => {
    const update = jest
      .fn()
      .mockResolvedValue(
        flag({ status: 'RESOLVED', decisionReason: 'reviewed' }),
      );
    const audit = auditStub();
    const service = new FraudReviewService(
      prismaStub({
        findFirst: jest
          .fn()
          .mockResolvedValue(flag({ status: 'OPEN', id: 'flag-1' })),
        update,
      }),
      audit.service,
    );

    const updated = await service.decideFraudFlag(
      'tenant-1',
      adminContext(),
      'flag-1',
      'RESOLVED',
      'reviewed',
    );

    expect(updated.status).toBe('RESOLVED');
    expect(update).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'FRAUD_FLAG_DECISION_RECORDED',
      }),
    );
  });

  it('returns existing fraud decisions unchanged when repeated', async () => {
    const update = jest.fn();
    const service = new FraudReviewService(
      prismaStub({
        findFirst: jest
          .fn()
          .mockResolvedValue(flag({ status: 'ACKNOWLEDGED', id: 'flag-1' })),
        update,
      }),
      auditStub().service,
    );

    const result = await service.decideFraudFlag(
      'tenant-1',
      adminContext(),
      'flag-1',
      'ACKNOWLEDGED',
      'same decision',
    );

    expect(result.status).toBe('ACKNOWLEDGED');
    expect(update).not.toHaveBeenCalled();
  });
});

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

function prismaStub(overrides: {
  findMany?: jest.Mock;
  findFirst?: jest.Mock;
  update?: jest.Mock;
}) {
  return {
    branch: {
      findFirst: jest.fn().mockResolvedValue({ id: 'branch-1' }),
    },
    fraudFlag: {
      findMany: overrides.findMany ?? jest.fn(),
      findFirst: overrides.findFirst ?? jest.fn(),
      update: overrides.update ?? jest.fn(),
    },
  } as unknown as PrismaService;
}

function auditStub() {
  const record = jest.fn().mockResolvedValue(undefined);
  return {
    service: { record } as unknown as AuditService,
    record,
  };
}

function flag(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'flag-1',
    tenantId: 'tenant-1',
    ruleCode: 'FR-HV-001',
    severity: 'HIGH' as FraudSeverity,
    status: 'OPEN' as FraudFlagStatus,
    dedupeKey: 'dedupe-1',
    subjectType: 'RECEIPT',
    subjectId: 'receipt-1',
    branchId: 'branch-1',
    cashierId: 'cashier-1',
    customerId: 'customer-1',
    receiptId: 'receipt-1',
    ledgerEntryId: null,
    redemptionId: null,
    windowStart: new Date('2026-08-10T00:00:00.000Z'),
    windowEnd: null,
    firstDetectedAt: new Date('2026-08-10T10:00:00.000Z'),
    lastDetectedAt: new Date('2026-08-10T10:00:00.000Z'),
    occurrenceCount: 1,
    evidence: {},
    decisionReason: null,
    decisionActorId: null,
    decidedAt: null,
    createdAt: new Date('2026-08-10T10:00:00.000Z'),
    updatedAt: new Date('2026-08-10T10:00:00.000Z'),
    ...overrides,
  };
}
