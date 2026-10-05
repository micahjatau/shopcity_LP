import { BadRequestException } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { ApprovalsController } from './approvals.controller';

describe('ApprovalsController.listApprovals', () => {
  const approvalsService = { listApprovals: jest.fn() };
  const controller = new ApprovalsController(approvalsService as never);
  const context = { user: { tenantId: 'tenant-1' } } as never;

  beforeEach(() => jest.clearAllMocks());

  it('filters approved history to approved and executed records', () => {
    void controller.listApprovals(context, '10', undefined, 'APPROVED');
    expect(approvalsService.listApprovals).toHaveBeenCalledWith(
      'tenant-1',
      context,
      expect.objectContaining({ limit: 10 }),
      [ApprovalStatus.APPROVED, ApprovalStatus.EXECUTED],
    );
  });

  it('keeps all statuses when no filter is supplied', () => {
    void controller.listApprovals(context, '10', undefined, 'ALL');
    expect(approvalsService.listApprovals).toHaveBeenCalledWith(
      'tenant-1',
      context,
      expect.objectContaining({ limit: 10 }),
      undefined,
    );
  });

  it('rejects unsupported status filters', () => {
    expect(() =>
      controller.listApprovals(context, '10', undefined, 'UNKNOWN'),
    ).toThrow(BadRequestException);
    expect(approvalsService.listApprovals).not.toHaveBeenCalled();
  });
});
