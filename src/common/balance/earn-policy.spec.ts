import { addUtcMonthsClamped, calculateEarnAmountKobo } from './earn-policy';

describe('Earn policy arithmetic', () => {
  it('calculates earned kobo using ceiling integer division', () => {
    expect(calculateEarnAmountKobo(7_000n, 200n)).toBe(140n);
    expect(calculateEarnAmountKobo(1n, 1n)).toBe(1n);
    expect(calculateEarnAmountKobo(0n, 200n)).toBe(0n);
  });

  it('rejects negative financial inputs', () => {
    expect(() => calculateEarnAmountKobo(-1n, 200n)).toThrow(RangeError);
    expect(() => calculateEarnAmountKobo(1n, -1n)).toThrow(RangeError);
  });

  it('clamps UTC month-end and leap-day expiry while preserving time', () => {
    expect(
      addUtcMonthsClamped(
        new Date('2024-01-31T12:34:56.789Z'),
        1,
      ).toISOString(),
    ).toBe('2024-02-29T12:34:56.789Z');
    expect(
      addUtcMonthsClamped(
        new Date('2024-02-29T12:34:56.789Z'),
        12,
      ).toISOString(),
    ).toBe('2025-02-28T12:34:56.789Z');
  });
});
