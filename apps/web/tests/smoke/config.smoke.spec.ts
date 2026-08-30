import { expect, test } from '@playwright/test';
import { parseSmokeConfig } from './config';
import { createSmokeRunId } from './support/smoke-run';

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    SMOKE_ENVIRONMENT: 'production',
    SMOKE_FRONTEND_URL: 'https://shopcity.example',
    SMOKE_BACKEND_URL: 'https://api.example',
    SMOKE_CANDIDATE_SHA: 'a'.repeat(40),
    SMOKE_FIXTURE_MANIFEST_VERSION: 'v1',
    SMOKE_TENANT_ID: 'tenant-smoke',
    SMOKE_BRANCH_ID: 'branch-smoke',
    SMOKE_DEVICE_ID: 'device-smoke',
    SMOKE_ACTIVE_CUSTOMER_ID: 'customer-active',
    SMOKE_ACTIVE_CARD_SERIAL: 'card-active',
    SMOKE_INACTIVE_CUSTOMER_ID: 'customer-inactive',
    SMOKE_INACTIVE_CARD_SERIAL: 'card-inactive',
    SMOKE_STAFF_CUSTOMER_ID: 'customer-staff',
    SMOKE_STAFF_CARD_SERIAL: 'card-staff',
    SMOKE_FRAUD_FLAG_ID: 'fraud-flag-smoke',
    SMOKE_SPARE_CARD_SERIALS: 'card-spare-a,card-spare-b',
    SMOKE_ADMIN_USERNAME: 'smoke.admin',
    SMOKE_ADMIN_PASSWORD: 'not-a-real-password',
    SMOKE_SUPERVISOR_USERNAME: 'smoke.supervisor',
    SMOKE_SUPERVISOR_PASSWORD: 'not-a-real-password',
    SMOKE_CASHIER_USERNAME: 'smoke.cashier',
    SMOKE_CASHIER_PASSWORD: 'not-a-real-password',
    SMOKE_CASHIER_DEVICE_ID: 'device-smoke',
    SMOKE_CASHIER_DEVICE_ATTESTATION_SECRET: 'not-a-real-secret',
  };
}

test('production config rejects missing deterministic fixture ids', () => {
  const environment = validEnvironment();
  delete environment.SMOKE_TENANT_ID;

  expect(() => parseSmokeConfig(environment)).toThrow(/SMOKE_TENANT_ID/);
});

test('production config rejects an unknown fixture manifest version', () => {
  const environment = validEnvironment();
  environment.SMOKE_FIXTURE_MANIFEST_VERSION = 'v2';

  expect(() => parseSmokeConfig(environment)).toThrow(
    /Invalid smoke fixture manifest v2/,
  );
});

test('production config rejects fewer than two spare cards', () => {
  const environment = validEnvironment();
  environment.SMOKE_SPARE_CARD_SERIALS = 'card-spare-a';

  expect(() => parseSmokeConfig(environment)).toThrow(/at least two serials/);
});

test('production safety policies default closed and staging policies default open', () => {
  const production = parseSmokeConfig(validEnvironment());
  expect(production.allowDeviceRotation).toBe(false);
  expect(production.allowOfflineProduction).toBe(false);

  const staging = parseSmokeConfig({
    ...validEnvironment(),
    SMOKE_ENVIRONMENT: 'staging',
  });
  expect(staging.allowDeviceRotation).toBe(true);
  expect(staging.allowOfflineProduction).toBe(true);
});

test('explicit policy flags are parsed without changing production defaults', () => {
  const config = parseSmokeConfig({
    ...validEnvironment(),
    SMOKE_ALLOW_DEVICE_ROTATION: 'true',
    SMOKE_ALLOW_OFFLINE_PRODUCTION: 'true',
  });
  expect(config.allowDeviceRotation).toBe(true);
  expect(config.allowOfflineProduction).toBe(true);
});

test('smoke run id is traceable and filesystem safe', () => {
  expect(createSmokeRunId(new Date('2026-08-26T14:30:00Z'), 'abc/123')).toBe(
    'SMOKE-20260826143000-abc123',
  );
});
