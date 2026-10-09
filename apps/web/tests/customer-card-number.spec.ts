import { resolveCustomerCardNumber } from '../lib/customer-card-number';

describe('resolveCustomerCardNumber', () => {
  it.each([
    ['cardNumber', { cardNumber: 'CARD-1' }],
    ['virtualCardNumber', { virtualCardNumber: 'CARD-2' }],
    ['card serial', { cardSerialNumber: 'CARD-3' }],
    ['legacy active serial', { activeCardSerialNumber: 'CARD-4' }],
    ['card endpoint serial', { serialNumber: 'CARD-5' }],
    ['database barcode', { barcodeValue: 'CARD-6' }],
    ['active card payload', { activeCard: { serialNumber: 'CARD-7' } }],
    [
      'assigned card relation',
      { cards: [{ status: 'ACTIVE', barcodeValue: 'CARD-8' }] },
    ],
  ])('resolves %s to one card number', (_alias, payload) => {
    expect(resolveCustomerCardNumber(payload)).toBe(
      Object.values(payload).flatMap((item) => {
        if (typeof item === 'string') return [item];
        if (item && typeof item === 'object') {
          const nested = item as Record<string, unknown>;
          return [nested.serialNumber, nested.barcodeValue].filter(
            (value): value is string => typeof value === 'string',
          );
        }
        return [];
      })[0],
    );
  });

  it('prefers an active listed card and does not invent a card number', () => {
    expect(
      resolveCustomerCardNumber({
        cards: [
          { status: 'REPLACED', barcodeValue: 'OLD-CARD' },
          { status: 'ACTIVE', barcodeValue: 'CURRENT-CARD' },
        ],
      }),
    ).toBe('CURRENT-CARD');
    expect(resolveCustomerCardNumber({ id: 'customer-id' })).toBeNull();
  });
});
