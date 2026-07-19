import request from 'supertest';
import { createApp } from '../src/bootstrap';

describe('AppController (e2e)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    app = await createApp({ enableDocs: false });
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          success: boolean;
          data: string;
          meta: { path: string; timestamp: string };
        };

        expect(body.success).toBe(true);
        expect(body.data).toBe('ShopCity backend foundation is ready');
        expect(body.meta.path).toBe('/api/v1');
        expect(typeof body.meta.timestamp).toBe('string');
      });
  });

  it('/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          success: boolean;
          data: { status: string };
        };

        expect(body.success).toBe(true);
        expect(body.data.status).toBe('ok');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
