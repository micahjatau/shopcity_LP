import { FixedClock, SystemClock } from './clock';

describe('clock', () => {
  it('keeps a fixed instant stable and advanceable', () => {
    const clock = new FixedClock('2026-07-29T12:00:00.000Z');

    expect(clock.now().toISOString()).toBe('2026-07-29T12:00:00.000Z');
    expect(clock.nowMs()).toBe(Date.parse('2026-07-29T12:00:00.000Z'));

    clock.advanceBy(60_000);

    expect(clock.now().toISOString()).toBe('2026-07-29T12:01:00.000Z');

    clock.set(new Date('2026-07-29T13:00:00.000Z'));

    expect(clock.nowMs()).toBe(Date.parse('2026-07-29T13:00:00.000Z'));
  });

  it('reads the system time at call time', () => {
    const clock = new SystemClock();

    expect(clock.nowMs()).toBeGreaterThan(0);
  });
});
