import { Injectable } from '@nestjs/common';

interface ThrottleBucketState {
  count: number;
  expiresAt: number;
}

@Injectable()
export class RequestThrottleService {
  private readonly buckets = new Map<string, ThrottleBucketState>();

  consume(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.expiresAt <= now) {
      const expiresAt = now + windowMs;
      this.buckets.set(key, { count: 1, expiresAt });
      return {
        allowed: true,
        count: 1,
        remaining: Math.max(0, limit - 1),
        resetAt: new Date(expiresAt),
      };
    }

    const nextCount = current.count + 1;
    current.count = nextCount;
    this.buckets.set(key, current);

    return {
      allowed: nextCount <= limit,
      count: nextCount,
      remaining: Math.max(0, limit - nextCount),
      resetAt: new Date(current.expiresAt),
    };
  }

  reset(): void {
    this.buckets.clear();
  }
}
