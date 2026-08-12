import './config/load-env';

import {
  INestApplication,
  RequestMethod,
  VersioningType,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { initializeSentryIfConfigured } from './common/observability/sentry';
import {
  API_PREFIX,
  API_VERSION,
  DEFAULT_CORS_ORIGIN_ALLOWLIST,
  parseCsvList,
} from './config/app.constants';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { createValidationPipe } from './common/pipes/validation.pipe';

export interface CreateAppOptions {
  enableDocs?: boolean;
  enableShutdownHooks?: boolean;
}

export async function createApp(
  options: CreateAppOptions = {},
): Promise<NestFastifyApplication> {
  const app = await createNestApp(options);

  if (shouldEnableDocs(options)) {
    registerOpenApi(app);
  }

  return app;
}

export function buildOpenApiDocument(app: INestApplication) {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('ShopCity Loyalty Platform')
      .setDescription('ShopCity backend API')
      .setVersion('1.0.0')
      .addTag('system')
      .addTag('health')
      .addTag('auth')
      .addTag('users')
      .addTag('branches')
      .addTag('customers')
      .addTag('cards')
      .addTag('receipts')
      .addTag('transactions')
      .addTag('offline-sync')
      .addTag('reports')
      .addTag('fraud')
      .addTag('adjustments')
      .addTag('approvals')
      .addTag('audit')
      .addTag('configuration')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'opaque-session',
      })
      .build(),
  );

  document.servers = [{ url: '/' }];

  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const method of [
      'get',
      'put',
      'post',
      'delete',
      'options',
      'head',
      'patch',
      'trace',
    ] as const) {
      const operation = pathItem?.[method];
      if (!operation) {
        continue;
      }

      if (!operation.description?.trim()) {
        operation.description =
          operation.summary?.trim() || 'ShopCity API operation';
      }
    }
  }

  return document;
}

async function createNestApp(
  options: CreateAppOptions,
): Promise<NestFastifyApplication> {
  initializeSentryIfConfigured(process.env, { runtime: 'api' });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  const helmetPlugin = helmet as Parameters<
    NestFastifyApplication['register']
  >[0];

  await app.register(helmetPlugin, {
    global: true,
  });

  const originAllowlist = parseCsvList(process.env.CORS_ORIGIN_ALLOWLIST);
  const allowedOrigins =
    originAllowlist.length > 0
      ? originAllowlist
      : DEFAULT_CORS_ORIGIN_ALLOWLIST;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  if (options.enableShutdownHooks) {
    app.enableShutdownHooks();
  }

  await app.init();

  return app;
}

function registerOpenApi(app: NestFastifyApplication): void {
  const document = buildOpenApiDocument(app);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

function shouldEnableDocs(options: CreateAppOptions): boolean {
  if (options.enableDocs !== undefined) {
    return options.enableDocs;
  }

  if (process.env.NODE_ENV === 'production') {
    return process.env.SWAGGER_ENABLED === 'true';
  }

  return true;
}
