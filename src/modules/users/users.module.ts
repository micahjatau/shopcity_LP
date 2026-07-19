import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { SupabaseModule } from '../../supabase/supabase.module';
import { AuditModule } from '../audit/audit.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, SupabaseModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
