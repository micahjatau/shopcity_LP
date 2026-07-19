import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../../database/prisma.module';
import { ApiHealthIndicator } from './api-health.indicator';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

@Module({
  imports: [ConfigModule, PrismaModule, TerminusModule],
  controllers: [HealthController],
  providers: [ApiHealthIndicator, PrismaHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
