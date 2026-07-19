import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
    return this.prismaService.auditLog.create({
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
