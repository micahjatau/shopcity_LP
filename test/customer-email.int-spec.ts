import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { CardsService } from '../src/modules/cards/cards.service';
import { CustomersService } from '../src/modules/customers/customers.service';
import { seedFoundation } from '../prisma/seed';

describe('customer email identity', () => {
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

  it('stores and searches customers by email and card serial', async () => {
    const seed = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(),
    });
    const customersService = new CustomersService(
      prisma as never,
      auditStub() as never,
    );
    const cardsService = new CardsService(
      prisma as never,
      auditStub() as never,
    );

    const customer = await customersService.createCustomer(
      seed.tenant.id,
      seed.actor,
      {
        fullName: 'Ada Lovelace',
        phone: '08012345678',
        email: 'Ada.Lovelace@ShopCity.Local',
      },
    );
    const card = await cardsService.createCard(seed.tenant.id, seed.actor, {
      customerId: customer.id,
      serialNumber: 'SC-0001',
    });

    expect(customer.email).toBe('ada.lovelace@shopcity.local');

    const byEmail = await customersService.listCustomers(
      seed.tenant.id,
      'ada.lovelace@shopcity.local',
    );
    const bySerial = await customersService.listCustomers(
      seed.tenant.id,
      card.serialNumber,
    );

    expect(byEmail).toHaveLength(1);
    expect(bySerial).toHaveLength(1);
    expect(byEmail[0].id).toBe(customer.id);
    expect(bySerial[0].id).toBe(customer.id);
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
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'seed-admin-supabase-user' } },
          error: null,
        }),
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  } as never;
}
