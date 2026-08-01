import { ApprovalTargetType } from '@prisma/client';
import { expireOverdueApprovals } from './approval-expiry.worker';

describe('expireOverdueApprovals', () => {
  it('expires overdue approvals in a bounded sweep and records an audit event', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'approval-1',
          tenantId: 'tenant-1',
          targetType: ApprovalTargetType.REDEEM,
          receiptId: null,
          redemptionId: 'redemption-1',
          redemptionReceiptId: 'receipt-1',
        },
      ]),
      approval: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      receipt: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      redemption: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      expireOverdueApprovals(prisma as never, auditService as never, 1),
    ).resolves.toBe(1);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    type ApprovalUpdateArgs = {
      where: Record<string, unknown>;
      data: { status: string; decidedAt: Date; decisionReason: string };
    };
    type RedemptionUpdateArgs = {
      where: Record<string, unknown>;
      data: { status: string; rejectedAt: Date };
    };

    const approvalUpdateMany = tx.approval.updateMany as jest.MockedFunction<
      (args: ApprovalUpdateArgs) => Promise<{ count: number }>
    >;
    const redemptionUpdateMany = tx.redemption
      .updateMany as jest.MockedFunction<
      (args: RedemptionUpdateArgs) => Promise<{ count: number }>
    >;

    const approvalUpdateArgs = approvalUpdateMany.mock.calls[0]?.[0];

    expect(approvalUpdateArgs).toMatchObject({
      where: {
        tenantId: 'tenant-1',
        id: 'approval-1',
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
        decisionReason: 'approval expired',
      },
    });

    expect(approvalUpdateArgs.data.decidedAt).toBeInstanceOf(Date);

    const redemptionUpdateArgs = redemptionUpdateMany.mock.calls[0]?.[0];

    expect(redemptionUpdateArgs).toMatchObject({
      where: {
        tenantId: 'tenant-1',
        id: 'redemption-1',
        status: 'PENDING_APPROVAL',
      },
      data: {
        status: 'EXPIRED',
      },
    });
    expect(redemptionUpdateArgs.data.rejectedAt).toBeInstanceOf(Date);
    expect(tx.receipt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          id: 'receipt-1',
        },
      }),
    );
    expect(auditService.recordWithClient).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId: 'tenant-1',
        action: 'approval.expire',
        entityType: 'approval',
        entityId: 'approval-1',
      }),
    );
  });
});
