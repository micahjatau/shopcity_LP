import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { isValidDeviceTokenHmacKey } from '../../common/auth/device-token';

@Injectable()
export class PosDeviceTokenKeyHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  check(): Promise<HealthIndicatorResult> {
    const required =
      this.configService.get<boolean>('PILOT_CASHIER_DEVICE_TOKEN_ONLY') ===
      true;
    const valid =
      !required ||
      isValidDeviceTokenHmacKey(
        this.configService.get<string>('POS_DEVICE_TOKEN_HMAC_KEY'),
      );

    return Promise.resolve(
      this.getStatus('posDeviceTokenKey', valid, {
        ...(valid
          ? {}
          : { message: 'POS_DEVICE_TOKEN_HMAC_KEY is missing or invalid' }),
      }),
    );
  }
}
