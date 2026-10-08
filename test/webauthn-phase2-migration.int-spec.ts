import { randomUUID } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { DeviceAuthBindingMode, PrismaClient, UserRole } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const migrationName = '20261005_browser_pos_webauthn_phase_2';

describe('Browser POS WebAuthn Phase 2 migration (int)', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let temporaryPrismaDirectory: string;
  let temporaryMigrationsDirectory: string;
  let migrationApplied = false;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    temporaryPrismaDirectory = mkdtempSync(
      join(tmpdir(), 'shopcity-webauthn-phase2-migration-'),
    );
    temporaryMigrationsDirectory = join(temporaryPrismaDirectory, 'migrations');
    mkdirSync(temporaryMigrationsDirectory);
    const migrationSchemaPath = join(temporaryPrismaDirectory, 'schema.prisma');
    cpSync('prisma/schema.prisma', migrationSchemaPath);
    cpSync(
      'prisma/migrations/migration_lock.toml',
      join(temporaryMigrationsDirectory, 'migration_lock.toml'),
    );

    for (const entry of readdirSync('prisma/migrations', {
      withFileTypes: true,
    })) {
      if (
        !entry.isDirectory() ||
        entry.name >= migrationName ||
        entry.name === migrationName
      ) {
        continue;
      }
      cpSync(
        join('prisma/migrations', entry.name),
        join(temporaryMigrationsDirectory, entry.name),
        { recursive: true },
      );
    }

    const databaseUrl = container.getConnectionUri();
    const migrateEnvironment = { ...process.env, DATABASE_URL: databaseUrl };
    execSync(`npx prisma migrate deploy --schema "${migrationSchemaPath}"`, {
      stdio: 'inherit',
      env: migrateEnvironment,
    });
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();

    const tenant = await prisma.tenant.create({
      data: { name: 'WebAuthn migration backfill test' },
    });
    const branch = await prisma.branch.create({
      data: { tenantId: tenant.id, name: 'Legacy branch' },
    });
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        username: 'migration-admin',
        role: UserRole.ADMIN,
      },
    });
    const deviceId = randomUUID();
    const sessionId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "Device" (
        "id", "tenantId", "branchId", "name", "fingerprintHash",
        "attestationSecretCiphertext", "attestationSecretVersion",
        "attestationSecretRotatedAt", "status", "createdAt", "updatedAt"
      ) VALUES (
        ${deviceId}, ${tenant.id}, ${branch.id}, 'Legacy HMAC device',
        'legacy-fingerprint-hash', 'legacy-ciphertext', 1, CURRENT_TIMESTAMP,
        'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;
    await prisma.$executeRaw`
      INSERT INTO "Session" (
        "id", "userId", "deviceId", "sessionTokenHash", "csrfTokenHash",
        "status", "purpose", "expiresAt", "createdAt", "updatedAt"
      ) VALUES (
        ${sessionId}, ${user.id}, ${deviceId},
        'legacy-session-token-hash', 'legacy-csrf-token-hash', 'ACTIVE',
        'USER', CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;

    cpSync(
      join('prisma/migrations', migrationName),
      join(temporaryMigrationsDirectory, migrationName),
      { recursive: true },
    );
    execSync(`npx prisma migrate deploy --schema "${migrationSchemaPath}"`, {
      stdio: 'inherit',
      env: migrateEnvironment,
    });
    migrationApplied = true;
  }, 180000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
    if (temporaryPrismaDirectory) {
      rmSync(temporaryPrismaDirectory, { recursive: true, force: true });
    }
  }, 120000);

  it('keeps existing devices fail-closed as UNPAIRED and preserves legacy sessions', async () => {
    if (!migrationApplied) throw new Error('Phase 2 migration was not applied');

    const devices = await prisma.device.findMany({
      where: { name: 'Legacy HMAC device' },
    });
    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({
      authBindingMode: DeviceAuthBindingMode.UNPAIRED,
      fingerprintHash: 'legacy-fingerprint-hash',
      attestationSecretCiphertext: 'legacy-ciphertext',
      attestationSecretVersion: 1,
      status: 'ACTIVE',
    });
    expect(devices[0]?.pairedAt).toBeNull();

    const sessions = await prisma.session.findMany({
      where: { sessionTokenHash: 'legacy-session-token-hash' },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.deviceId).toBe(devices[0]?.id);
    expect(sessions[0]?.deviceCredentialId).toBeNull();

    const nullableFingerprint = await prisma.$queryRaw<
      { is_nullable: string }[]
    >`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Device' AND column_name = 'fingerprintHash'
    `;
    expect(nullableFingerprint).toEqual([{ is_nullable: 'YES' }]);
    await expect(prisma.deviceWebAuthnCredential.count()).resolves.toBe(0);
    await expect(prisma.deviceEnrollmentChallenge.count()).resolves.toBe(0);
    await expect(prisma.cashierLoginAttempt.count()).resolves.toBe(0);
  });
});
