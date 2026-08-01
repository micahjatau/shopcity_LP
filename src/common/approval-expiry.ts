import {
  ApprovalStatus,
  ApprovalTargetType,
  Prisma,
  RedemptionStatus,
  ReceiptReviewStatus,
} from '@prisma/client';
import { DomainHttpException } from './errors/domain.exception';

export interface ApprovalExpiryRecord {
  id: string;
  tenantId: string;
  targetType: ApprovalTargetType;
  receiptId: string | null;
  redemptionId: string | null;
  redemptionReceiptId: string | null;
}

export interface ApprovalExpiryAuditWriter {
  recordWithClient: (
    tx: Prisma.TransactionClient,
    entry: {
      tenantId: string;
      actorId: string | null;
      action: string;
      entityType: string;
      entityId: string;
      metadata: Record<string, unknown>;
    },
  ) => Promise<void>;
}

export interface ApprovalExpiryActor {
  tenantId: string;
  id: string;
}

export async function expireApproval(
  tx: Prisma.TransactionClient,
  auditWriter: ApprovalExpiryAuditWriter,
  approval: ApprovalExpiryRecord,
  now: Date,
  actor?: ApprovalExpiryActor | null,
): Promise<void> {
  const expired = await tx.approval.updateMany({
    where: {
      tenantId: approval.tenantId,
      id: approval.id,
      status: ApprovalStatus.PENDING,
    },
    data: {
      status: ApprovalStatus.EXPIRED,
      decidedAt: now,
      decisionByTenantId: actor?.tenantId ?? null,
      decisionBy: actor?.id ?? null,
      decisionReason: 'approval expired',
    },
  });

  if (expired.count !== 1) {
    throw new DomainHttpException(
      409,
      'APPROVAL_ALREADY_DECIDED',
      'Approval has already been decided',
    );
  }

  const receiptId = approval.receiptId ?? approval.redemptionReceiptId;

  if (receiptId) {
    await tx.receipt.updateMany({
      where: {
        tenantId: approval.tenantId,
        id: receiptId,
      },
      data: {
        reviewStatus: ReceiptReviewStatus.REJECTED,
        reviewedAt: now,
        reviewedByTenantId: actor?.tenantId ?? null,
        reviewedBy: actor?.id ?? null,
        approvedAt: null,
        approvedByTenantId: null,
        approvedBy: null,
      },
    });
  }

  if (approval.redemptionId) {
    await tx.redemption.updateMany({
      where: {
        tenantId: approval.tenantId,
        id: approval.redemptionId,
        status: RedemptionStatus.PENDING_APPROVAL,
      },
      data: {
        status: RedemptionStatus.EXPIRED,
        rejectedAt: now,
      },
    });
  }

  await auditWriter.recordWithClient(tx, {
    tenantId: approval.tenantId,
    actorId: actor?.id ?? null,
    action: 'approval.expire',
    entityType: 'approval',
    entityId: approval.id,
    metadata: {
      expiredAt: now.toISOString(),
      targetType: approval.targetType,
      receiptId,
      redemptionId: approval.redemptionId,
    },
  });
}
