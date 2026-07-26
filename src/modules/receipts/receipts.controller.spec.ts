import { ReceiptsController } from './receipts.controller';

describe('ReceiptsController', () => {
  it('delegates deprecated receipt capture to the canonical earn service', async () => {
    const loyaltyService = {
      earn: jest.fn().mockResolvedValue({
        id: 'receipt-1',
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        customerId: 'customer-1',
        cardSerialNumber: 'CARD-1',
        deviceId: 'device-1',
        posReceiptNumber: 'POS-1',
        purchaseAmountKobo: 10_000,
        occurredAt: '2026-07-26T10:00:00.000Z',
        capturedAt: '2026-07-26T10:01:00.000Z',
        captureStatus: 'CAPTURED',
        reviewStatus: 'APPROVED',
        state: 'CAPTURED',
      }),
    };
    const approvalsService = {};
    const controller = new ReceiptsController(
      loyaltyService as never,
      approvalsService as never,
    );
    const reply = { code: jest.fn() };
    const dto = {
      cardSerialNumber: 'CARD-1',
      posReceiptNumber: 'POS-1',
      purchaseAmountKobo: 10_000,
      occurredAt: '2026-07-26T10:00:00.000Z',
    };
    const request = {
      authContext: {
        user: { tenantId: 'tenant-1' },
      },
    };

    const response = await controller.captureReceipt(
      request as never,
      'idem-1',
      dto,
      reply as never,
    );

    expect(loyaltyService.earn).toHaveBeenCalledWith(
      'tenant-1',
      request.authContext,
      'idem-1',
      dto,
    );
    expect(reply.code).toHaveBeenCalledWith(201);
    expect(response).toMatchObject({
      id: 'receipt-1',
      status: 'CAPTURED',
      reviewStatus: 'APPROVED',
    });
  });
});
