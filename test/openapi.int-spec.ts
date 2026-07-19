import { createApp, buildOpenApiDocument } from '../src/bootstrap';

describe('OpenAPI contract (int)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp({ enableDocs: false });
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not double-prefix versioned routes', () => {
    const document = buildOpenApiDocument(app);

    expect(document.servers).toBeUndefined();
    expect(document.paths['/api/v1']).toBeDefined();
    expect(document.paths['/api/v1/auth/login']).toBeDefined();
  });

  it('documents the response envelope', () => {
    const document = buildOpenApiDocument(app);
    const response = document.paths['/api/v1']?.get?.responses?.['200'] as {
      content?: {
        ['application/json']?: {
          schema?: {
            properties?: {
              meta?: { properties?: { requestId?: unknown } };
              success?: { example?: boolean };
            };
          };
        };
      };
    };
    const schema = response?.content?.['application/json']?.schema;

    expect(schema).toBeDefined();
    expect(schema?.properties?.meta?.properties?.requestId).toBeDefined();
    expect(schema?.properties?.success?.example).toBe(true);
  });
});
