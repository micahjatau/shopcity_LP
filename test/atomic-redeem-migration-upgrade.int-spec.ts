import { execFileSync, execSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const repoRoot = join(__dirname, '..');
const prismaRoot = join(repoRoot, 'prisma');
const migrationsRoot = join(prismaRoot, 'migrations');
const targetMigration = '20261013_atomic_redeem_settlement';
const restoreDatabase = 'atomic_redeem_restore_check';

describe('atomic redemption settlement migration upgrade and restore', () => {
  it('upgrades the prior schema and preserves it through pg_dump/pg_restore', async () => {
    const container = await new PostgreSqlContainer(
      'postgres:16-alpine',
    ).start();
    const databaseUrl = container.getConnectionUri();
    const tempRoot = mkdtempSync(join(tmpdir(), 'atomic-redeem-migration-'));
    const tempPrismaRoot = join(tempRoot, 'prisma');
    const tempMigrationsRoot = join(tempPrismaRoot, 'migrations');
    const tempSchemaPath = join(tempPrismaRoot, 'schema.prisma');
    const containerId = (
      container as typeof container & {
        startedTestContainer: { getId(): string };
      }
    ).startedTestContainer.getId();
    const env = { ...process.env, DATABASE_URL: databaseUrl };
    const dockerEnv = ['-e', `PGPASSWORD=${container.getPassword()}`];

    mkdirSync(tempMigrationsRoot, { recursive: true });
    cpSync(join(prismaRoot, 'schema.prisma'), tempSchemaPath);

    try {
      for (const entry of readdirSync(migrationsRoot).sort()) {
        if (entry === targetMigration) break;
        const source = join(migrationsRoot, entry);
        if (statSync(source).isDirectory()) {
          cpSync(source, join(tempMigrationsRoot, entry), { recursive: true });
        }
      }

      execSync(`npx prisma migrate deploy --schema "${tempSchemaPath}"`, {
        env,
        stdio: 'inherit',
      });

      const priorSchema = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });
      try {
        const legacyIndex = await priorSchema.$queryRaw<
          { indexname: string }[]
        >`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'LoyaltyLedgerEntry'
            AND indexname = 'LoyaltyLedgerEntry_receiptId_key'
        `;
        expect(legacyIndex).toHaveLength(1);
        await priorSchema.$executeRaw`
          INSERT INTO "Tenant" ("id", "name", "status", "updatedAt")
          VALUES ('11111111-1111-4111-8111-111111111111', 'Upgrade restore fixture', 'ACTIVE', NOW())
        `;
      } finally {
        await priorSchema.$disconnect();
      }

      cpSync(
        join(migrationsRoot, targetMigration),
        join(tempMigrationsRoot, targetMigration),
        { recursive: true },
      );
      execSync(`npx prisma migrate deploy --schema "${tempSchemaPath}"`, {
        env,
        stdio: 'inherit',
      });

      execFileSync(
        'docker',
        [
          'exec',
          ...dockerEnv,
          containerId,
          'createdb',
          '-h',
          '127.0.0.1',
          '-U',
          container.getUsername(),
          restoreDatabase,
        ],
        { stdio: 'inherit' },
      );
      const backup = execFileSync(
        'docker',
        [
          'exec',
          ...dockerEnv,
          containerId,
          'pg_dump',
          '-h',
          '127.0.0.1',
          '-U',
          container.getUsername(),
          '--format=custom',
          container.getDatabase(),
        ],
        { maxBuffer: 100 * 1024 * 1024 },
      );
      execFileSync(
        'docker',
        [
          'exec',
          '-i',
          ...dockerEnv,
          containerId,
          'pg_restore',
          '-h',
          '127.0.0.1',
          '-U',
          container.getUsername(),
          '-d',
          restoreDatabase,
          '--no-owner',
        ],
        { input: backup, stdio: ['pipe', 'inherit', 'inherit'] },
      );

      const restoredUrl = new URL(databaseUrl);
      restoredUrl.pathname = `/${restoreDatabase}`;
      const restored = new PrismaClient({
        datasources: { db: { url: restoredUrl.toString() } },
      });
      try {
        const tenants = await restored.tenant.findMany({
          where: { id: '11111111-1111-4111-8111-111111111111' },
          select: { name: true },
        });
        expect(tenants).toEqual([{ name: 'Upgrade restore fixture' }]);

        const indexes = await restored.$queryRaw<{ indexname: string }[]>`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'LoyaltyLedgerEntry'
        `;
        const indexNames = indexes.map(({ indexname }) => indexname);
        expect(indexNames).not.toContain('LoyaltyLedgerEntry_receiptId_key');
        expect(indexNames).toContain(
          'LoyaltyLedgerEntry_tenantId_receiptId_idx',
        );
        expect(indexNames).toContain(
          'LoyaltyLedgerEntry_one_earn_per_receipt_key',
        );
        expect(indexNames).toContain(
          'LoyaltyLedgerEntry_one_redeem_per_receipt_key',
        );

        const appliedMigration = await restored.$queryRaw<
          { migration_name: string }[]
        >`
          SELECT migration_name FROM "_prisma_migrations"
          WHERE migration_name = ${targetMigration}
            AND finished_at IS NOT NULL
            AND rolled_back_at IS NULL
        `;
        expect(appliedMigration).toHaveLength(1);
      } finally {
        await restored.$disconnect();
      }
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
      await container.stop();
    }
  }, 180000);
});
