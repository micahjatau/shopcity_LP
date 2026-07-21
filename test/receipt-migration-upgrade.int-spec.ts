import { execSync } from 'node:child_process';
import { mkdtempSync, cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const repoRoot = join(__dirname, '..');
const prismaRoot = join(repoRoot, 'prisma');
const migrationsRoot = join(prismaRoot, 'migrations');
const migrationName = '20260720_receipt_integrity_gate';

interface ReceiptMigrationFixture {
  databaseUrl: string;
  tempRoot: string;
  tempSchemaPath: string;
  executeSql: (sql: string) => void;
  applyPatchedMigration: () => void;
  cleanup: () => Promise<void>;
}

async function prepareReceiptMigrationFixture(): Promise<ReceiptMigrationFixture> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const databaseUrl = container.getConnectionUri();
  const tempRoot = mkdtempSync(join(tmpdir(), 'receipt-migration-upgrade-'));
  const tempPrismaRoot = join(tempRoot, 'prisma');
  const tempMigrationsRoot = join(tempPrismaRoot, 'migrations');
  const tempSchemaPath = join(tempPrismaRoot, 'schema.prisma');

  mkdirSync(tempMigrationsRoot, { recursive: true });
  cpSync(join(prismaRoot, 'schema.prisma'), tempSchemaPath);

  for (const entry of readdirSync(migrationsRoot).sort()) {
    if (entry === migrationName) {
      continue;
    }

    const sourcePath = join(migrationsRoot, entry);
    if (!statSync(sourcePath).isDirectory()) {
      continue;
    }

    cpSync(sourcePath, join(tempMigrationsRoot, entry), { recursive: true });
  }

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
  };

  execSync(`npx prisma migrate deploy --schema "${tempSchemaPath}"`, {
    env,
    stdio: 'inherit',
  });

  return {
    databaseUrl,
    tempRoot,
    tempSchemaPath,
    executeSql: (sql: string) => {
      execSync(`npx prisma db execute --schema "${tempSchemaPath}" --stdin`, {
        env,
        input: sql,
        stdio: ['pipe', 'inherit', 'inherit'],
      });
    },
    applyPatchedMigration: () => {
      cpSync(join(migrationsRoot, migrationName), join(tempMigrationsRoot, migrationName), {
        recursive: true,
      });

      execSync(`npx prisma migrate deploy --schema "${tempSchemaPath}"`, {
        env,
        stdio: 'inherit',
      });
    },
    cleanup: async () => {
      rmSync(tempRoot, { force: true, recursive: true });
      await container.stop();
    },
  };
}

function buildLegacyReceiptSeedSql(options: {
  tenantId: string;
  branchId: string;
  deviceId: string;
  userId: string;
  customerId: string;
  cardId: string;
  receiptId: string;
  receiptNumber: string;
  externalReceiptNumber: string | null;
}) {
  const timestamp = '2026-07-20T10:15:00.000Z';
  const externalReceiptNumber =
    options.externalReceiptNumber === null
      ? 'NULL'
      : `'${options.externalReceiptNumber.replaceAll("'", "''")}'`;

  return `
    INSERT INTO "Tenant" ("id", "name", "status", "updatedAt")
    VALUES ('${options.tenantId}', 'Receipt Migration Tenant', 'ACTIVE', '${timestamp}');

    INSERT INTO "Branch" ("id", "tenantId", "name", "timezone", "receiptWeekStartDay", "status", "updatedAt")
    VALUES ('${options.branchId}', '${options.tenantId}', 'Main Branch', 'Africa/Lagos', 1, 'ACTIVE', '${timestamp}');

    INSERT INTO "Device" ("id", "tenantId", "branchId", "name", "fingerprintHash", "status", "updatedAt")
    VALUES ('${options.deviceId}', '${options.tenantId}', '${options.branchId}', 'POS-1', 'legacy-device-fingerprint', 'ACTIVE', '${timestamp}');

    INSERT INTO "User" ("id", "tenantId", "branchId", "username", "role", "status", "updatedAt")
    VALUES ('${options.userId}', '${options.tenantId}', '${options.branchId}', 'cashier@shopcity.local', 'CASHIER', 'ACTIVE', '${timestamp}');

    INSERT INTO "Customer" ("id", "tenantId", "branchId", "fullName", "phoneE164", "isStaff", "status", "registeredByTenantId", "registeredBy", "updatedAt")
    VALUES ('${options.customerId}', '${options.tenantId}', '${options.branchId}', 'Legacy Customer', '+2348012345678', FALSE, 'ACTIVE', '${options.tenantId}', '${options.userId}', '${timestamp}');

    INSERT INTO "Card" ("id", "tenantId", "customerId", "barcodeValue", "status", "issuedByTenantId", "issuedBy", "updatedAt")
    VALUES ('${options.cardId}', '${options.tenantId}', '${options.customerId}', 'CARD-LEGACY-1', 'ACTIVE', '${options.tenantId}', '${options.userId}', '${timestamp}');

    INSERT INTO "Receipt" (
      "id",
      "branchId",
      "receiptNumber",
      "receiptWeekStart",
      "purchaseAmountKobo",
      "cashierId",
      "tenantId",
      "customerId",
      "cardId",
      "deviceId",
      "externalReceiptNumber",
      "occurredAt",
      "capturedByTenantId",
      "capturedBy",
      "capturedAt",
      "updatedAt"
    ) VALUES (
      '${options.receiptId}',
      '${options.branchId}',
      '${options.receiptNumber}',
      '${timestamp}',
      1000000,
      '${options.userId}',
      '${options.tenantId}',
      '${options.customerId}',
      '${options.cardId}',
      '${options.deviceId}',
      ${externalReceiptNumber},
      '${timestamp}',
      '${options.tenantId}',
      '${options.userId}',
      '${timestamp}',
      '${timestamp}'
    );
  `;
}

