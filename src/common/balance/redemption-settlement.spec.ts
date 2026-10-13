import {
  LedgerEntryDirection,
  LedgerEntryType,
  SmsMessageStatus,
} from '@prisma/client';
import {
  executeRedemptionSettlement,
  type RedemptionSettlementInput,
} from './redemption-settlement';

function settlementFixture(overrides: Partial<RedemptionSettlementInput> = {}) {
  const order: string[] = [];
  type LedgerCreateArgs = {
    data: {
      type: LedgerEntryType;
      direction: LedgerEntryDirection;
      [key: string]: unknown;
    };
  };
  const ledgerCreate = jest
    .fn<Promise<{ id: string }>, [LedgerCreateArgs]>()
    .mockImplementationOnce(() => {
      order.push('ledger:REDEEM');
      return Promise.resolve({ id: 'redeem-ledger-1' });
    })
    .mockImplementationOnce(() => {
      order.push('ledger:EARN');
      return Promise.resolve({ id: 'earn-ledger-1' });
    });
  const redemptionUpdate = jest.fn(() => {
    order.push('redemption:update');
    return Promise.resolve({});
  });
  const creditLotCreate = jest.fn(() => {
    order.push('lot:create');
    return Promise.resolve({});
  });
  const outboxCreate = jest.fn(() => {
    order.push('outbox:create');
    return Promise.resolve({ id: 'outbox-1' });
  });
  const smsCreate = jest.fn(() => {
    order.push('sms:create');
    return Promise.resolve({ status: SmsMessageStatus.QUEUED });
  });
  const allocateDebit = jest.fn(() => {
    order.push('allocate:prior-lots');
    return Promise.resolve([
      {
        creditLotId: 'prior-lot-1',
        amountKobo: 1_000n,
        allocationOrder: 1,
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      },
    ]);
  });
  const getActiveBalanceKobo = jest.fn(() => {
    order.push('balance:closing');
    return Promise.resolve(19_980n);
  });
  const tx = {
    loyaltyLedgerEntry: { create: ledgerCreate },
    redemption: { update: redemptionUpdate },
    creditLot: { create: creditLotCreate },
    outboxEvent: { create: outboxCreate },
    smsMessage: { create: smsCreate },
  } as never;
  const input: RedemptionSettlementInput = {
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    receiptId: 'receipt-1',
    redemptionId: 'redemption-1',
    basketAmountKobo: 50_000n,
    redeemedAmountKobo: 1_000n,
    occurredAt: new Date('2026-10-13T10:00:00.000Z'),
    now: new Date('2026-10-13T10:01:00.000Z'),
    actorTenantId: 'tenant-1',
    actorId: 'cashier-1',
    correlationId: 'request-1',
    phoneE164: '+2348000000000',
    earnRateBps: 200n,
    ...overrides,
  };

  return {
    result: executeRedemptionSettlement(
      tx,
      {
        activeBalanceService: { getActiveBalanceKobo } as never,
        lotAllocationService: { allocateDebit } as never,
      },
      input,
    ),
    order,
    ledgerCreate,
    redemptionUpdate,
    creditLotCreate,
    outboxCreate,
    smsCreate,
    allocateDebit,
    getActiveBalanceKobo,
  };
}

describe('executeRedemptionSettlement', () => {
  it('allocates prior credit before earning on net paid and emits one SMS', async () => {
    const fixture = settlementFixture();

    const result = await fixture.result;

    expect(result).toMatchObject({
      redemptionLedgerEntryId: 'redeem-ledger-1',
      earnLedgerEntryId: 'earn-ledger-1',
      earnedKobo: 980n,
      netPaidAmountKobo: 49_000n,
      remainingBalanceKobo: 19_980n,
      smsStatus: SmsMessageStatus.QUEUED,
    });
    expect(
      fixture.ledgerCreate.mock.calls.map(([call]) => call.data.type),
    ).toEqual([LedgerEntryType.REDEEM, LedgerEntryType.EARN]);
    expect(fixture.ledgerCreate.mock.calls[0][0].data.direction).toBe(
      LedgerEntryDirection.DEBIT,
    );
    expect(fixture.ledgerCreate.mock.calls[1][0].data.direction).toBe(
      LedgerEntryDirection.CREDIT,
    );
    expect(fixture.order).toEqual([
      'ledger:REDEEM',
      'redemption:update',
      'allocate:prior-lots',
      'ledger:EARN',
      'lot:create',
      'balance:closing',
      'outbox:create',
      'sms:create',
    ]);
    expect(fixture.creditLotCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        earnLedgerEntryId: 'earn-ledger-1',
        originalAmountKobo: 980n,
        remainingAmountKobo: 980n,
      }) as Record<string, unknown>,
    });
    expect(fixture.outboxCreate).toHaveBeenCalledTimes(1);
    expect(fixture.smsCreate).toHaveBeenCalledTimes(1);
  });

  it('does not create an Earn entry or credit lot when net paid rounds to zero', async () => {
    const fixture = settlementFixture({
      basketAmountKobo: 1_000n,
      redeemedAmountKobo: 1_000n,
      earnRateBps: 200n,
    });

    const result = await fixture.result;

    expect(result).toMatchObject({
      earnLedgerEntryId: null,
      earnedKobo: 0n,
      netPaidAmountKobo: 0n,
    });
    expect(fixture.ledgerCreate).toHaveBeenCalledTimes(1);
    expect(fixture.creditLotCreate).not.toHaveBeenCalled();
    expect(fixture.smsCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects negative amounts and redemption above the basket before ledger writes', async () => {
    const negative = settlementFixture({ redeemedAmountKobo: -1n });
    await expect(negative.result).rejects.toThrow('cannot be negative');
    expect(negative.ledgerCreate).not.toHaveBeenCalled();

    const overBasket = settlementFixture({ redeemedAmountKobo: 50_001n });
    await expect(overBasket.result).rejects.toThrow(
      'cannot exceed the basket amount',
    );
    expect(overBasket.ledgerCreate).not.toHaveBeenCalled();
  });

  it('fails closed if prior lots do not fully fund the debit', async () => {
    const fixture = settlementFixture();
    fixture.allocateDebit.mockResolvedValueOnce([]);

    await expect(fixture.result).rejects.toThrow(
      'allocations do not match the debit amount',
    );
    expect(fixture.ledgerCreate).toHaveBeenCalledTimes(1);
    expect(fixture.creditLotCreate).not.toHaveBeenCalled();
    expect(fixture.smsCreate).not.toHaveBeenCalled();
  });
});
