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
import { AuditModule } from './modules/audit/audit.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { APP_GUARD } from '@nestjs/core';
import { SessionGuard } from './common/auth/session.guard';
import { CsrfGuard } from './common/auth/csrf.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { RequestThrottleGuard } from './common/throttle/request-throttle.guard';
import { RequestThrottleService } from './common/throttle/request-throttle.service';

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
        transport:
          process.env.NODE_ENV !== 'production'
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
    HealthModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    CustomersModule,
    CardsModule,
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
