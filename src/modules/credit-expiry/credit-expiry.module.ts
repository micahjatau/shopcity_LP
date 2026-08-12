import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CreditExpiryService } from './credit-expiry.service';
import { SystemActorService } from '../../common/system/system-actor.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [CreditExpiryService, SystemActorService],
  exports: [CreditExpiryService],
})
export class CreditExpiryModule {}
