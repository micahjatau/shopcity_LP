export type ClockInput = Date | number | string;

export interface Clock {
  now(): Date;
  nowMs(): number;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  nowMs(): number {
    return Date.now();
  }
}

export class FixedClock implements Clock {
  private currentMs: number;

  constructor(initial: ClockInput) {
    this.currentMs = normalizeClockInput(initial);
  }

  now(): Date {
    return new Date(this.currentMs);
  }

  nowMs(): number {
    return this.currentMs;
  }

  set(now: ClockInput): void {
    this.currentMs = normalizeClockInput(now);
  }

  advanceBy(milliseconds: number): void {
    this.currentMs += milliseconds;
  }
}

function normalizeClockInput(input: ClockInput): number {
  return input instanceof Date ? input.getTime() : new Date(input).getTime();
}
