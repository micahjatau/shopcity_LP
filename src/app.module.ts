import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CardsModule } from './modules/cards/cards.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AuditModule } from './modules/audit/audit.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { RedisModule } from './common/redis/redis.module';
import { APP_GUARD } from '@nestjs/core';
import { SessionGuard } from './common/auth/session.guard';
import { CsrfGuard } from './common/auth/csrf.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { RequestThrottleGuard } from './common/throttle/request-throttle.guard';
import { RequestThrottleService } from './common/throttle/request-throttle.service';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { RedemptionsModule } from './modules/redemptions/redemptions.module';
import { ReversalsModule } from './modules/reversals/reversals.module';
import { AdjustmentsModule } from './modules/adjustments/adjustments.module';
import { OfflineSyncModule } from './modules/offline-sync/offline-sync.module';
import { ReportsModule } from './modules/reports/reports.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { CreditExpiryModule } from './modules/credit-expiry/credit-expiry.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        base: {
          service: 'shopcity-api',
          releaseSha: process.env.RELEASE_SHA ?? 'dev',
          releaseVersion: process.env.RELEASE_VERSION ?? '0.0.0-dev',
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-csrf-token"]',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.token',
            'req.body.refreshToken',
            'req.body.accessToken',
            'res.headers["set-cookie"]',
          ],
          remove: true,
        },
        transport:
          process.env.LOG_PRETTY === 'true'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    CustomersModule,
    CardsModule,
    ReceiptsModule,
    LoyaltyModule,
    RedemptionsModule,
    ReversalsModule,
    AdjustmentsModule,
    OfflineSyncModule,
    FraudModule,
    CreditExpiryModule,
    ReportsModule,
    ApprovalsModule,
    AuditModule,
    ConfigurationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RequestThrottleGuard,
    },
    RequestThrottleService,
  ],
})
export class AppModule {}
