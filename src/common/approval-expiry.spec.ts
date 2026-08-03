import { ApprovalTargetType } from '@prisma/client';
import { expireApproval } from './approval-expiry';

describe('expireApproval', () => {
  it('rolls back when the expected receipt row is missing', async () => {
    const tx = {
      approval: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      receipt: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      redemption: {
        updateMany: jest.fn(),
      },
    };
    const auditWriter = {
      recordWithClient: jest.fn(),
    };

    await expect(
      expireApproval(
        tx as never,
        auditWriter,
        {
          id: 'approval-1',
          tenantId: 'tenant-1',
          targetType: ApprovalTargetType.EARN,
          receiptId: 'receipt-1',
          redemptionId: null,
          redemptionReceiptId: null,
        },
        new Date('2026-08-03T00:00:00.000Z'),
      ),
    ).rejects.toMatchObject({ response: { code: 'APPROVAL_ALREADY_DECIDED' } });
    expect(auditWriter.recordWithClient).not.toHaveBeenCalled();
  });

  it('rolls back when the redemption row already transitioned', async () => {
    const tx = {
      approval: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      receipt: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      redemption: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const auditWriter = {
      recordWithClient: jest.fn(),
    };

    await expect(
      expireApproval(
        tx as never,
        auditWriter,
        {
          id: 'approval-1',
          tenantId: 'tenant-1',
          targetType: ApprovalTargetType.REDEEM,
          receiptId: null,
          redemptionId: 'redemption-1',
          redemptionReceiptId: 'receipt-1',
        },
        new Date('2026-08-03T00:00:00.000Z'),
      ),
    ).rejects.toMatchObject({ response: { code: 'APPROVAL_ALREADY_DECIDED' } });
    expect(auditWriter.recordWithClient).not.toHaveBeenCalled();
  });

  it('records detector metadata while leaving the decision actor null for worker expiry', async () => {
    const tx = {
      approval: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      receipt: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      redemption: {
        updateMany: jest.fn(),
      },
    };
    const auditWriter = {
      recordWithClient: jest.fn().mockResolvedValue(undefined),
    };

    await expireApproval(
      tx as never,
      auditWriter,
      {
        id: 'approval-1',
        tenantId: 'tenant-1',
        targetType: ApprovalTargetType.EARN,
        receiptId: 'receipt-1',
        redemptionId: null,
        redemptionReceiptId: null,
      },
      new Date('2026-08-03T00:00:00.000Z'),
      null,
      { tenantId: 'tenant-1', id: 'approval-expiry-worker' },
    );

    expect(tx.approval.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        id: 'approval-1',
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
        decidedAt: new Date('2026-08-03T00:00:00.000Z'),
        decisionByTenantId: null,
        decisionBy: null,
        decisionReason: 'approval expired',
      },
    });
    expect(auditWriter.recordWithClient).toHaveBeenCalledWith(tx, {
      tenantId: 'tenant-1',
      actorId: null,
      action: 'approval.expire',
      entityType: 'approval',
      entityId: 'approval-1',
      metadata: {
        detectedByTenantId: 'tenant-1',
        detectedBy: 'approval-expiry-worker',
        expiredAt: '2026-08-03T00:00:00.000Z',
        targetType: 'EARN',
        receiptId: 'receipt-1',
        redemptionId: null,
      },
    });
  });

  it('rejects replayed expiry attempts', async () => {
    const tx = {
      approval: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      receipt: {
        updateMany: jest.fn(),
      },
      redemption: {
        updateMany: jest.fn(),
      },
    };
    const auditWriter = {
      recordWithClient: jest.fn(),
    };

    await expect(
      expireApproval(
        tx as never,
        auditWriter,
        {
          id: 'approval-1',
          tenantId: 'tenant-1',
          targetType: ApprovalTargetType.EARN,
          receiptId: 'receipt-1',
          redemptionId: null,
          redemptionReceiptId: null,
        },
        new Date('2026-08-03T00:00:00.000Z'),
      ),
    ).rejects.toMatchObject({ response: { code: 'APPROVAL_ALREADY_DECIDED' } });
    expect(auditWriter.recordWithClient).not.toHaveBeenCalled();
  });
});
