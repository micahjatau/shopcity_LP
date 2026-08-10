import { ConfigService } from '@nestjs/config';

export interface OfflineSyncPolicy {
  maxRecords: number;
  maxRecordAgeHours: number;
}

export const DEFAULT_OFFLINE_SYNC_MAX_RECORDS = 100;
export const DEFAULT_OFFLINE_EARN_MAX_AGE_HOURS = 72;

export function getOfflineSyncPolicy(
  configService: ConfigService,
): OfflineSyncPolicy {
  return {
    maxRecords:
      configService.get<number>('OFFLINE_SYNC_MAX_RECORDS') ??
      DEFAULT_OFFLINE_SYNC_MAX_RECORDS,
    maxRecordAgeHours:
      configService.get<number>('OFFLINE_EARN_MAX_AGE_HOURS') ??
      DEFAULT_OFFLINE_EARN_MAX_AGE_HOURS,
  };
}
