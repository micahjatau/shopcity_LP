import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReceiptReviewStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthContext } from '../../common/auth/session.types';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  listApprovals(tenantId: string) {
    return this.loyaltyService.listApprovals(tenantId);
  }

  async approveReceipt(tenantId: string, actor: AuthContext, receiptId: string) {
    const approval = await this.loyaltyService.findApprovalByReceiptId(
      tenantId,
      receiptId,
    );

    if (!approval) {
      return this.reviewLegacyReceipt(
        tenantId,
        actor,
        receiptId,
        'APPROVED',
      );
    }

    return this.loyaltyService.decideApproval(
      tenantId,
      actor,
      approval.id,
      'APPROVED',
      'legacy receipt approval',
    );
  }

  async rejectReceipt(tenantId: string, actor: AuthContext, receiptId: string) {
    const approval = await this.loyaltyService.findApprovalByReceiptId(
      tenantId,
      receiptId,
    );

    if (!approval) {
      return this.reviewLegacyReceipt(
        tenantId,
        actor,
        receiptId,
        'REJECTED',
      );
    }

    return this.loyaltyService.decideApproval(
      tenantId,
      actor,
      approval.id,
      'REJECTED',
      'legacy receipt rejection',
    );
  }

  decideApproval(
    tenantId: string,
    actor: AuthContext,
    approvalId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason: string,
  ) {
    return this.loyaltyService.decideApproval(
      tenantId,
      actor,
      approvalId,
      decision,
      reason,
    );
  }

  private async reviewLegacyReceipt(
    tenantId: string,
    actor: AuthContext,
    receiptId: string,
    reviewStatus: 'APPROVED' | 'REJECTED',
  ) {
    return this.prismaService.$transaction(async (prisma) => {
      const receipt = await prisma.receipt.findFirst({
        where: { tenantId, id: receiptId },
      });

      if (!receipt) {
        throw new NotFoundException('Receipt not found');
      }

      if (receipt.captureStatus !== 'PENDING_APPROVAL') {
        throw new BadRequestException('Receipt does not require review');
      }

      if (receipt.reviewStatus !== ReceiptReviewStatus.PENDING) {
        throw new ConflictException('Receipt has already been reviewed');
      }

      if (
        receipt.capturedByTenantId === actor.user.tenantId &&
        receipt.capturedBy === actor.user.id
      ) {
        throw new BadRequestException(
          'Capturing cashier cannot review the same receipt',
        );
      }

      const now = new Date();
      const updated = await prisma.receipt.updateMany({
        where: {
          tenantId,
          id: receiptId,
          captureStatus: 'PENDING_APPROVAL',
          reviewStatus: ReceiptReviewStatus.PENDING,
        },
        data: {
          reviewStatus,
          reviewedAt: now,
          reviewedByTenantId: actor.user.tenantId,
          reviewedBy: actor.user.id,
          approvedAt: reviewStatus === 'APPROVED' ? now : null,
          approvedByTenantId:
            reviewStatus === 'APPROVED' ? actor.user.tenantId : null,
          approvedBy: reviewStatus === 'APPROVED' ? actor.user.id : null,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException('Receipt has already been reviewed');
      }

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action:
          reviewStatus === 'APPROVED' ? 'receipt.approve' : 'receipt.reject',
        entityType: 'receipt',
        entityId: receiptId,
        metadata: { reviewStatus, reviewedAt: now },
      });

      return {
        id: receiptId,
        reviewStatus,
        reviewedAt: now.toISOString(),
      };
    });
  }
}
