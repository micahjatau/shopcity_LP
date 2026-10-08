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
      false,
      undefined,
    );
  });

  it('keeps all statuses when no filter is supplied', () => {
    void controller.listApprovals(context, '10', undefined, 'ALL');
    expect(approvalsService.listApprovals).toHaveBeenCalledWith(
      'tenant-1',
      context,
      expect.objectContaining({ limit: 10 }),
      undefined,
      false,
      undefined,
    );
  });

  it('requests an exact count only when explicitly requested', () => {
    void controller.listApprovals(
      context,
      '5',
      undefined,
      'PENDING',
      'true',
      '  Ada  ',
    );
    expect(approvalsService.listApprovals).toHaveBeenCalledWith(
      'tenant-1',
      context,
      expect.objectContaining({ limit: 5 }),
      [ApprovalStatus.PENDING],
      true,
      'Ada',
    );
  });

  it('rejects invalid count flags', () => {
    expect(() =>
      controller.listApprovals(context, '5', undefined, 'PENDING', 'yes'),
    ).toThrow(BadRequestException);
    expect(approvalsService.listApprovals).not.toHaveBeenCalled();
  });

  it('rejects search terms longer than the supported maximum', () => {
    expect(() =>
      controller.listApprovals(
        context,
        '5',
        undefined,
        'PENDING',
        'true',
        'x'.repeat(101),
      ),
    ).toThrow(BadRequestException);
    expect(approvalsService.listApprovals).not.toHaveBeenCalled();
  });

  it('rejects unsupported status filters', () => {
    expect(() =>
      controller.listApprovals(context, '10', undefined, 'UNKNOWN'),
    ).toThrow(BadRequestException);
    expect(approvalsService.listApprovals).not.toHaveBeenCalled();
  });
});
