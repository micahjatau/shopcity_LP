import { expect, test } from '@playwright/test';
import type { SmokeConfig } from './config';
import {
  captureBaseline,
  preflightFixtures,
  resetMutableFixtures,
  validateFixtureIdentity,
  type SmokeBaseline,
} from './support/fixtures';
import type { SmokeApiSession } from './support/api-client';

const config = {
  tenantId: 'smoke-tenant',
  branchId: 'smoke-branch',
  deviceId: 'smoke-device',
  activeCustomerId: 'active-customer',
  activeCardSerial: 'ACTIVE-01',
  inactiveCustomerId: 'inactive-customer',
  inactiveCardSerial: 'INACTIVE-01',
  staffCustomerId: 'staff-customer',
  staffCardSerial: 'STAFF-01',
  fraudFlagId: 'fraud-flag-smoke',
  spareCardSerials: ['SPARE-01', 'SPARE-02'],
} as SmokeConfig;

function fixtureApi(): SmokeApiSession {
  const responses: Record<string, unknown> = {
    '/api/v1/auth/me': {
      id: 'admin',
      role: 'ADMIN',
      tenantId: 'smoke-tenant',
      branchId: 'smoke-branch',
    },
    '/api/v1/branches': [{ id: 'smoke-branch', tenantId: 'smoke-tenant' }],
    '/api/v1/devices': [
      { id: 'smoke-device', branchId: 'smoke-branch', status: 'ACTIVE' },
    ],
    '/api/v1/customers/active-customer': {
      id: 'active-customer',
      tenantId: 'smoke-tenant',
      status: 'ACTIVE',
      fullName: 'Smoke Active',
      balanceKobo: 10000,
    },
    '/api/v1/customers/inactive-customer': {
      id: 'inactive-customer',
      tenantId: 'smoke-tenant',
      status: 'INACTIVE',
      fullName: 'Smoke Inactive',
      balanceKobo: 0,
    },
    '/api/v1/customers/staff-customer': {
      id: 'staff-customer',
      tenantId: 'smoke-tenant',
      status: 'ACTIVE',
      fullName: 'Smoke Staff',
      balanceKobo: 0,
    },
    '/api/v1/cards/lookup/ACTIVE-01': {
      id: 'active-card-id',
      serialNumber: 'ACTIVE-01',
      customerId: 'active-customer',
      status: 'ACTIVE',
    },
    '/api/v1/cards/lookup/INACTIVE-01': {
      serialNumber: 'INACTIVE-01',
      customerId: 'inactive-customer',
      status: 'INACTIVE',
    },
    '/api/v1/cards/lookup/STAFF-01': {
      serialNumber: 'STAFF-01',
      customerId: 'staff-customer',
      status: 'ACTIVE',
    },
    '/api/v1/cards/lookup/SPARE-01': {
      serialNumber: 'SPARE-01',
      status: 'ACTIVE',
    },
    '/api/v1/cards/lookup/SPARE-02': {
      serialNumber: 'SPARE-02',
      status: 'ACTIVE',
    },
    '/api/v1/fraud-flags/fraud-flag-smoke': {
      id: 'fraud-flag-smoke',
      tenantId: 'smoke-tenant',
      status: 'OPEN',
    },
  };

  return {
    context: {} as SmokeApiSession['context'],
    get: async <T>(path: string) => responses[path] as T,
    post: async () => ({}) as never,
    patch: async () => ({}) as never,
    dispose: async () => undefined,
  };
}

test('fixture identity validation rejects a tenant mismatch', async () => {
  await expect(
    validateFixtureIdentity(
      { id: 'customer-a', tenantId: 'wrong-tenant' },
      { id: 'customer-a', tenantId: 'smoke-tenant' },
    ),
  ).rejects.toThrow(/tenantId mismatch/i);
});

test('preflight validates all deterministic fixture identities', async () => {
  await expect(
    preflightFixtures(config, fixtureApi()),
  ).resolves.toBeUndefined();
});

test('preflight fails closed when a deterministic branch is missing', async () => {
  const api = fixtureApi();
  const get = api.get;
  api.get = async <T>(path: string) =>
    path === '/api/v1/branches' ? [] : get<T>(path);

  await expect(preflightFixtures(config, api)).rejects.toThrow(
    /branch fixture not found/i,
  );
});

test('reset uses run-scoped idempotent mutations for mutable fixtures', async () => {
  const calls: Array<{ path: string; key?: string }> = [];
  const api = fixtureApi();
  api.patch = async <T>(path: string, _body: unknown, key?: string) => {
    calls.push({ path, key });
    return {} as T;
  };
  const baseline = await captureBaseline(config, api);

  await resetMutableFixtures(config, api, baseline, 'SMOKE-RESET-01');

  expect(calls).toEqual([
    {
      path: '/api/v1/customers/active-customer/status',
      key: 'SMOKE-RESET-01-fixture-reset-status',
    },
    {
      path: '/api/v1/customers/active-customer',
      key: 'SMOKE-RESET-01-fixture-reset-profile',
    },
    {
      path: '/api/v1/cards/active-card-id/status',
      key: 'SMOKE-RESET-01-fixture-reset-card-status',
    },
    {
      path: '/api/v1/devices/smoke-device',
      key: 'SMOKE-RESET-01-fixture-reset-device-status',
    },
  ]);
});

test('baseline captures mutable customer, card, device, and integer-kobo balance', async () => {
  const baseline = await captureBaseline(config, fixtureApi());

  expect(baseline).toEqual<SmokeBaseline>({
    customer: {
      id: 'active-customer',
      status: 'ACTIVE',
      fullName: 'Smoke Active',
      phone: null,
      email: null,
    },
    card: {
      id: 'active-card-id',
      serialNumber: 'ACTIVE-01',
      status: 'ACTIVE',
      customerId: 'active-customer',
    },
    device: {
      id: 'smoke-device',
      status: 'ACTIVE',
      branchId: 'smoke-branch',
    },
    balanceKobo: 10000,
  });
});