function buildLegacyReceiptInsertSql(options: {
  tenantId: string;
  branchId: string;
  deviceId: string;
  userId: string;
  customerId: string;
  cardId: string;
  receiptId: string;
  receiptNumber: string;
  externalReceiptNumber: string | null;
}) {
  const timestamp = '2026-07-20T10:15:00.000Z';
  const externalReceiptNumber =
    options.externalReceiptNumber === null
      ? 'NULL'
      : `'${options.externalReceiptNumber.replaceAll("'", "''")}'`;

  return `
    INSERT INTO "Receipt" (
      "id",
      "branchId",
      "receiptNumber",
      "receiptWeekStart",
      "purchaseAmountKobo",
      "cashierId",
      "tenantId",
      "customerId",
      "cardId",
      "deviceId",
      "externalReceiptNumber",
      "occurredAt",
      "capturedByTenantId",
      "capturedBy",
      "capturedAt",
      "updatedAt"
    ) VALUES (
      '${options.receiptId}',
      '${options.branchId}',
      '${options.receiptNumber}',
      '${timestamp}',
      1000000,
      '${options.userId}',
      '${options.tenantId}',
      '${options.customerId}',
      '${options.cardId}',
      '${options.deviceId}',
      ${externalReceiptNumber},
      '${timestamp}',
      '${options.tenantId}',
      '${options.userId}',
      '${timestamp}',
      '${timestamp}'
    );
  `;
}

async function runReceiptMigrationUpgrade(options: {
  externalReceiptNumber: string | null;
}) {
  const fixture = await prepareReceiptMigrationFixture();
  const ids = {
    tenantId: '11111111-1111-1111-1111-111111111111',
    branchId: '22222222-2222-2222-2222-222222222222',
    deviceId: '33333333-3333-3333-3333-333333333333',
    userId: '44444444-4444-4444-4444-444444444444',
    customerId: '55555555-5555-5555-5555-555555555555',
    cardId: '66666666-6666-6666-6666-666666666666',
    receiptId: '77777777-7777-7777-7777-777777777777',
  };

  try {
    fixture.executeSql(
      buildLegacyReceiptSeedSql({
        ...ids,
        receiptNumber: 'LEGACY-RECEIPT-0001',
        externalReceiptNumber: options.externalReceiptNumber,
      }),
    );

    return {
      fixture,
      ids,
    };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

describe('receipt integrity migration upgrade', () => {
  it('preserves trimmed legacy identity and drops legacy receipt columns', async () => {
    const { fixture, ids } = await runReceiptMigrationUpgrade({
      externalReceiptNumber: '  POS-LEGACY-0001  ',
    });

    try {
      fixture.applyPatchedMigration();

      const prisma = new PrismaClient({
        datasources: { db: { url: fixture.databaseUrl } },
      });

      try {
        await prisma.$connect();

        const receipt = await prisma.receipt.findUnique({
          where: { id: ids.receiptId },
        });

        expect(receipt).toMatchObject({
          tenantId: ids.tenantId,
          branchId: ids.branchId,
          posReceiptNumber: 'POS-LEGACY-0001',
          normalizedPosReceiptNumber: 'POS-LEGACY-0001',
        });

        const droppedColumns = await prisma.$queryRaw<{ column_name: string }[]>`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'Receipt'
            AND column_name IN ('receiptNumber', 'externalReceiptNumber', 'cashierId')
        `;

        expect(droppedColumns).toHaveLength(0);
      } finally {
        await prisma.$disconnect();
      }
    } finally {
      await fixture.cleanup();
    }
  }, 120000);

  it('rejects null and whitespace-only legacy receipt references', async () => {
    const { fixture } = await runReceiptMigrationUpgrade({
      externalReceiptNumber: '   ',
    });

    try {
      fixture.executeSql(
        buildLegacyReceiptInsertSql({
          tenantId: '11111111-1111-1111-1111-111111111111',
          branchId: '22222222-2222-2222-2222-222222222222',
          deviceId: '33333333-3333-3333-3333-333333333333',
          userId: '44444444-4444-4444-4444-444444444444',
          customerId: '55555555-5555-5555-5555-555555555555',
          cardId: '66666666-6666-6666-6666-666666666666',
          receiptId: '88888888-8888-8888-8888-888888888888',
          receiptNumber: 'LEGACY-RECEIPT-0002',
          externalReceiptNumber: null,
        }),
      );

      expect(() => fixture.applyPatchedMigration()).toThrow();
    } finally {
      await fixture.cleanup();
    }
  }, 120000);
});
