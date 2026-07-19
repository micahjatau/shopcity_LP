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

    const user = await this.prismaService.user.create({
      data: {
        tenantId,
        branchId: data.branchId ?? actor.user.branchId ?? undefined,
        username: data.username,
        role: data.role,
        status: UserStatus.ACTIVE,
        supabaseAuthId: authResult.data.user.id,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      metadata: user,
    });

    return user;
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

    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data: { role },
    });
    await this.prismaService.session.updateMany({
      where: { userId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'user.role',
      entityType: 'user',
      entityId: updated.id,
      metadata: { role },
    });

    return updated;
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

    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data: { status: status as UserStatus },
    });
    if (updated.status !== UserStatus.ACTIVE) {
      await this.prismaService.session.updateMany({
        where: { userId },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
    }

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'user.status',
      entityType: 'user',
      entityId: updated.id,
      metadata: { status },
    });

    return updated;
  }
}
