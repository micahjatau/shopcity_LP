import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type AuditClient = {
  auditLog: {
    create(args: {
      data: Prisma.AuditLogUncheckedCreateInput;
    }): Prisma.PrismaPromise<unknown>;
  };
};

@Injectable()
export class AuditService {
  constructor(private readonly prismaService: PrismaService) {}

  record(params: {
    tenantId: string;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    requestId?: string | null;
    metadata?: unknown;
  }) {
    return this.recordWithClient(this.prismaService, params);
  }

  recordWithClient(
    client: AuditClient,
    params: {
      tenantId: string;
      actorId?: string | null;
      action: string;
      entityType: string;
      entityId?: string | null;
      requestId?: string | null;
      metadata?: unknown;
    },
  ): Prisma.PrismaPromise<unknown> {
    return client.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        requestId: params.requestId ?? null,
        metadata: params.metadata as never,
      },
    });
  }
}
