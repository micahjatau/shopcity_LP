import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { OfflineSyncController } from './offline-sync.controller';
import { OfflineSyncService } from './offline-sync.service';

@Module({
  imports: [PrismaModule, LoyaltyModule],
  controllers: [OfflineSyncController],
  providers: [OfflineSyncService],
})
export class OfflineSyncModule {}
