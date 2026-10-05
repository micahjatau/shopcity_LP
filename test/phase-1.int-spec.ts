import { execSync } from 'node:child_process';
import {
  PrismaClient,
  CardStatus,
  CustomerStatus,
  SessionStatus,
  LedgerEntryType,
  LedgerEntryDirection,
  LedgerEntryStatus,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { AuthService } from '../src/modules/auth/auth.service';
import { CardsService } from '../src/modules/cards/cards.service';
import { CustomersService } from '../src/modules/customers/customers.service';
import { seedFoundation } from '../prisma/seed';

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
    const seed = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(),
    });
    const service = new CustomersService(prisma as never, auditStub() as never);

    const created = await service.createCustomer(
      seed.tenant.id,
      seed.actor,
      {
        fullName: 'Ada Lovelace',
        phone: '08012345678',
        cardSerialNumber: 'SC-PHASE1-0001',
        loyaltyConsent: true,
        marketingOptIn: false,
      },
      'phase-1-customer-create',
    );

    expect(created.phoneE164).toBe('+2348012345678');
    const consent = await prisma.customerConsent.findUniqueOrThrow({
      where: {
        tenantId_customerId: {
          tenantId: seed.tenant.id,
          customerId: created.id,
        },
      },
    });
    expect(consent).toMatchObject({
      loyaltyConsent: true,
      marketingOptIn: false,
      consentVersion: 'v1.2',
      privacyNoticeVersion: 'v2.0',
      capturedBy: seed.user.id,
    });
    await expect(
      prisma.customerConsent.update({
        where: { id: consent.id },
        data: { marketingOptIn: true },
      }),
    ).rejects.toThrow('CustomerConsent records are append-only');
    await expect(
      prisma.customerConsent.delete({ where: { id: consent.id } }),
    ).rejects.toThrow('CustomerConsent records are append-only');

    await expect(
      service.createCustomer(
        seed.tenant.id,
        seed.actor,
        {
          fullName: 'Ada Lovelace',
          phone: '+2348012345678',
          cardSerialNumber: 'SC-PHASE1-0002',
          loyaltyConsent: true,
          marketingOptIn: false,
        },
        'phase-1-customer-duplicate',
      ),
    ).rejects.toThrow('Active customer already exists');

    const customers = await prisma.customer.findMany({
      where: { tenantId: seed.tenant.id },
    });
    expect(customers).toHaveLength(1);
  });

  it('preserves card replacement history', async () => {
    const seed = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(),
    });
    const service = new CardsService(prisma as never, auditStub() as never);

    const customer = await prisma.customer.create({
      data: {
        tenantId: seed.tenant.id,
        branchId: seed.branch.id,
        fullName: 'Ada Lovelace',
        email: 'ada.lovelace@shopcity.local',
        phoneE164: '+2348012345679',
        isStaff: false,
        status: CustomerStatus.ACTIVE,
        registeredByTenantId: seed.tenant.id,
        registeredBy: seed.user.id,
      },
    });
    const card = await prisma.card.create({
      data: {
        tenantId: seed.tenant.id,
        customerId: customer.id,
        barcodeValue: 'SC-0001',
        status: CardStatus.ACTIVE,
        issuedByTenantId: seed.tenant.id,
        issuedBy: seed.user.id,
      },
    });

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          tenantId: seed.tenant.id,
          branchId: seed.branch.id,
          customerId: customer.id,
          cardId: card.id,
          posReceiptNumber: 'SC-REPLACE-BALANCE-1',
          normalizedPosReceiptNumber: 'sc-replace-balance-1',
          receiptWeekStart: new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
          ),
          purchaseAmountKobo: 2500,
          occurredAt: now,
          capturedByTenantId: seed.tenant.id,
          capturedBy: seed.user.id,
          captureStatus: ReceiptCaptureStatus.CAPTURED,
          reviewStatus: ReceiptReviewStatus.APPROVED,
          reviewedAt: now,
          reviewedByTenantId: seed.tenant.id,
          reviewedBy: seed.user.id,
          approvedByTenantId: seed.tenant.id,
          approvedBy: seed.user.id,
          approvedAt: now,
        },
      });
      const earn = await tx.loyaltyLedgerEntry.create({
        data: {
          tenantId: seed.tenant.id,
          customerId: customer.id,
          receiptId: receipt.id,
          type: LedgerEntryType.EARN,
          direction: LedgerEntryDirection.CREDIT,
          amountKobo: 2500n,
          status: LedgerEntryStatus.CONFIRMED,
          correlationId: 'phase-1-replacement-preexisting-balance',
          createdByTenantId: seed.tenant.id,
          createdBy: seed.user.id,
          effectiveAt: now,
        },
      });
      await tx.creditLot.create({
        data: {
          tenantId: seed.tenant.id,
          customerId: customer.id,
          earnLedgerEntryId: earn.id,
          originalAmountKobo: 2500n,
          remainingAmountKobo: 2500n,
          earnedAt: now,
          expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    });
    const readAvailableBalanceKobo = async () => {
      const balance = await prisma.creditLot.aggregate({
        where: {
          tenantId: seed.tenant.id,
          customerId: customer.id,
          remainingAmountKobo: { gt: 0 },
          expiresAt: { gt: new Date() },
        },
        _sum: { remainingAmountKobo: true },
      });
      return balance._sum.remainingAmountKobo ?? 0n;
    };
    const balanceBefore = await readAvailableBalanceKobo();
    expect(balanceBefore).toBe(2500n);
    const ledgerEntriesBefore = await prisma.loyaltyLedgerEntry.count({
      where: { tenantId: seed.tenant.id, customerId: customer.id },
    });
    const replacement = await service.replaceCard(
      seed.tenant.id,
      seed.actor,
      card.id,
      {
        serialNumber: 'SC-0002',
      },
      'phase-1-card-replacement',
    );

    expect(replacement.serialNumber).toBe('SC-0002');

    const replaced = await prisma.card.findUnique({ where: { id: card.id } });
    expect(replaced?.status).toBe(CardStatus.REPLACED);
    expect(replaced?.replacedByCardId).toBe(replacement.id);
    expect(
      await prisma.loyaltyLedgerEntry.count({
        where: { tenantId: seed.tenant.id, customerId: customer.id },
      }),
    ).toBe(ledgerEntriesBefore);
    expect(await readAvailableBalanceKobo()).toBe(balanceBefore);
  });

  it('issues and refreshes backend sessions', async () => {
    const seed = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(),
    });
    await prisma.session.deleteMany({ where: { userId: seed.user.id } });
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

    const issued = await authService.login(seed.username, seed.adminPassword);
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

  it('rejects concurrent session rotation attempts', async () => {
    const seed = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(),
    });
    await prisma.session.deleteMany({ where: { userId: seed.user.id } });
    const authService = new AuthService(
      prisma as never,
      {
        publicClient: {
          auth: {
            signInWithPassword: () =>
              Promise.resolve({
                data: { user: { id: seed.supabaseAuthId } },
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

    const issued = await authService.login(seed.username, seed.adminPassword);
    const initialSession = await prisma.session.findFirst({
      where: { userId: seed.user.id },
    });

    const rotationResults = await Promise.allSettled([
      authService.refresh(initialSession!.id),
      authService.refresh(initialSession!.id),
    ]);
    expect(
      rotationResults.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      rotationResults.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);

    const sessions = await prisma.session.findMany({
      where: { userId: seed.user.id },
    });
    expect(sessions).toHaveLength(2);
    expect(
      sessions.filter((session) => session.status === SessionStatus.ACTIVE),
    ).toHaveLength(1);
    expect(issued.context.user.id).toBe(seed.user.id);
  });

  it('blocks duplicate active card creation and replacement races', async () => {
    const seed = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(),
    });
    const cardsService = new CardsService(
      prisma as never,
      auditStub() as never,
    );

    const customer = await prisma.customer.create({
      data: {
        tenantId: seed.tenant.id,
        branchId: seed.branch.id,
        fullName: 'Ada Lovelace',
        email: 'ada.lovelace+2@shopcity.local',
        phoneE164: '+2348012345680',
        isStaff: false,
        status: CustomerStatus.ACTIVE,
        registeredByTenantId: seed.tenant.id,
        registeredBy: seed.user.id,
      },
    });

    const [createA, createB] = await Promise.allSettled([
      cardsService.createCard(
        seed.tenant.id,
        seed.actor,
        {
          customerId: customer.id,
          serialNumber: 'SC-1001',
        },
        'phase-1-card-create-a',
      ),
      cardsService.createCard(
        seed.tenant.id,
        seed.actor,
        {
          customerId: customer.id,
          serialNumber: 'SC-1002',
        },
        'phase-1-card-create-b',
      ),
    ]);

    expect(
      [createA.status, createB.status].filter(
        (status) => status === 'fulfilled',
      ),
    ).toHaveLength(1);

    const createdCards = await prisma.card.findMany({
      where: { tenantId: seed.tenant.id, customerId: customer.id },
    });
    expect(
      createdCards.filter((card) => card.status === CardStatus.ACTIVE),
    ).toHaveLength(1);

    const activeCard = createdCards.find(
      (card) => card.status === CardStatus.ACTIVE,
    )!;
    const [replaceA, replaceB] = await Promise.allSettled([
      cardsService.replaceCard(
        seed.tenant.id,
        seed.actor,
        activeCard.id,
        {
          serialNumber: 'SC-2001',
        },
        'phase-1-card-replace-a',
      ),
      cardsService.replaceCard(
        seed.tenant.id,
        seed.actor,
        activeCard.id,
        {
          serialNumber: 'SC-2002',
        },
        'phase-1-card-replace-b',
      ),
    ]);

    expect(
      [replaceA.status, replaceB.status].filter(
        (status) => status === 'fulfilled',
      ),
    ).toHaveLength(1);

    const cardsAfterReplacement = await prisma.card.findMany({
      where: { tenantId: seed.tenant.id, customerId: customer.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(
      cardsAfterReplacement.filter((card) => card.status === CardStatus.ACTIVE),
    ).toHaveLength(1);
    expect(
      cardsAfterReplacement.some((card) => card.status === CardStatus.REPLACED),
    ).toBe(true);
  });
});

function auditStub() {
  return {
    record: () => Promise.resolve(undefined),
    recordWithClient: () => Promise.resolve(undefined),
  };
}

function createSupabaseAdminStub() {
  return {
    auth: {
      admin: {
        listUsers: jest
          .fn()
          .mockResolvedValue({ data: { users: [] }, error: null }),
        createUser: jest
          .fn()
          .mockImplementation(({ email }: { email?: string }) => ({
            data: {
              user: {
                id: email?.startsWith('cashier@')
                  ? 'seed-cashier-supabase-user'
                  : email?.startsWith('supervisor@')
                    ? 'seed-supervisor-supabase-user'
                    : 'seed-admin-supabase-user',
              },
            },
            error: null,
          })),
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  } as never;
}
