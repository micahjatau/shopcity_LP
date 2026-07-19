import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class ApiHealthIndicator extends HealthIndicator {
  pingCheck(key: string): Promise<HealthIndicatorResult> {
    return Promise.resolve(
      this.getStatus(key, true, {
        uptimeSeconds: Number(process.uptime().toFixed(0)),
      }),
    );
  }
}
