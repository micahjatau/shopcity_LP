import {
  formatBasisPointsAsPercent,
  parsePercentAsBasisPoints,
} from './policy-money';

describe('policy earn-rate presentation', () => {
  it.each([
    [0, '0.00'],
    [1, '0.01'],
    [200, '2.00'],
    [10000, '100.00'],
  ])('round-trips %i BPS as %s percent', (bps, percent) => {
    expect(formatBasisPointsAsPercent(bps)).toBe(percent);
    expect(parsePercentAsBasisPoints(percent)).toBe(bps);
  });

  it.each(['-0.01', '100.01', '1.001', '1e2', ''])(
    'rejects invalid percent %s',
    (percent) => {
      expect(parsePercentAsBasisPoints(percent)).toBeNull();
    },
  );
});
