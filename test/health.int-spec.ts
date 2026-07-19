import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { HealthCheckService } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/errors/http-exception.filter';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';
import { ApiHealthIndicator } from '../src/modules/health/api-health.indicator';
import { HealthController } from '../src/modules/health/health.controller';
import { PrismaHealthIndicator } from '../src/modules/health/prisma-health.indicator';
import { RedisHealthIndicator } from '../src/modules/health/redis-health.indicator';

describe('Health readiness (int)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              info: {
                database: { status: 'up' },
                redis: { status: 'up' },
              },
            }),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: { pingCheck: jest.fn() },
        },
        {
          provide: RedisHealthIndicator,
          useValue: { pingCheck: jest.fn() },
        },
        {
          provide: ApiHealthIndicator,
          useValue: { pingCheck: jest.fn() },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 120000);

  afterAll(async () => {
    await app?.close();
  }, 120000);

  it('/health/ready (GET)', async () => {
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          success: boolean;
          data: {
            status: string;
            info: { database: { status: string }; redis: { status: string } };
          };
        };

        expect(body.success).toBe(true);
        expect(body.data.status).toBe('ok');
        expect(body.data.info.database.status).toBe('up');
        expect(body.data.info.redis.status).toBe('up');
      });
  }, 60000);
});
