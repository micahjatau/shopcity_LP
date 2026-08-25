import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdempotencyRecordStatus, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';

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
    idempotencyKey: string | undefined,
  ) {
    const key = normalizeUserIdempotencyKey(idempotencyKey);
    const endpoint = 'users.role';
    const requestHash = hashUserRequest({
      tenantId,
      actorId: actor.user.id,
      userId,
      role,
    });
    const existing = await findUserIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      key,
      requestHash,
    );
    if (existing?.responseJson) return existing.responseJson;
    if (existing)
      throw new ConflictException('Idempotency key is still being processed');

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

    const updated = await this.prismaService.$transaction(async (prisma) => {
      await prisma.idempotencyRecord.create({
        data: {
          tenantId,
          actorId: actor.user.id,
          endpoint,
          idempotencyKey: key,
          requestHash,
          status: IdempotencyRecordStatus.PENDING,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
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
    await completeUserIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      key,
      updated,
    );
    return updated;
  }

  async updateStatus(
    tenantId: string,
    actor: AuthContext,
    userId: string,
    status: string,
    idempotencyKey: string | undefined,
  ) {
    const key = normalizeUserIdempotencyKey(idempotencyKey);
    const endpoint = 'users.status';
    const requestHash = hashUserRequest({
      tenantId,
      actorId: actor.user.id,
      userId,
      status,
    });
    const existing = await findUserIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      key,
      requestHash,
    );
    if (existing?.responseJson) return existing.responseJson;
    if (existing)
      throw new ConflictException('Idempotency key is still being processed');

    if (!['ACTIVE', 'DISABLED', 'SUSPENDED'].includes(status)) {
      throw new BadRequestException('Invalid user status');
    }

    const user = await this.prismaService.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prismaService.$transaction(async (prisma) => {
      await prisma.idempotencyRecord.create({
        data: {
          tenantId,
          actorId: actor.user.id,
          endpoint,
          idempotencyKey: key,
          requestHash,
          status: IdempotencyRecordStatus.PENDING,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
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
    await completeUserIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      key,
      updated,
    );
    return updated;
  }
}

function normalizeUserIdempotencyKey(key: string | undefined): string {
  const value = key?.trim() ?? '';
  if (!value)
    throw new BadRequestException('Idempotency-Key header is required');
  if (value.length > 255)
    throw new BadRequestException('Idempotency-Key header is too long');
  return value;
}

function hashUserRequest(value: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function findUserIdempotency(
  prisma: PrismaService,
  tenantId: string,
  actorId: string,
  endpoint: string,
  key: string,
  requestHash: string,
) {
  const existing = await prisma.idempotencyRecord.findUnique({
    where: {
      tenantId_actorId_endpoint_idempotencyKey: {
        tenantId,
        actorId,
        endpoint,
        idempotencyKey: key,
      },
    },
  });
  if (existing && existing.requestHash !== requestHash)
    throw new DomainHttpException(
      409,
      'IDEMPOTENCY_CONFLICT',
      'Idempotency key reused with different payload',
    );
  return existing;
}

async function completeUserIdempotency(
  prisma: PrismaService,
  tenantId: string,
  actorId: string,
  endpoint: string,
  key: string,
  responseJson: unknown,
) {
  await prisma.idempotencyRecord.update({
    where: {
      tenantId_actorId_endpoint_idempotencyKey: {
        tenantId,
        actorId,
        endpoint,
        idempotencyKey: key,
      },
    },
    data: {
      status: IdempotencyRecordStatus.COMPLETED,
      responseJson: responseJson as object,
    },
  });
}
