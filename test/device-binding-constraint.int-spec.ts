import { cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { DeviceAuthBindingMode, PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const migrationName = '20261007_device_binding_mode_and_seed_uuid';
const legacyBranchId = '00000000-0000-0000-0000-000000000002';
const canonicalBranchId = '00000000-0000-4000-8000-000000000002';

describe('device binding database constraint (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let migrationSchemaPath: string;
  let tenantId: string;
  let legacyDeviceId: string;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();
    const temporaryPrismaDirectory = mkdtempSync(
      join(tmpdir(), 'shopcity-device-binding-migration-'),
    );
    const temporaryMigrationsDirectory = join(
      temporaryPrismaDirectory,
      'migrations',
    );
    mkdirSync(temporaryMigrationsDirectory);
    migrationSchemaPath = join(temporaryPrismaDirectory, 'schema.prisma');
    cpSync('prisma/schema.prisma', migrationSchemaPath);
    cpSync(
      'prisma/migrations/migration_lock.toml',
      join(temporaryMigrationsDirectory, 'migration_lock.toml'),
    );

    for (const name of readdirSync('prisma/migrations', {
      withFileTypes: true,
    })) {
      if (!name.isDirectory() || name.name === migrationName) continue;
      cpSync(
        join('prisma/migrations', name.name),
        join(temporaryMigrationsDirectory, name.name),
        { recursive: true },
      );
    }

    const migrateEnvironment = { ...process.env, DATABASE_URL: databaseUrl };
    execSync(`npx prisma migrate deploy --schema "${migrationSchemaPath}"`, {
      stdio: 'inherit',
      env: migrateEnvironment,
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    const tenant = await prisma.tenant.create({
      data: { name: 'Device constraint migration test' },
    });
    tenantId = tenant.id;
    await prisma.branch.create({
      data: {
        id: legacyBranchId,
        tenantId,
        name: 'Historical seeded branch',
      },
    });
    const legacyDevice = await prisma.device.create({
      data: {
        tenantId,
        branchId: legacyBranchId,
        name: 'Inactive unpaired preview device',
        status: 'INACTIVE',
        authBindingMode: DeviceAuthBindingMode.UNPAIRED,
      },
    });
    legacyDeviceId = legacyDevice.id;
    await prisma.$disconnect();

    cpSync(
      join('prisma/migrations', migrationName),
      join(temporaryMigrationsDirectory, migrationName),
      { recursive: true },
    );
    execSync(`npx prisma migrate deploy --schema "${migrationSchemaPath}"`, {
      stdio: 'inherit',
      env: migrateEnvironment,
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
  }, 180000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
    if (migrationSchemaPath) {
      rmSync(join(migrationSchemaPath, '..'), { recursive: true, force: true });
    }
  }, 120000);

  it('reconciles the legacy branch and allows reactivation of an UNPAIRED device', async () => {
    await expect(
      prisma.branch.findUniqueOrThrow({ where: { id: canonicalBranchId } }),
    ).resolves.toMatchObject({ id: canonicalBranchId, tenantId });

    await expect(
      prisma.device.update({
        where: { id: legacyDeviceId },
        data: { status: 'ACTIVE' },
      }),
    ).resolves.toMatchObject({
      branchId: canonicalBranchId,
      status: 'ACTIVE',
      authBindingMode: DeviceAuthBindingMode.UNPAIRED,
    });
  });

  it('allows active UNPAIRED and WEBAUTHN devices without legacy HMAC secrets', async () => {
    for (const authBindingMode of [
      DeviceAuthBindingMode.UNPAIRED,
      DeviceAuthBindingMode.WEBAUTHN,
    ]) {
      await expect(
        prisma.device.create({
          data: {
            tenantId,
            branchId: canonicalBranchId,
            name: `${authBindingMode} device`,
            authBindingMode,
          },
        }),
      ).resolves.toMatchObject({ authBindingMode, status: 'ACTIVE' });
    }
  });

  it('requires secret metadata for active HMAC_LEGACY devices only', async () => {
    await expect(
      prisma.device.create({
        data: {
          tenantId,
          branchId: canonicalBranchId,
          name: 'HMAC device without secret',
          authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
        },
      }),
    ).rejects.toThrow(/Device_active_attestation_secret_check/);

    await expect(
      prisma.device.create({
        data: {
          tenantId,
          branchId: canonicalBranchId,
          name: 'HMAC device with secret',
          authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
          attestationSecretCiphertext: 'test-ciphertext',
          attestationSecretVersion: 1,
          attestationSecretRotatedAt: new Date(),
        },
      }),
    ).resolves.toMatchObject({
      authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
      status: 'ACTIVE',
    });

    await expect(
      prisma.device.create({
        data: {
          tenantId,
          branchId: canonicalBranchId,
          name: 'Inactive HMAC device without secret',
          status: 'INACTIVE',
          authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
        },
      }),
    ).resolves.toMatchObject({ status: 'INACTIVE' });
  });
});
