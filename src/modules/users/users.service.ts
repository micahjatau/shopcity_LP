import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly auditService: AuditService,
  ) {}

  listUsers(tenantId: string) {
    return this.prismaService.user.findMany({ where: { tenantId } });
  }

  async createUser(
    tenantId: string,
    actor: AuthContext,
    data: {
      username: string;
      password: string;
      role: UserRole;
      branchId?: string;
    },
  ) {
    if (data.role === UserRole.SYSTEM) {
      throw new BadRequestException(
        'SYSTEM role cannot be assigned to human users',
      );
    }

    const branchId = data.branchId ?? actor.user.branchId ?? undefined;
    if (branchId) {
      const branch = await this.prismaService.branch.findFirst({
        where: { id: branchId, tenantId },
      });
      if (!branch) {
        throw new BadRequestException('Branch not found for tenant');
      }
    } else {
      throw new BadRequestException('Branch is required for user creation');
    }

    const authResult =
      await this.supabaseService.serviceRoleClient.auth.admin.createUser({
        email: data.username,
        password: data.password,
        email_confirm: true,
      });

    if (authResult.error || !authResult.data.user) {
      throw new BadRequestException(
        authResult.error?.message ?? 'Unable to create Supabase user',
      );
    }

    try {
      return await this.prismaService.$transaction(async (prisma) => {
        const user = await prisma.user.create({
          data: {
            tenantId,
            branchId,
            username: data.username,
            role: data.role,
            status: UserStatus.ACTIVE,
            supabaseAuthId: authResult.data.user.id,
          },
        });

        await this.auditService.recordWithClient(prisma, {
          tenantId,
          actorId: actor.user.id,
          action: 'user.create',
          entityType: 'user',
          entityId: user.id,
          metadata: user,
        });

        return user;
      });
    } catch (error) {
      try {
        await this.supabaseService.serviceRoleClient.auth.admin.deleteUser(
          authResult.data.user.id,
        );
      } catch {
        // Ignore compensation failures so the original database error surfaces.
      }
      throw error;
    }
  }

  async updateRole(
    tenantId: string,
    actor: AuthContext,
    userId: string,
    role: UserRole,
  ) {
    if (role === UserRole.SYSTEM) {
      throw new BadRequestException(
        'SYSTEM role cannot be assigned to human users',
      );
    }

    const user = await this.prismaService.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prismaService.$transaction(async (prisma) => {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });
      await prisma.session.updateMany({
        where: { userId },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'user.role',
        entityType: 'user',
        entityId: updated.id,
        metadata: { role },
      });

      return updated;
    });
  }

  async updateStatus(
    tenantId: string,
    actor: AuthContext,
    userId: string,
    status: string,
  ) {
    if (!['ACTIVE', 'DISABLED', 'SUSPENDED'].includes(status)) {
      throw new BadRequestException('Invalid user status');
    }

    const user = await this.prismaService.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prismaService.$transaction(async (prisma) => {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { status: status as UserStatus },
      });
      if (updated.status !== UserStatus.ACTIVE) {
        await prisma.session.updateMany({
          where: { userId },
          data: { status: 'REVOKED', revokedAt: new Date() },
        });
      }

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'user.status',
        entityType: 'user',
        entityId: updated.id,
        metadata: { status },
      });

      return updated;
    });
  }
}
