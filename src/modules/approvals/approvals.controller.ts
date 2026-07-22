import { Body, Controller, Get, HttpCode, Param, Post, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentSession } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthContext } from '../../common/auth/session.types';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { ApprovalDecisionDto } from '../loyalty/loyalty.dto';
import { ApprovalsService } from './approvals.service';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('approvals')
@apiErrorEnvelopeResponses()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Pending approvals',
    dataSchema: { type: 'object' },
  })
  @ApiOperation({ summary: 'List approvals' })
  listApprovals(@CurrentSession() context: AuthContext) {
    return this.approvalsService.listApprovals(context.user.tenantId);
  }

  @Post(':id/decision')
  @Version('1')
  @HttpCode(200)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Approval decision recorded',
    dataSchema: {
      type: 'object',
      required: ['id', 'status', 'receiptId', 'decidedAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', example: 'EXECUTED' },
        receiptId: { type: 'string', format: 'uuid' },
        ledgerEntryId: { type: 'string', format: 'uuid', nullable: true },
        creditKobo: { type: 'integer', nullable: true },
        decidedAt: { type: 'string', format: 'date-time' },
        executedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiOperation({ summary: 'Decide approval' })
  decideApproval(
    @CurrentSession() context: AuthContext,
    @Param('id') approvalId: string,
    @Body() dto: ApprovalDecisionDto,
  ) {
    return this.approvalsService.decideApproval(
      context.user.tenantId,
      context,
      approvalId,
      dto.decision,
      dto.reason,
    );
  }
}
