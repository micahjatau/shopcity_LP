import { saveOfflineEarnRecord } from '../lib/browser/offline-earn-queue';

describe('offline earn persistence', () => {
  it('rejects records without backend device and branch context', async () => {
    const result = await saveOfflineEarnRecord({
      localId: 'local-1',
      idempotencyKey: 'idem-1',
      cashierId: 'cashier-1',
      branchId: '',
      deviceId: '',
      cardBarcode: 'CARD-001',
      receiptNumber: 'R-001',
      receiptWeekStart: '2026-08-17',
      purchaseAmountKobo: 1000,
      occurredAtLocal: '2026-08-22T12:00:00.000Z',
      syncState: 'waiting-to-sync',
    });

    expect(result).toEqual({
      ok: false,
      error: 'Device and branch context are required for offline records',
    });
  });
});
