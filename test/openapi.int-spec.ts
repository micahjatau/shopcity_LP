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

  it('keeps the card contract on serialNumber', () => {
    const document = buildOpenApiDocument(app);
    const createSchema = resolveRequestBodySchema(
      document,
      document.paths['/api/v1/cards']?.post?.requestBody,
    );
    const replaceSchema = resolveRequestBodySchema(
      document,
      document.paths['/api/v1/cards/{id}/replace']?.post?.requestBody,
    );

    expect(createSchema?.properties?.serialNumber).toBeDefined();
    expect(replaceSchema?.properties?.serialNumber).toBeDefined();
    expect(createSchema?.properties?.barcodeValue).toBeUndefined();
    expect(replaceSchema?.properties?.barcodeValue).toBeUndefined();
  });

  it('documents the receipt capture contract', () => {
    const document = buildOpenApiDocument(app);
    const createSchema = resolveRequestBodySchema(
      document,
      document.paths['/api/v1/receipts']?.post?.requestBody,
    );

    expect(createSchema?.properties?.posReceiptNumber).toBeDefined();
    expect(createSchema?.properties?.cardSerialNumber).toBeDefined();
    expect(createSchema?.properties?.purchaseAmountKobo).toBeDefined();
    expect(createSchema?.properties?.occurredAt).toBeDefined();
    expect(createSchema?.properties?.deviceId).toBeDefined();
    expect(createSchema?.properties?.branchId).toBeUndefined();
    expect(createSchema?.properties?.externalReceiptNumber).toBeUndefined();
  });
});

function resolveRequestBodySchema(
  document: ReturnType<typeof buildOpenApiDocument>,
  requestBody: unknown,
) {
  const content = requestBody as {
    content?: {
      ['application/json']?: {
        schema?: {
          $ref?: string;
          properties?: Record<string, unknown>;
        };
      };
    };
  };
  const schema = content.content?.['application/json']?.schema;

  if (!schema) {
    return undefined;
  }

  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop() as string;
    return document.components?.schemas?.[refName] as {
      properties?: Record<string, unknown>;
    };
  }

  return schema;
}
