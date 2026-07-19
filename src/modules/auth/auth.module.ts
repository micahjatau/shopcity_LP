import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { SupabaseModule } from '../../supabase/supabase.module';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [PrismaModule, SupabaseModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
