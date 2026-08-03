import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

type ExecablePostgresContainer = Awaited<
  ReturnType<PostgreSqlContainer['start']>
> & {
  startedTestContainer: {
    getId(): string;
  };
};

describe('receipt quarantine sql runbooks (int)', () => {
  it('executes the operational receipt quarantine SQL runbooks', async () => {
    const container = (await new PostgreSqlContainer(
      'postgres:16-alpine',
    ).start()) as ExecablePostgresContainer;

    try {
      runSql(
        container,
        `
          CREATE TABLE "Receipt" (
            "id" TEXT PRIMARY KEY,
            "tenantId" TEXT NOT NULL,
            "branchId" TEXT NOT NULL,
            "receiptWeekStart" TIMESTAMP(3) NOT NULL,
            "externalReceiptNumber" TEXT,
            "capturedAt" TIMESTAMP(3) NOT NULL,
            "updatedAt" TIMESTAMP(3) NOT NULL
          );

          INSERT INTO "Receipt" (
            "id",
            "tenantId",
            "branchId",
            "receiptWeekStart",
            "externalReceiptNumber",
            "capturedAt",
            "updatedAt"
          ) VALUES
            (
              'receipt-1',
              'tenant-1',
              'branch-1',
              '2026-07-20T00:00:00.000Z',
              ' pos-dup-1 ',
              '2026-07-20T09:00:00.000Z',
              '2026-07-20T09:00:00.000Z'
            ),
            (
              'receipt-2',
              'tenant-1',
              'branch-1',
              '2026-07-20T00:00:00.000Z',
              'POS-DUP-1',
              '2026-07-20T10:00:00.000Z',
              '2026-07-20T10:00:00.000Z'
            ),
            (
              'receipt-3',
              'tenant-1',
              'branch-1',
              '2026-07-20T00:00:00.000Z',
              'POS-UNIQUE',
              '2026-07-20T11:00:00.000Z',
              '2026-07-20T11:00:00.000Z'
            );

          CREATE TABLE "ReceiptLegacyIdentityQuarantineBatch" (
            "id" TEXT PRIMARY KEY,
            "incidentReferenceId" TEXT NOT NULL,
            "createdBy" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
            "approvedBy" TEXT,
            "approvedAt" TIMESTAMP(3),
            "executedBy" TEXT,
            "executedAt" TIMESTAMP(3),
            "status" TEXT NOT NULL DEFAULT 'DRAFT',
            "notes" TEXT
          );

          CREATE TABLE "ReceiptLegacyIdentityQuarantineApproval" (
            "batchId" TEXT NOT NULL,
            "id" TEXT PRIMARY KEY,
            "reconciliationPlan" TEXT,
            "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
          );

          INSERT INTO "ReceiptLegacyIdentityQuarantineBatch" (
            "id",
            "incidentReferenceId",
            "createdBy",
            "approvedBy",
            "approvedAt",
            "status",
            "notes"
          ) VALUES (
            'batch-1',
            'incident-1',
            'admin-1',
            'admin-2',
            '2026-07-21T00:00:00.000Z',
            'APPROVED',
            'duplicate receipt review'
          );

          INSERT INTO "ReceiptLegacyIdentityQuarantineApproval" (
            "batchId",
            "id",
            "reconciliationPlan"
          ) VALUES (
            'batch-1',
            'receipt-2',
            'quarantine duplicate and preserve audit trail'
          );
        `,
      );

      runSqlFile(
        container,
        'docs/runbooks/report-duplicate-legacy-receipts.sql',
      );
      runSqlFile(
        container,
        'docs/runbooks/stage-approved-receipt-quarantine.sql',
      );

      expect(
        queryScalar(
          container,
          `SELECT COUNT(*) FROM "ReceiptLegacyIdentityQuarantineStage";`,
        ),
      ).toBe('1');
      expect(
        queryScalar(
          container,
          `SELECT "status" FROM "ReceiptLegacyIdentityQuarantineBatch" WHERE "id" = 'batch-1';`,
        ),
      ).toBe('STAGED');

      runSqlFile(
        container,
        'docs/runbooks/execute-approved-receipt-quarantine.sql',
      );

      expect(
        queryScalar(
          container,
          `SELECT COUNT(*) FROM "ReceiptLegacyIdentityQuarantine";`,
        ),
      ).toBe('1');
      expect(queryScalar(container, `SELECT COUNT(*) FROM "Receipt";`)).toBe(
        '2',
      );
      expect(
        queryScalar(
          container,
          `SELECT "status" FROM "ReceiptLegacyIdentityQuarantineBatch" WHERE "id" = 'batch-1';`,
        ),
      ).toBe('EXECUTED');
    } finally {
      await container.stop();
    }
  }, 120000);
});

function runSql(container: ExecablePostgresContainer, sql: string) {
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${container.getPassword()}`,
      container.startedTestContainer.getId(),
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      container.getUsername(),
      '-d',
      container.getDatabase(),
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: sql, maxBuffer: 50 * 1024 * 1024 },
  );
}

function runSqlFile(container: ExecablePostgresContainer, filePath: string) {
  const sql = readFileSync(filePath, 'utf8');

  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${container.getPassword()}`,
      container.startedTestContainer.getId(),
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      container.getUsername(),
      '-d',
      container.getDatabase(),
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: sql, maxBuffer: 50 * 1024 * 1024 },
  );
}

function queryScalar(container: ExecablePostgresContainer, sql: string) {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${container.getPassword()}`,
      container.startedTestContainer.getId(),
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      container.getUsername(),
      '-d',
      container.getDatabase(),
      '-tAq',
      '-c',
      sql,
    ],
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
  ).trim();
}
