import { Injectable } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

export const SYSTEM_USERNAME = 'system@shopcity.internal';

type SystemActorPrismaClient = Pick<Prisma.TransactionClient, 'user'>;

@Injectable()
export class SystemActorService {
  async getOrCreate(
    client: SystemActorPrismaClient,
    tenantId: string,
  ): Promise<{ id: string; tenantId: string }> {
    const existing = await client.user.findFirst({
      where: { tenantId, username: SYSTEM_USERNAME },
      select: { id: true, tenantId: true, role: true, status: true },
    });

    if (existing) {
      if (existing.role !== UserRole.SYSTEM) {
        throw new Error(
          'existing system actor username is not bound to SYSTEM role',
        );
      }

      if (existing.status !== UserStatus.ACTIVE) {
        throw new Error('existing system actor must remain ACTIVE');
      }

      return { id: existing.id, tenantId: existing.tenantId };
    }

    const created = await client.user.create({
      data: {
        tenantId,
        branchId: null,
        username: SYSTEM_USERNAME,
        role: UserRole.SYSTEM,
        status: UserStatus.ACTIVE,
        supabaseAuthId: null,
      },
      select: { id: true, tenantId: true },
    });

    return created;
  }
}
