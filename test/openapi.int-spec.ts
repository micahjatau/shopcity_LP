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
    expect(createSchema?.properties?.deviceId).toBeUndefined();
    expect(createSchema?.properties?.overrideReason).toBeDefined();
    expect(createSchema?.properties?.branchId).toBeUndefined();
    expect(createSchema?.properties?.externalReceiptNumber).toBeUndefined();

    expect(
      document.paths['/api/v1/receipts']?.post?.responses?.['201'],
    ).toBeDefined();
    expect(
      document.paths['/api/v1/receipts']?.post?.responses?.['202'],
    ).toBeDefined();
  });

  it('documents the earn contract for confirmed and pending approval outcomes', () => {
    const document = buildOpenApiDocument(app);

    expect(
      document.paths['/api/v1/transactions/earn']?.post?.responses?.['201'],
    ).toBeDefined();
    expect(
      document.paths['/api/v1/transactions/earn']?.post?.responses?.['202'],
    ).toBeDefined();

    const confirmedSchema = resolveResponseDataSchema(
      document,
      document.paths['/api/v1/transactions/earn']?.post?.responses?.['201'],
    );
    const pendingSchema = resolveResponseDataSchema(
      document,
      document.paths['/api/v1/transactions/earn']?.post?.responses?.['202'],
    );

    expect(confirmedSchema?.properties?.transactionId).toBeDefined();
    expect(confirmedSchema?.properties?.ledgerEntryId).toBeDefined();
    expect(confirmedSchema?.properties?.creditKobo).toBeDefined();
    expect(pendingSchema?.properties?.approvalId).toBeDefined();
    expect(pendingSchema?.properties?.creditKobo).toBeDefined();
  });

  it('documents endpoint-specific earn error codes', () => {
    const document = buildOpenApiDocument(app);
    const earnOperation = document.paths['/api/v1/transactions/earn']?.post;

    expect(responseExampleCodes(earnOperation?.responses?.['400'])).toEqual(
      expect.arrayContaining([
        'SESSION_DEVICE_REQUIRED',
        'DEVICE_NOT_ACTIVE',
        'VALIDATION_ERROR',
      ]),
    );
    expect(responseExampleCodes(earnOperation?.responses?.['404'])).toEqual([
      'CARD_NOT_FOUND',
    ]);
    expect(responseExampleCodes(earnOperation?.responses?.['409'])).toEqual(
      expect.arrayContaining(['RECEIPT_ALREADY_USED', 'IDEMPOTENCY_CONFLICT']),
    );
    expect(responseExampleCodes(earnOperation?.responses?.['422'])).toEqual(
      expect.arrayContaining([
        'PURCHASE_REQUIRES_APPROVAL',
        'APPROVAL_POLICY_CHANGED',
      ]),
    );
    expect(responseExampleCodes(earnOperation?.responses?.['503'])).toEqual(
      expect.arrayContaining([
        'EARN_TRANSACTION_CONFLICT',
        'DEPENDENCY_UNAVAILABLE',
      ]),
    );
  });

  it('documents the transaction, ledger, and approval list payloads', () => {
    const document = buildOpenApiDocument(app);
    const transactionSchema = resolveResponseDataSchema(
      document,
      document.paths['/api/v1/transactions/{id}']?.get?.responses?.['200'],
    );
    const ledgerSchema = resolveResponseDataSchema(
      document,
      document.paths['/api/v1/customers/{id}/ledger']?.get?.responses?.['200'],
    );
    const approvalsSchema = resolveResponseDataSchema(
      document,
      document.paths['/api/v1/approvals']?.get?.responses?.['200'],
    );

    expect(transactionSchema?.properties?.ledger).toBeDefined();
    expect(transactionSchema?.properties?.approvalStatus).toBeDefined();
    expect(ledgerSchema?.properties?.items).toBeDefined();
    expect(approvalsSchema?.properties?.items).toBeDefined();
    const approvalItemsSchema = approvalsSchema?.properties?.items as
      | {
          items?: { properties?: Record<string, unknown> };
        }
      | undefined;

    expect(approvalItemsSchema?.items?.properties?.expiresAt).toBeDefined();
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

function resolveResponseDataSchema(
  document: ReturnType<typeof buildOpenApiDocument>,
  response: unknown,
) {
  const content = response as {
    content?: {
      ['application/json']?: {
        schema?: {
          properties?: {
            data?: {
              $ref?: string;
              properties?: Record<string, unknown>;
            };
          };
        };
      };
    };
  };
  const dataSchema =
    content.content?.['application/json']?.schema?.properties?.data;

  if (!dataSchema) {
    return undefined;
  }

  if (dataSchema.$ref) {
    const refName = dataSchema.$ref.split('/').pop() as string;
    return document.components?.schemas?.[refName] as {
      properties?: Record<string, unknown>;
    };
  }

  return dataSchema;
}

function responseExampleCodes(response: unknown): string[] {
  const documentedResponse = response as {
    content?: {
      ['application/json']?: {
        examples?: Record<string, { value?: { error?: { code?: string } } }>;
      };
    };
  };

  return Object.values(
    documentedResponse.content?.['application/json']?.examples ?? {},
  )
    .map((example) => example.value?.error?.code)
    .filter((code): code is string => typeof code === 'string');
}
