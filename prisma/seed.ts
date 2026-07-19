import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import {
  DEFAULT_PUBLIC_BRANCH_NAME,
  DEFAULT_PUBLIC_TENANT_NAME,
} from '../src/config/app.constants';

const prisma = new PrismaClient();

async function main() {
  const tenantId =
    process.env.DEFAULT_PUBLIC_TENANT_ID ??
    '00000000-0000-0000-0000-000000000001';
  const branchId =
    process.env.DEFAULT_PUBLIC_BRANCH_ID ??
    '00000000-0000-0000-0000-000000000002';
  const adminUserId = '00000000-0000-0000-0000-000000000003';

  await prisma.tenant.upsert({
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

  await prisma.branch.upsert({
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

  await prisma.user.upsert({
    where: { id: adminUserId },
    update: {
      tenantId,
      branchId,
      username: 'admin@shopcity.local',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      supabaseAuthId: 'seed-admin-supabase-user',
    },
    create: {
      id: adminUserId,
      tenantId,
      branchId,
      username: 'admin@shopcity.local',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      supabaseAuthId: 'seed-admin-supabase-user',
    },
  });

  process.stdout.write(
    `Seeded foundation tenant ${tenantId}, branch ${branchId}, and admin user.\n`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
