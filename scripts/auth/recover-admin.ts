import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_ADMIN_USERNAME = 'admin@shopcity.local';
const RECOVERY_CONFIRMATION = 'RECOVER_ADMIN_AUTH';
const WEAK_PASSWORDS = new Set([
  'password',
  'admin',
  'admin123',
  'shopcity',
  'replace-me-with-a-strong-password',
]);

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for admin auth recovery`);
  }
  return value;
}

function assertRecoveryPassword(password: string): void {
  if (password.length < 12 || WEAK_PASSWORDS.has(password.toLowerCase())) {
    throw new Error(
      'DEFAULT_ADMIN_PASSWORD must be a strong non-placeholder password',
    );
  }
}

export async function recoverAdminAuth(): Promise<void> {
  if (process.env.AUTH_RECOVERY_CONFIRM !== RECOVERY_CONFIRMATION) {
    throw new Error(
      `Set AUTH_RECOVERY_CONFIRM=${RECOVERY_CONFIRMATION} to run admin auth recovery`,
    );
  }

  const username = (
    process.env.ADMIN_RECOVERY_USERNAME ?? DEFAULT_ADMIN_USERNAME
  )
    .trim()
    .toLowerCase();
  const password = requiredEnv('DEFAULT_ADMIN_PASSWORD');
  assertRecoveryPassword(password);

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const anonKey = requiredEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  requiredEnv('DATABASE_URL');

  const prisma = new PrismaClient();
  const authOptions = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  };
  const serviceRoleClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    authOptions,
  );
  const publicClient = createClient(supabaseUrl, anonKey, authOptions);

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (!user) {
      throw new Error(`ShopCity user not found for ${username}`);
    }
    if (user.role !== UserRole.ADMIN) {
      throw new Error(`Refusing recovery: ${username} is not an ADMIN user`);
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error(`Refusing recovery: ${username} is not ACTIVE`);
    }
    if (user.tenant.status !== 'ACTIVE') {
      throw new Error(`Refusing recovery: tenant for ${username} is not ACTIVE`);
    }
    if (!user.branch || user.branch.status !== 'ACTIVE') {
      throw new Error(`Refusing recovery: branch for ${username} is not ACTIVE`);
    }
    if (!user.supabaseAuthId) {
      throw new Error(`Refusing recovery: ${username} has no Supabase identity`);
    }

    const authUserResult =
      await serviceRoleClient.auth.admin.getUserById(user.supabaseAuthId);
    if (authUserResult.error || !authUserResult.data.user) {
      throw new Error(
        authUserResult.error?.message ??
          `Supabase identity not found for ${username}`,
      );
    }

    const authEmail = authUserResult.data.user.email?.trim().toLowerCase();
    if (authEmail !== username) {
      throw new Error(
        `Refusing recovery: Supabase email ${authEmail ?? '<missing>'} does not match ${username}`,
      );
    }

    const updateResult = await serviceRoleClient.auth.admin.updateUserById(
      user.supabaseAuthId,
      {
        password,
        email_confirm: true,
      },
    );
    if (updateResult.error || !updateResult.data.user) {
      throw new Error(
        updateResult.error?.message ?? 'Supabase admin password update failed',
      );
    }

    const verification = await publicClient.auth.signInWithPassword({
      email: username,
      password,
    });
    if (verification.error || !verification.data.user) {
      throw new Error(
        verification.error?.message ??
          'Recovered password could not authenticate against Supabase',
      );
    }
    if (verification.data.user.id !== user.supabaseAuthId) {
      throw new Error('Recovered credentials authenticated the wrong identity');
    }

    const now = new Date();
    const [revoked] = await prisma.$transaction([
      prisma.session.updateMany({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
        data: {
          status: 'REVOKED',
          revokedAt: now,
        },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.id,
          actorTenantId: user.tenantId,
          action: 'auth.admin.recovery',
          entityType: 'user',
          entityId: user.id,
          metadata: {
            username,
            supabaseAuthId: user.supabaseAuthId,
            sessionsRevokedAt: now.toISOString(),
            source: 'scripts/auth/recover-admin.ts',
          },
        },
      }),
    ]);

    process.stdout.write(
      `Admin auth recovered for ${username}; revoked ${revoked.count} ShopCity session(s).\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  recoverAdminAuth().catch((error) => {
    const message =
      error instanceof Error ? error.message : 'Unknown admin auth recovery error';
    process.stderr.write(`Admin auth recovery failed: ${message}\n`);
    process.exitCode = 1;
  });
}
