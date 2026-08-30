import type { SmokeConfig } from '../config';
import { SmokeApiError, type SmokeApiSession } from './api-client';

export interface SmokeBaseline {
  customer: {
    id: string;
    status: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
  };
  card: {
    id?: string;
    serialNumber: string;
    status: string;
    customerId: string;
  };
  device: { id: string; status: string; branchId: string };
  balanceKobo: number;
}

interface Identity {
  id?: unknown;
  tenantId?: unknown;
  branchId?: unknown;
  customerId?: unknown;
  serialNumber?: unknown;
  status?: unknown;
}

function identityValue(
  value: Identity,
  key: keyof Identity,
): string | undefined {
  const result = value[key];
  return typeof result === 'string' ? result : undefined;
}

export async function validateFixtureIdentity(
  actual: Identity,
  expected: Identity,
): Promise<void> {
  for (const key of Object.keys(expected) as Array<keyof Identity>) {
    const expectedValue = identityValue(expected, key);
    if (expectedValue === undefined) continue;
    if (identityValue(actual, key) !== expectedValue) {
      throw new Error(`Smoke fixture ${String(key)} mismatch`);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringField(value: unknown, ...keys: string[]): string {
  const record = asRecord(value);
  for (const key of keys) {
    if (typeof record[key] === 'string') return record[key];
  }
  throw new Error(`Smoke fixture response missing ${keys[0]}`);
}

function numberField(value: unknown, ...keys: string[]): number {
  const record = asRecord(value);
  for (const key of keys) {
    if (typeof record[key] === 'number' && Number.isInteger(record[key]))
      return record[key];
  }
  throw new Error(`Smoke fixture response missing ${keys[0]}`);
}

async function getFixture(
  api: SmokeApiSession,
  path: string,
): Promise<Record<string, unknown>> {
  return asRecord(await api.get(path));
}

export async function preflightFixtures(
  config: SmokeConfig,
  adminApi: SmokeApiSession,
): Promise<void> {
  const identity = await getFixture(adminApi, '/api/v1/auth/me');
  const identityUser = asRecord(identity.user ?? identity);
  if (stringField(identityUser, 'role').toUpperCase() !== 'ADMIN') {
    throw new Error('Smoke fixture preflight requires an Admin session');
  }

  const branches = asArray(await adminApi.get('/api/v1/branches'));
  const branch = branches.find(
    (item) => stringField(item, 'id') === config.branchId,
  );
  if (!branch) throw new Error('Smoke branch fixture not found');
  await validateFixtureIdentity(asRecord(branch), {
    id: config.branchId,
    tenantId: config.tenantId,
  });

  const devices = asArray(await adminApi.get('/api/v1/devices'));
  const device = devices.find(
    (item) => stringField(item, 'id') === config.deviceId,
  );
  if (!device) throw new Error('Smoke device fixture not found');
  await validateFixtureIdentity(asRecord(device), {
    id: config.deviceId,
    branchId: config.branchId,
  });

  const fraudFlag = await getFixture(
    adminApi,
    `/api/v1/fraud-flags/${config.fraudFlagId}`,
  );
  await validateFixtureIdentity(fraudFlag, {
    id: config.fraudFlagId,
    tenantId: config.tenantId,
  });
  if (stringField(fraudFlag, 'status').toUpperCase() !== 'OPEN') {
    throw new Error('Smoke fraud fixture must be OPEN before the run');
  }

  const customerIds = [
    config.activeCustomerId,
    config.inactiveCustomerId,
    config.staffCustomerId,
  ];
  for (const customerId of customerIds) {
    const customer = await getFixture(
      adminApi,
      `/api/v1/customers/${customerId}`,
    );
    await validateFixtureIdentity(customer, {
      id: customerId,
      tenantId: config.tenantId,
    });
  }

  const cardFixtures = [
    [config.activeCardSerial, config.activeCustomerId],
    [config.inactiveCardSerial, config.inactiveCustomerId],
    [config.staffCardSerial, config.staffCustomerId],
    ...config.spareCardSerials.map((serial) => [serial, ''] as const),
  ] as const;
  for (const [serial, customerId] of cardFixtures) {
    try {
      const card = await getFixture(adminApi, `/api/v1/cards/lookup/${serial}`);
      await validateFixtureIdentity(card, { serialNumber: serial });
      if (customerId && stringField(card, 'customerId') !== customerId) {
        throw new Error('Smoke card customer fixture mismatch');
      }
      if (
        !customerId &&
        typeof card.customerId === 'string' &&
        card.customerId.trim()
      ) {
        throw new Error(`Smoke spare card is already assigned: ${serial}`);
      }
    } catch (error) {
      if (
        error instanceof SmokeApiError &&
        error.status === 404 &&
        error.code === 'NOT_FOUND' &&
        serial === config.inactiveCardSerial
      ) {
        const inactiveCustomer = await getFixture(
          adminApi,
          `/api/v1/customers/${config.inactiveCustomerId}`,
        );
        await validateFixtureIdentity(inactiveCustomer, {
          id: config.inactiveCustomerId,
          tenantId: config.tenantId,
        });
        if (
          stringField(inactiveCustomer, 'status').toUpperCase() === 'ACTIVE' ||
          stringField(inactiveCustomer, 'activeCardStatus').toUpperCase() !==
            'BLOCKED'
        ) {
          throw new Error('Smoke inactive card/customer state mismatch');
        }
        continue;
      }
      if (
        customerId ||
        !(error instanceof SmokeApiError) ||
        error.status !== 404 ||
        !['CARD_NOT_FOUND', 'NOT_FOUND'].includes(error.code)
      ) {
        throw error;
      }
      // Spare serials are reserved for replacement and intentionally absent.
    }
  }
}

export async function captureBaseline(
  config: SmokeConfig,
  adminApi: SmokeApiSession,
): Promise<SmokeBaseline> {
  const customer = await getFixture(
    adminApi,
    `/api/v1/customers/${config.activeCustomerId}`,
  );
  const card = await getFixture(
    adminApi,
    `/api/v1/cards/lookup/${config.activeCardSerial}`,
  );
  const devices = asArray(await adminApi.get('/api/v1/devices'));
  const device = devices.find(
    (item) => stringField(item, 'id') === config.deviceId,
  );
  if (!device)
    throw new Error('Smoke device fixture not found during baseline capture');

  return {
    customer: {
      id: stringField(customer, 'id'),
      status: stringField(customer, 'status'),
      fullName: stringField(customer, 'fullName', 'name'),
      phone:
        typeof customer.phoneE164 === 'string'
          ? customer.phoneE164
          : typeof customer.phone === 'string'
            ? customer.phone
            : null,
      email: typeof customer.email === 'string' ? customer.email : null,
    },
    card: {
      id: typeof card.id === 'string' ? card.id : undefined,
      serialNumber: stringField(card, 'serialNumber'),
      status: stringField(card, 'status'),
      customerId: stringField(card, 'customerId'),
    },
    device: {
      id: stringField(device, 'id'),
      status: stringField(device, 'status'),
      branchId: stringField(device, 'branchId'),
    },
    balanceKobo: numberField(
      customer,
      'balanceKobo',
      'availableBalanceKobo',
      'balance',
    ),
  };
}

export async function resetMutableFixtures(
  config: SmokeConfig,
  adminApi: SmokeApiSession,
  baseline: SmokeBaseline,
  smokeRunId: string,
): Promise<void> {
  const key = `${smokeRunId}-fixture-reset`;
  await adminApi.patch(
    `/api/v1/customers/${baseline.customer.id}/status`,
    { status: baseline.customer.status },
    `${key}-status`,
  );
  await adminApi.patch(
    `/api/v1/customers/${baseline.customer.id}`,
    {
      fullName: baseline.customer.fullName,
      ...(baseline.customer.phone ? { phone: baseline.customer.phone } : {}),
      ...(baseline.customer.email ? { email: baseline.customer.email } : {}),
    },
    `${key}-profile`,
  );
  if (baseline.card.id) {
    await adminApi.patch(
      `/api/v1/cards/${baseline.card.id}/status`,
      { status: baseline.card.status },
      key,
    );
  }
  await adminApi.patch(
    `/api/v1/devices/${baseline.device.id}`,
    { status: baseline.device.status },
    key,
  );
}
