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

    expect(document.servers).toEqual([{ url: '/' }]);
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
    expect(responseExampleCodes(earnOperation?.responses?.['422'])).toEqual([]);
    expect(responseExampleCodes(earnOperation?.responses?.['429'])).toEqual([
      'RATE_LIMITED',
    ]);
    expect(responseExampleCodes(earnOperation?.responses?.['503'])).toEqual(
      expect.arrayContaining([
        'EARN_TRANSACTION_CONFLICT',
        'DEPENDENCY_UNAVAILABLE',
      ]),
    );
  });

  it('documents approval decision policy-change errors on the approval endpoint', () => {
    const document = buildOpenApiDocument(app);
    const approvalDecisionOperation =
      document.paths['/api/v1/approvals/{id}/decision']?.post;

    expect(
      responseExampleCodes(approvalDecisionOperation?.responses?.['422']),
    ).toEqual(['APPROVAL_POLICY_CHANGED']);
  });

  it('documents the public reversal review contract', () => {
    const document = buildOpenApiDocument(app);
    const reversalOperation =
      document.paths['/api/v1/transactions/{transactionId}/reverse']?.post;

    expect(reversalOperation?.responses?.['201']).toBeUndefined();
    expect(reversalOperation?.responses?.['202']).toBeUndefined();
    expect(reversalOperation?.responses?.['503']).toBeDefined();
    expect(
      resolveResponseDataSchema(document, reversalOperation?.responses?.['503'])
        ?.properties?.code,
    ).toBeDefined();
    expect(
      resolveResponseDataSchema(document, reversalOperation?.responses?.['503'])
        ?.properties?.transactionId,
    ).toBeDefined();
  });

  it('documents the transaction, ledger, and approval list payloads', () => {
    const document = buildOpenApiDocument(app);
    const transactionSchema = resolveResponseDataSchema(
      document,
      document.paths['/api/v1/transactions/{id}']?.get?.responses?.['200'],
    );
    const customerLedgerSchema = resolveResponseDataSchema(
      document,
      document.paths['/api/v1/customers/{id}/ledger']?.get?.responses?.['200'],
    );
    const approvalsSchema = resolveResponseDataSchema(
      document,
      document.paths['/api/v1/approvals']?.get?.responses?.['200'],
    );
    const customersSchema = resolveResponseDataSchema(
      document,
      document.paths['/api/v1/customers']?.get?.responses?.['200'],
    );

    expect(transactionSchema?.properties?.ledger).toBeDefined();
    expect(transactionSchema?.properties?.approvalStatus).toBeDefined();
    expect(transactionSchema?.properties?.redeemedAmountKobo).toBeDefined();
    expect(transactionSchema?.properties?.redemptionId).toBeDefined();
    const transactionLedgerSchema = transactionSchema?.properties?.ledger as
      | {
          properties?: Record<string, unknown>;
        }
      | undefined;
    const ledgerItemsSchema = transactionLedgerSchema?.properties
      ?.allocations as
      | {
          items?: {
            properties?: Record<string, unknown>;
          };
        }
      | undefined;

    expect(transactionLedgerSchema?.properties?.allocations).toBeDefined();
    expect(transactionLedgerSchema?.properties?.redemptionId).toBeDefined();
    expect(ledgerItemsSchema?.items?.properties?.restorations).toBeDefined();
    expect(customerLedgerSchema?.properties?.items).toBeDefined();
    expect(customerLedgerSchema?.properties?.nextCursor).toBeDefined();
    expect(customerLedgerSchema?.properties?.hasMore).toBeDefined();
    const customerLedgerItemSchema = customerLedgerSchema?.properties?.items as
      | {
          items?: {
            properties?: Record<string, unknown>;
          };
        }
      | undefined;

    expect(
      customerLedgerItemSchema?.items?.properties?.redemptionId,
    ).toBeDefined();
    expect(
      customerLedgerItemSchema?.items?.properties?.allocations,
    ).toBeDefined();
    expect(approvalsSchema?.properties?.items).toBeDefined();
    expect(approvalsSchema?.properties?.nextCursor).toBeDefined();
    expect(approvalsSchema?.properties?.hasMore).toBeDefined();
    expect(customersSchema?.properties?.items).toBeDefined();
    expect(customersSchema?.properties?.nextCursor).toBeDefined();
    expect(customersSchema?.properties?.hasMore).toBeDefined();
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
