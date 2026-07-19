import { Controller, Get, Query, Req, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { PrismaService } from '../../database/prisma.service';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
@apiErrorEnvelopeResponses()
export class AuditController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    dataSchema: { type: 'array', items: { type: 'object' } },
  })
  @ApiOperation({ summary: 'List audit log entries' })
  list(
    @Req() request: AuthenticatedRequest,
    @Query('actorId') actorId?: string,
  ) {
    return this.prismaService.auditLog.findMany({
      where: {
        tenantId: request.authContext!.user.tenantId,
        ...(actorId ? { actorId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
