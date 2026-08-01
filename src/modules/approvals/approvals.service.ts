import { Injectable } from '@nestjs/common';
import { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { CursorPageRequest } from '../../common/pagination/cursor-pagination';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class ApprovalsService {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  listApprovals(
    tenantId: string,
    actor: AuthContext,
    page?: CursorPageRequest,
  ) {
    return this.loyaltyService.listApprovals(tenantId, actor, page);
  }

  async approveReceipt(
    tenantId: string,
    actor: AuthContext,
    receiptId: string,
  ) {
    const approval = await this.loyaltyService.findApprovalByReceiptId(
      tenantId,
      receiptId,
    );

    if (!approval) {
      throw new DomainHttpException(
        409,
        'LEGACY_APPROVAL_BACKFILL_REQUIRED',
        'Legacy receipt requires backfill before approval decisions are accepted',
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
      throw new DomainHttpException(
        409,
        'LEGACY_APPROVAL_BACKFILL_REQUIRED',
        'Legacy receipt requires backfill before approval decisions are accepted',
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
}
