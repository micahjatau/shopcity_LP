import { execSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';

describe('outbox migration deploy (int)', () => {
  it('applies the outbox schema cleanly and exposes the expected indexes', async () => {
    const container = await new PostgreSqlContainer(
      'postgres:16-alpine',
    ).start();
    const databaseUrl = container.getConnectionUri();
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
      });

      const indexRows = await prisma.$queryRaw<{ indexname: string }[]>`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'SmsMessage'
      `;

      const enumRows = await prisma.$queryRaw<{ enumlabel: string }[]>`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'SmsMessageStatus'
        ORDER BY e.enumsortorder
      `;

      expect(indexRows.map((row) => row.indexname)).toEqual(
        expect.arrayContaining([
          'SmsMessage_pkey',
          'SmsMessage_tenantId_outboxEventId_key',
          'SmsMessage_tenantId_status_queuedAt_idx',
          'SmsMessage_tenantId_receiptId_idx',
          'SmsMessage_tenantId_ledgerEntryId_idx',
          'SmsMessage_tenantId_redemptionId_idx',
          'SmsMessage_tenantId_adjustmentId_idx',
        ]),
      );
      expect(indexRows.map((row) => row.indexname)).not.toContain(
        'SmsMessage_tenantId_receiptId_key',
      );
      expect(indexRows.map((row) => row.indexname)).not.toContain(
        'SmsMessage_outboxEventId_key',
      );
      expect(enumRows.map((row) => row.enumlabel)).toEqual([
        'QUEUED',
        'SENT',
        'DELIVERED',
        'FAILED',
        'SUPPRESSED',
      ]);
    } finally {
      await prisma.$disconnect();
      await container.stop();
    }
  }, 240000);
});
