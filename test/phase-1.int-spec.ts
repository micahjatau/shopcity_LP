import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  PrismaClient,
  UserRole,
  UserStatus,
  CardStatus,
  CustomerStatus,
  SessionStatus,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { AuthService } from '../src/modules/auth/auth.service';
import { CardsService } from '../src/modules/cards/cards.service';
import { CustomersService } from '../src/modules/customers/customers.service';

describe('phase 1 service flows', () => {
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

  it('normalizes phones and blocks duplicate active customers', async () => {
    const seed = await seedFoundation(prisma);
    const service = new CustomersService(prisma as never, auditStub() as never);

    const created = await service.createCustomer(seed.tenant.id, seed.actor, {
      fullName: 'Ada Lovelace',
      phone: '08012345678',
    });

    expect(created.phoneE164).toBe('+2348012345678');

    await expect(
      service.createCustomer(seed.tenant.id, seed.actor, {
        fullName: 'Ada Lovelace',
        phone: '08012345678',
      }),
    ).rejects.toThrow('Active customer already exists for this phone');

    const customers = await prisma.customer.findMany({
      where: { tenantId: seed.tenant.id },
    });
    expect(customers).toHaveLength(1);
  });

  it('preserves card replacement history', async () => {
    const seed = await seedFoundation(prisma);
    const service = new CardsService(prisma as never, auditStub() as never);

    const customer = await prisma.customer.create({
      data: {
        tenantId: seed.tenant.id,
        branchId: seed.branch.id,
        fullName: 'Ada Lovelace',
        phoneE164: '+2348012345678',
        isStaff: false,
        status: CustomerStatus.ACTIVE,
        registeredBy: seed.user.id,
      },
    });
    const card = await prisma.card.create({
      data: {
        tenantId: seed.tenant.id,
        customerId: customer.id,
        barcodeValue: 'SC-0001',
        status: CardStatus.ACTIVE,
        issuedBy: seed.user.id,
      },
    });

    const replacement = await service.replaceCard(
      seed.tenant.id,
      seed.actor,
      card.id,
      {
        barcodeValue: 'SC-0002',
      },
    );

    expect(replacement.barcodeValue).toBe('SC-0002');

    const replaced = await prisma.card.findUnique({ where: { id: card.id } });
    expect(replaced?.status).toBe(CardStatus.REPLACED);
    expect(replaced?.replacedByCardId).toBe(replacement.id);
  });

  it('issues and refreshes backend sessions', async () => {
    const seed = await seedFoundation(prisma);
    const authService = new AuthService(
      prisma as never,
      {
        publicClient: {
          auth: {
            signInWithPassword: () =>
              Promise.resolve({
                data: { user: { id: seed.user.supabaseAuthId } },
                error: null,
              }),
          },
        },
        serviceRoleClient: { auth: { admin: {} } },
      } as never,
      {
        get: (key: string) =>
          key === 'SESSION_SECRET' ? 'session-secret' : 'csrf-secret',
      } as never,
      auditStub() as never,
    );

    const issued = await authService.login(seed.username, 'password');
    expect(issued.context.user.id).toBe(seed.user.id);

    const firstSession = await prisma.session.findMany({
      where: { userId: seed.user.id },
    });
    expect(firstSession).toHaveLength(1);

    const refreshed = await authService.refresh(firstSession[0].id);
    expect(refreshed.context.user.id).toBe(seed.user.id);

    const sessions = await prisma.session.findMany({
      where: { userId: seed.user.id },
    });
    expect(sessions).toHaveLength(2);
    expect(
      sessions.some((session) => session.status === SessionStatus.REVOKED),
    ).toBe(true);
  });
});

async function seedFoundation(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const supabaseAuthId = randomUUID();
  const username = `admin-${userId.slice(0, 8)}@shopcity.local`;

  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: { name: 'ShopCity', status: 'ACTIVE' },
    create: {
      id: tenantId,
      name: 'ShopCity',
      status: 'ACTIVE',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: branchId },
    update: {
      tenantId: tenant.id,
      name: 'Main Branch',
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
    create: {
      id: branchId,
      tenantId: tenant.id,
      name: 'Main Branch',
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
  });

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {
      tenantId: tenant.id,
      branchId: branch.id,
      username,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      supabaseAuthId,
    },
    create: {
      id: userId,
      tenantId: tenant.id,
      branchId: branch.id,
      username,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      supabaseAuthId,
    },
  });

  return {
    tenant,
    branch,
    user,
    username,
    actor: {
      session: {
        id: 'session-1',
        userId: user.id,
        sessionTokenHash: 'hash',
        refreshTokenHash: 'hash',
        csrfTokenHash: 'hash',
        status: SessionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user,
    },
  };
}

function auditStub() {
  return {
    record: () => Promise.resolve(undefined),
    recordWithClient: () => Promise.resolve(undefined),
  };
}
