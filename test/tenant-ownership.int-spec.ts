import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { AuditService } from '../src/modules/audit/audit.service';

describe('tenant ownership constraints', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = container.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  }, 120000);

  it('rejects cross-tenant actor and audit writes', async () => {
    const tenantA = await prisma.tenant.create({
      data: { name: 'Tenant A', status: 'ACTIVE' },
    });
    const tenantB = await prisma.tenant.create({
      data: { name: 'Tenant B', status: 'ACTIVE' },
    });
    const branchA = await prisma.branch.create({
      data: {
        tenantId: tenantA.id,
        name: 'Branch A',
        timezone: 'Africa/Lagos',
        receiptWeekStartDay: 1,
        status: 'ACTIVE',
      },
    });
    const branchB = await prisma.branch.create({
      data: {
        tenantId: tenantB.id,
        name: 'Branch B',
        timezone: 'Africa/Lagos',
        receiptWeekStartDay: 1,
        status: 'ACTIVE',
      },
    });
    await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA.id,
        username: 'a@shopcity.local',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    const userB = await prisma.user.create({
      data: {
        tenantId: tenantB.id,
        branchId: branchB.id,
        username: 'b@shopcity.local',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    await expect(
      prisma.customer.create({
        data: {
          tenantId: tenantA.id,
          branchId: branchA.id,
          fullName: 'Ada Lovelace',
          phoneE164: '+2348012345678',
          registeredByTenantId: tenantB.id,
          registeredBy: userB.id,
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.auditLog.create({
        data: {
          tenantId: tenantA.id,
          actorTenantId: tenantB.id,
          actorId: userB.id,
          action: 'test.cross-tenant',
          entityType: 'customer',
        },
      }),
    ).rejects.toThrow();
  });

  it('persists actorless system audit events', async () => {
    const tenant = await prisma.tenant.create({
      data: { name: 'System Tenant', status: 'ACTIVE' },
    });
    const auditService = new AuditService(prisma as never);

    await auditService.record({
      tenantId: tenant.id,
      action: 'system.rebuild',
      entityType: 'receipt',
      requestId: 'request-1',
      metadata: { source: 'job' },
    });

    const entry = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'system.rebuild',
      },
    });

    expect(entry).toMatchObject({
      tenantId: tenant.id,
      actorTenantId: null,
      actorId: null,
      requestId: 'request-1',
    });
  });
});
