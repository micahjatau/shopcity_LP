import { branchDayWindow } from './branch-day-window';

describe('branchDayWindow', () => {
  it('returns the exact Lagos UTC bounds for a local day', () => {
    const { windowStart, windowEnd } = branchDayWindow(
      new Date('2026-08-10T12:00:00.000Z'),
      'Africa/Lagos',
    );

    expect(windowStart.toISOString()).toBe('2026-08-09T23:00:00.000Z');
    expect(windowEnd.toISOString()).toBe('2026-08-10T23:00:00.000Z');
  });

  it('handles DST shifts at the local-day boundary', () => {
    const { windowStart, windowEnd } = branchDayWindow(
      new Date('2026-03-08T12:00:00.000Z'),
      'America/New_York',
    );

    expect(windowStart.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(windowEnd.toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });
});
