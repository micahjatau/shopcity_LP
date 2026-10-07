import { createHash } from 'node:crypto';
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync, chmodSync } from 'node:fs';
import { DeviceAuthBindingMode, PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const migrationName = '20261007_device_binding_mode_and_seed_uuid';
const legacyBranchId = '00000000-0000-0000-0000-000000000002';
const canonicalBranchId = '00000000-0000-4000-8000-000000000002';
const schemaBackupPath = process.env.SHOPCITY_SHARED_SCHEMA_DUMP_PATH;
const dataBackupPath = process.env.SHOPCITY_SHARED_DATA_DUMP_PATH;
const itIfSharedBackup = schemaBackupPath && dataBackupPath ? it : it.skip;

describe('device binding migration on restored shared development backup (int)', () => {
  itIfSharedBackup(
    'restores the current backup and rehearses the binding-aware migration without touching Supabase',
    async () => {
      const schemaMode = statSync(schemaBackupPath!).mode & 0o777;
      const dataMode = statSync(dataBackupPath!).mode & 0o777;
      expect(schemaMode & 0o077).toBe(0);
      expect(dataMode & 0o077).toBe(0);

      const schemaDump = readFileSync(schemaBackupPath!);
      const dataDump = readFileSync(dataBackupPath!);
      const backupChecksum = createHash('sha256')
        .update(schemaDump)
        .update('\n')
        .update(dataDump)
        .digest('hex');
      const restore = await new PostgreSqlContainer(
        'postgres:17-alpine',
      ).start();
      const prisma = new PrismaClient({
        datasources: { db: { url: restore.getConnectionUri() } },
      });

      try {
        restorePublicDatabase(
          restore,
          Buffer.concat([schemaDump, Buffer.from('\n'), dataDump]),
        );
        await prisma.$connect();

        const server = await prisma.$queryRaw<{ version: string }[]>`
          SELECT current_setting('server_version') AS version
        `;
        const version = Number(server[0]?.version.split('.')[0]);
        expect(version).toBe(17);

        const before = await prisma.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "Branch"
          WHERE "id" IN (${legacyBranchId}, ${canonicalBranchId})
        `;
        const hasLegacyBranch = before.some(
          (branch) => branch.id === legacyBranchId,
        );
        const hasCanonicalBranch = before.some(
          (branch) => branch.id === canonicalBranchId,
        );
        if (hasLegacyBranch && hasCanonicalBranch) {
          throw new Error(
            'The restored database contains both legacy and replacement branch IDs; review and reconcile this collision manually before migration approval.',
          );
        }
        const oldBranchReferences = hasLegacyBranch
          ? {
              devices: await prisma.device.count({
                where: { branchId: legacyBranchId },
              }),
              users: await prisma.user.count({
                where: { branchId: legacyBranchId },
              }),
              customers: await prisma.customer.count({
                where: { branchId: legacyBranchId },
              }),
              receipts: await prisma.receipt.count({
                where: { branchId: legacyBranchId },
              }),
              redemptions: await prisma.redemption.count({
                where: { branchId: legacyBranchId },
              }),
              policyConfigurations: await prisma.policyConfiguration.count({
                where: { branchId: legacyBranchId },
              }),
            }
          : {
              devices: 0,
              users: 0,
              customers: 0,
              receipts: 0,
              redemptions: 0,
              policyConfigurations: 0,
            };

        const oldConstraint = await prisma.$queryRaw<{ definition: string }[]>`
          SELECT pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE conname = 'Device_active_attestation_secret_check'
        `;
        expect(oldConstraint).toHaveLength(1);
        expect(oldConstraint[0]?.definition).toContain(
          'attestationSecretCiphertext',
        );

        const databaseUrl = restore.getConnectionUri();
        let status: string;
        try {
          status = execSync('npx prisma migrate status', {
            encoding: 'utf8',
            env: { ...process.env, DATABASE_URL: databaseUrl },
          });
        } catch (error) {
          const commandError = error as {
            stdout?: Buffer | string;
            stderr?: Buffer | string;
          };
          status = `${String(commandError.stdout ?? '')} ${String(commandError.stderr ?? '')}`;
        }
        expect(status).toContain(migrationName);
        expect(status).toContain(
          'Following migration have not yet been applied:',
        );
        expect(status.match(/^\d{8}_[^\r\n]+/gm)).toEqual([migrationName]);
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: databaseUrl },
        });

        const applied = await prisma.$queryRaw<
          { finished_at: Date | null; rolled_back_at: Date | null }[]
        >`
          SELECT "finished_at", "rolled_back_at"
          FROM "_prisma_migrations"
          WHERE "migration_name" = ${migrationName}
        `;
        expect(applied).toHaveLength(1);
        expect(applied[0]?.finished_at).not.toBeNull();
        expect(applied[0]?.rolled_back_at).toBeNull();

        const constraint = await prisma.$queryRaw<{ definition: string }[]>`
          SELECT pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE conname = 'Device_active_attestation_secret_check'
        `;
        expect(constraint).toHaveLength(1);
        expect(constraint[0]?.definition).toContain('HMAC_LEGACY');
        expect(constraint[0]?.definition).toContain(
          'attestationSecretCiphertext',
        );

        const after = await prisma.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "Branch"
          WHERE "id" IN (${legacyBranchId}, ${canonicalBranchId})
        `;
        expect(after.some((branch) => branch.id === legacyBranchId)).toBe(
          false,
        );
        if (hasLegacyBranch) {
          expect(after.some((branch) => branch.id === canonicalBranchId)).toBe(
            true,
          );
          await expect(
            prisma.device.count({ where: { branchId: canonicalBranchId } }),
          ).resolves.toBe(oldBranchReferences.devices);
          await expect(
            prisma.user.count({ where: { branchId: canonicalBranchId } }),
          ).resolves.toBe(oldBranchReferences.users);
          await expect(
            prisma.customer.count({ where: { branchId: canonicalBranchId } }),
          ).resolves.toBe(oldBranchReferences.customers);
          await expect(
            prisma.receipt.count({ where: { branchId: canonicalBranchId } }),
          ).resolves.toBe(oldBranchReferences.receipts);
          await expect(
            prisma.redemption.count({ where: { branchId: canonicalBranchId } }),
          ).resolves.toBe(oldBranchReferences.redemptions);
          await expect(
            prisma.policyConfiguration.count({
              where: { branchId: canonicalBranchId },
            }),
          ).resolves.toBe(oldBranchReferences.policyConfigurations);
        }

        const branch = hasLegacyBranch
          ? await prisma.branch.findUniqueOrThrow({
              where: { id: canonicalBranchId },
              select: { id: true, tenantId: true },
            })
          : await prisma.branch.findFirstOrThrow({
              select: { id: true, tenantId: true },
            });
        const inactiveUnpaired = await prisma.device.findFirst({
          where: {
            tenantId: branch.tenantId,
            branchId: branch.id,
            status: 'INACTIVE',
            authBindingMode: DeviceAuthBindingMode.UNPAIRED,
          },
          select: { id: true },
        });
        if (inactiveUnpaired) {
          await expect(
            prisma.device.update({
              where: { id: inactiveUnpaired.id },
              data: { status: 'ACTIVE' },
            }),
          ).resolves.toMatchObject({ status: 'ACTIVE' });
        }

        for (const authBindingMode of [
          DeviceAuthBindingMode.UNPAIRED,
          DeviceAuthBindingMode.WEBAUTHN,
        ]) {
          await expect(
            prisma.device.create({
              data: {
                tenantId: branch.tenantId,
                branchId: branch.id,
                name: `Approval rehearsal ${authBindingMode}`,
                authBindingMode,
              },
            }),
          ).resolves.toMatchObject({ status: 'ACTIVE', authBindingMode });
        }

        await expect(
          prisma.device.create({
            data: {
              tenantId: branch.tenantId,
              branchId: branch.id,
              name: 'Approval rehearsal HMAC without secret',
              authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
            },
          }),
        ).rejects.toThrow(/Device_active_attestation_secret_check/);

        await expect(
          prisma.device.create({
            data: {
              tenantId: branch.tenantId,
              branchId: branch.id,
              name: 'Approval rehearsal HMAC with secret',
              authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
              attestationSecretCiphertext: 'rehearsal-ciphertext',
              attestationSecretVersion: 1,
              attestationSecretRotatedAt: new Date(),
            },
          }),
        ).resolves.toMatchObject({
          status: 'ACTIVE',
          authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
        });

        const evidencePath =
          '/tmp/shopcity-device-binding-restored-backup-rehearsal.json';
        writeFileSync(
          evidencePath,
          JSON.stringify(
            {
              backupChecksum,
              backupModes: {
                schema: schemaMode.toString(8),
                data: dataMode.toString(8),
              },
              postgresMajorVersion: version,
              migration: migrationName,
              migrationAppliedInRestore: true,
              legacyBranchReconciled: hasLegacyBranch,
              cascadedBranchReferences: oldBranchReferences,
              bindingConstraintVerified: true,
              activeUnpairedReactivationVerified: Boolean(inactiveUnpaired),
              hmacSecretEnforcementVerified: true,
              sharedDatabaseModified: false,
            },
            null,
            2,
          ),
          { mode: 0o600 },
        );
        chmodSync(evidencePath, 0o600);
        console.log(
          `Restored-backup migration rehearsal passed: PostgreSQL ${version}, migration ${migrationName}, legacy branch present=${hasLegacyBranch}, branch references cascaded=${JSON.stringify(oldBranchReferences)}, backup SHA-256=${backupChecksum}. Evidence: ${evidencePath}`,
        );
      } finally {
        await prisma.$disconnect();
        await restore.stop();
      }
    },
    300000,
  );
});

type StartedPostgresContainer = Awaited<
  ReturnType<PostgreSqlContainer['start']>
> & { startedTestContainer: { getId(): string } };

function restorePublicDatabase(
  container: StartedPostgresContainer,
  backup: Buffer,
) {
  const bootstrap = Buffer.from(
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN CREATE ROLE postgres SUPERUSER LOGIN; END IF; END $$;\nDO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;\nDO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;\nDO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END $$;\nCREATE SCHEMA IF NOT EXISTS "extensions";\nCREATE SCHEMA IF NOT EXISTS "vault";\n`,
  );
  const sql = Buffer.concat([bootstrap, backup])
    .toString('utf8')
    .replace(
      /^CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";\s*$/gm,
      '',
    )
    .replace(
      /^ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";\s*$/gm,
      '',
    )
    .replace(/^SET transaction_timeout = 0;\s*$/gm, '');
  const trustedSql = Buffer.concat([
    Buffer.from('SET session_replication_role = replica;\n'),
    Buffer.from(sql),
    Buffer.from('\nSET session_replication_role = origin;\n'),
  ]);

  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${container.getPassword()}`,
      container.startedTestContainer.getId(),
      'psql',
      '-X',
      '-h',
      '127.0.0.1',
      '-U',
      container.getUsername(),
      '-d',
      container.getDatabase(),
      '-v',
      'ON_ERROR_STOP=1',
      '-q',
    ],
    { input: trustedSql, maxBuffer: 100 * 1024 * 1024 },
  );
}
