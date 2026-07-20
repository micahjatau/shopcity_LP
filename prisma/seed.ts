import { createClient } from '@supabase/supabase-js';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import {
  DEFAULT_PUBLIC_BRANCH_NAME,
  DEFAULT_PUBLIC_TENANT_NAME,
} from '../src/config/app.constants';

const prisma = new PrismaClient();
const WEAK_BOOTSTRAP_PASSWORDS = new Set([
  'password',
  'admin',
  'admin123',
  'shopcity',
  'replace-me-with-a-strong-password',
]);

type SupabaseAdminClient = ReturnType<typeof createClient>;

interface SupabaseBootstrapIdentity {
  id: string;
  created: boolean;
}

export interface SeedFoundationResult {
  tenant: { id: string; name: string };
  branch: { id: string; name: string };
  user: {
    id: string;
    tenantId: string;
    branchId: string | null;
    username: string;
    supabaseAuthId: string;
  };
  username: string;
  adminPassword: string;
  supabaseAuthId: string;
  actor: {
    session: {
      id: string;
      userId: string;
      sessionTokenHash: string;
      csrfTokenHash: string;
      status: 'ACTIVE';
      expiresAt: Date;
      revokedAt: Date | null;
      lastUsedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };
    user: {
      id: string;
      tenantId: string;
      branchId: string | null;
      username: string;
      supabaseAuthId: string;
      role: UserRole;
      status: UserStatus;
      createdAt: Date;
      updatedAt: Date;
      lastLoginAt: Date | null;
    };
  };
}

export interface SeedFoundationOptions {
  supabaseAdminClient?: SupabaseAdminClient;
  adminUsername?: string;
  adminPassword?: string;
}

export async function seedFoundation(
  prismaClient: PrismaClient,
  options: SeedFoundationOptions = {},
): Promise<SeedFoundationResult> {
  const tenantId =
    process.env.DEFAULT_PUBLIC_TENANT_ID ??
    '00000000-0000-0000-0000-000000000001';
  const branchId =
    process.env.DEFAULT_PUBLIC_BRANCH_ID ??
    '00000000-0000-0000-0000-000000000002';
  const adminUserId = '00000000-0000-0000-0000-000000000003';
  const username = options.adminUsername ?? 'admin@shopcity.local';
  const adminPassword = resolveBootstrapPassword(options.adminPassword);
  const supabaseAdminClient =
    options.supabaseAdminClient ?? createSupabaseAdminClient();

  const adminIdentity = await ensureSupabaseAdminUser(
    supabaseAdminClient,
    username,
    adminPassword,
  );

  let tenant: { id: string; name: string } | undefined;
  let branch: { id: string; name: string } | undefined;
  let user:
    | {
        id: string;
        tenantId: string;
        branchId: string | null;
        username: string;
        supabaseAuthId: string | null;
        role: UserRole;
        status: UserStatus;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
      }
    | undefined;

  try {
    tenant = await prismaClient.tenant.upsert({
      where: { id: tenantId },
      update: {
        name: DEFAULT_PUBLIC_TENANT_NAME,
        status: 'ACTIVE',
      },
      create: {
        id: tenantId,
        name: DEFAULT_PUBLIC_TENANT_NAME,
        status: 'ACTIVE',
      },
    });

    branch = await prismaClient.branch.upsert({
      where: { id: branchId },
      update: {
        tenantId,
        name: DEFAULT_PUBLIC_BRANCH_NAME,
        timezone: process.env.SHOPCITY_TIMEZONE ?? 'Africa/Lagos',
        receiptWeekStartDay: Number(process.env.RECEIPT_WEEK_START_DAY ?? 1),
        status: 'ACTIVE',
      },
      create: {
        id: branchId,
        tenantId,
        name: DEFAULT_PUBLIC_BRANCH_NAME,
        timezone: process.env.SHOPCITY_TIMEZONE ?? 'Africa/Lagos',
        receiptWeekStartDay: Number(process.env.RECEIPT_WEEK_START_DAY ?? 1),
        status: 'ACTIVE',
      },
    });

    user = await prismaClient.user.upsert({
      where: { id: adminUserId },
      update: {
        tenantId,
        branchId,
        username,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        supabaseAuthId: adminIdentity.id,
      },
      create: {
        id: adminUserId,
        tenantId,
        branchId,
        username,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        supabaseAuthId: adminIdentity.id,
      },
    });
  } catch (error) {
    if (adminIdentity.created) {
      try {
        await supabaseAdminClient.auth.admin.deleteUser(adminIdentity.id);
      } catch {
        // Ignore compensation failures so the original bootstrap error surfaces.
      }
    }

    throw error;
  }

  process.stdout.write(
    `Seeded foundation tenant ${tenantId}, branch ${branchId}, and admin user.\n`,
  );

  return {
    tenant: { id: tenant.id, name: tenant.name },
    branch: { id: branch.id, name: branch.name },
    user: {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      username: user.username,
      supabaseAuthId: user.supabaseAuthId ?? adminIdentity.id,
    },
    username,
    adminPassword,
    supabaseAuthId: adminIdentity.id,
    actor: {
      session: {
        id: 'session-1',
        userId: user.id,
        sessionTokenHash: 'hash',
        csrfTokenHash: 'hash',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: user.id,
        tenantId: user.tenantId,
        branchId: user.branchId,
        username: user.username,
        supabaseAuthId: user.supabaseAuthId ?? adminIdentity.id,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      },
    },
  };
}

async function main() {
  await seedFoundation(prisma);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

function createSupabaseAdminClient(): SupabaseAdminClient {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureSupabaseAdminUser(
  supabaseAdminClient: SupabaseAdminClient,
  username: string,
  password: string,
): Promise<SupabaseBootstrapIdentity> {
  const users = await supabaseAdminClient.auth.admin.listUsers();
  const existingUser = (users.data.users as Array<{ id: string; email?: string | null }>).find(
    (user) => user.email === username,
  );
  if (existingUser) {
    const updateResult = await supabaseAdminClient.auth.admin.updateUserById(
      existingUser.id,
      {
        password,
        email_confirm: true,
      },
    );

    if (updateResult.error) {
      throw new Error(
        updateResult.error.message ?? 'Unable to update bootstrap Supabase user',
      );
    }

    return { id: existingUser.id, created: false };
  }

  const authResult = await supabaseAdminClient.auth.admin.createUser({
    email: username,
    password,
    email_confirm: true,
  });

  if (authResult.error || !authResult.data.user) {
    throw new Error(
      authResult.error?.message ?? 'Unable to create bootstrap Supabase user',
    );
  }

  return { id: authResult.data.user.id, created: true };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for bootstrap seeding`);
  }

  return value;
}

function resolveBootstrapPassword(override?: string): string {
  const candidate =
    override ?? process.env.DEFAULT_ADMIN_PASSWORD ?? defaultTestPassword();

  if (!candidate) {
    throw new Error('DEFAULT_ADMIN_PASSWORD is required for bootstrap seeding');
  }

  if (!isTestEnvironment() && isWeakBootstrapPassword(candidate)) {
    throw new Error('DEFAULT_ADMIN_PASSWORD must not use a weak default');
  }

  return candidate;
}

function defaultTestPassword(): string | undefined {
  return isTestEnvironment() ? 'password' : undefined;
}

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test';
}

function isWeakBootstrapPassword(password: string): boolean {
  return WEAK_BOOTSTRAP_PASSWORDS.has(password.toLowerCase());
}
