import { seedFoundation } from '../prisma/seed';

describe('bootstrap credential handling', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects weak bootstrap passwords outside tests', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEFAULT_ADMIN_PASSWORD = 'password';

    await expect(
      seedFoundation({} as never, {
        adminPassword: 'password',
        supabaseAdminClient: supabaseAdminClientStub(),
      }),
    ).rejects.toThrow('DEFAULT_ADMIN_PASSWORD must not use a weak default');
  });

  it('rejects the documented bootstrap placeholder outside tests', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEFAULT_ADMIN_PASSWORD = 'replace-me-with-a-strong-password';

    await expect(
      seedFoundation({} as never, {
        adminPassword: 'replace-me-with-a-strong-password',
        supabaseAdminClient: supabaseAdminClientStub(),
      }),
    ).rejects.toThrow('DEFAULT_ADMIN_PASSWORD must not use a weak default');
  });

  it('fails fast when Supabase credentials are missing', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEFAULT_ADMIN_PASSWORD = 'Strong-password-123!';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(seedFoundation({} as never)).rejects.toThrow(
      'SUPABASE_URL is required for bootstrap seeding',
    );
  });
});

function supabaseAdminClientStub() {
  return {
    auth: {
      admin: {
        listUsers: jest.fn(),
        createUser: jest.fn(),
        updateUserById: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  } as never;
}
