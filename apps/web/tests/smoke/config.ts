import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type SmokeEnvironment = 'staging' | 'production';

export interface SmokeConfig {
  environment: SmokeEnvironment;
  frontendUrl: string;
  backendUrl: string;
  candidateSha: string;
  fixtureManifestVersion: string;
  tenantId: string;
  branchId: string;
  deviceId: string;
  activeCustomerId: string;
  activeCardSerial: string;
  inactiveCustomerId: string;
  inactiveCardSerial: string;
  staffCustomerId: string;
  staffCardSerial: string;
  fraudFlagId: string;
  spareCardSerials: string[];
  allowDeviceRotation: boolean;
  allowOfflineProduction: boolean;
  admin: { username: string; password: string };
  supervisor: { username: string; password: string };
  cashier: {
    username: string;
    password: string;
    deviceId: string;
    deviceAttestationSecret: string;
  };
}

const REQUIRED_FIELDS = [
  'SMOKE_ENVIRONMENT',
  'SMOKE_FRONTEND_URL',
  'SMOKE_BACKEND_URL',
  'SMOKE_CANDIDATE_SHA',
  'SMOKE_FIXTURE_MANIFEST_VERSION',
  'SMOKE_TENANT_ID',
  'SMOKE_BRANCH_ID',
  'SMOKE_DEVICE_ID',
  'SMOKE_ACTIVE_CUSTOMER_ID',
  'SMOKE_ACTIVE_CARD_SERIAL',
  'SMOKE_INACTIVE_CUSTOMER_ID',
  'SMOKE_INACTIVE_CARD_SERIAL',
  'SMOKE_STAFF_CUSTOMER_ID',
  'SMOKE_STAFF_CARD_SERIAL',
  'SMOKE_FRAUD_FLAG_ID',
  'SMOKE_SPARE_CARD_SERIALS',
  'SMOKE_ADMIN_USERNAME',
  'SMOKE_ADMIN_PASSWORD',
  'SMOKE_SUPERVISOR_USERNAME',
  'SMOKE_SUPERVISOR_PASSWORD',
  'SMOKE_CASHIER_USERNAME',
  'SMOKE_CASHIER_PASSWORD',
  'SMOKE_CASHIER_DEVICE_ID',
  'SMOKE_CASHIER_DEVICE_ATTESTATION_SECRET',
] as const;

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required smoke configuration: ${name}`);
  }
  return value;
}

function url(env: NodeJS.ProcessEnv, name: string): string {
  const value = required(env, name);
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid smoke URL: ${name}`);
  }
}

function booleanFlag(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue: boolean,
): boolean {
  const value = env[name]?.trim().toLowerCase();
  if (value === undefined || value === '') return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid boolean smoke configuration: ${name}`);
}

function loadManifestVersion(version: string): void {
  const relativeManifest = `tests/smoke/fixtures/manifest.${version}.json`;
  const manifestPath = existsSync(resolve(relativeManifest))
    ? resolve(relativeManifest)
    : resolve('apps/web', relativeManifest);

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      version?: unknown;
    };
    if (manifest.version !== version) {
      throw new Error(`manifest version mismatch: expected ${version}`);
    }
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'unreadable manifest';
    throw new Error(`Invalid smoke fixture manifest ${version}: ${detail}`);
  }
}

export function parseSmokeConfig(env: NodeJS.ProcessEnv): SmokeConfig {
  const missing = REQUIRED_FIELDS.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required smoke configuration: ${missing[0]}`);
  }

  const environment = required(env, 'SMOKE_ENVIRONMENT');
  if (environment !== 'staging' && environment !== 'production') {
    throw new Error('SMOKE_ENVIRONMENT must be staging or production');
  }

  const candidateSha = required(env, 'SMOKE_CANDIDATE_SHA');
  if (!/^[0-9a-f]{40}$/i.test(candidateSha)) {
    throw new Error(
      'SMOKE_CANDIDATE_SHA must be a 40-character hexadecimal SHA',
    );
  }

  const fixtureManifestVersion = required(
    env,
    'SMOKE_FIXTURE_MANIFEST_VERSION',
  );
  if (!/^[a-z0-9][a-z0-9.-]*$/i.test(fixtureManifestVersion)) {
    throw new Error(
      'SMOKE_FIXTURE_MANIFEST_VERSION contains invalid characters',
    );
  }
  loadManifestVersion(fixtureManifestVersion);

  const deviceId = required(env, 'SMOKE_DEVICE_ID');
  const cashierDeviceId = required(env, 'SMOKE_CASHIER_DEVICE_ID');
  if (cashierDeviceId !== deviceId) {
    throw new Error('SMOKE_CASHIER_DEVICE_ID must equal SMOKE_DEVICE_ID');
  }

  const spareCardSerials = required(env, 'SMOKE_SPARE_CARD_SERIALS')
    .split(',')
    .map((serial) => serial.trim())
    .filter(Boolean);
  if (spareCardSerials.length < 2) {
    throw new Error(
      'SMOKE_SPARE_CARD_SERIALS must contain at least two serials',
    );
  }

  return {
    environment,
    frontendUrl: url(env, 'SMOKE_FRONTEND_URL'),
    backendUrl: url(env, 'SMOKE_BACKEND_URL'),
    candidateSha,
    fixtureManifestVersion,
    tenantId: required(env, 'SMOKE_TENANT_ID'),
    branchId: required(env, 'SMOKE_BRANCH_ID'),
    deviceId,
    activeCustomerId: required(env, 'SMOKE_ACTIVE_CUSTOMER_ID'),
    activeCardSerial: required(env, 'SMOKE_ACTIVE_CARD_SERIAL'),
    inactiveCustomerId: required(env, 'SMOKE_INACTIVE_CUSTOMER_ID'),
    inactiveCardSerial: required(env, 'SMOKE_INACTIVE_CARD_SERIAL'),
    staffCustomerId: required(env, 'SMOKE_STAFF_CUSTOMER_ID'),
    staffCardSerial: required(env, 'SMOKE_STAFF_CARD_SERIAL'),
    fraudFlagId: required(env, 'SMOKE_FRAUD_FLAG_ID'),
    spareCardSerials,
    allowDeviceRotation: booleanFlag(
      env,
      'SMOKE_ALLOW_DEVICE_ROTATION',
      environment === 'staging',
    ),
    allowOfflineProduction: booleanFlag(
      env,
      'SMOKE_ALLOW_OFFLINE_PRODUCTION',
      environment === 'staging',
    ),
    admin: {
      username: required(env, 'SMOKE_ADMIN_USERNAME'),
      password: required(env, 'SMOKE_ADMIN_PASSWORD'),
    },
    supervisor: {
      username: required(env, 'SMOKE_SUPERVISOR_USERNAME'),
      password: required(env, 'SMOKE_SUPERVISOR_PASSWORD'),
    },
    cashier: {
      username: required(env, 'SMOKE_CASHIER_USERNAME'),
      password: required(env, 'SMOKE_CASHIER_PASSWORD'),
      deviceId: cashierDeviceId,
      deviceAttestationSecret: required(
        env,
        'SMOKE_CASHIER_DEVICE_ATTESTATION_SECRET',
      ),
    },
  };
}

export function loadSmokeConfig(): SmokeConfig {
  return parseSmokeConfig(process.env);
}
