import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CreditExpiryService } from './credit-expiry.service';
import { ExpiryReminderService } from './expiry-reminder.service';
import { SystemActorService } from '../../common/system/system-actor.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [CreditExpiryService, ExpiryReminderService, SystemActorService],
  exports: [CreditExpiryService, ExpiryReminderService],
})
export class CreditExpiryModule {}
