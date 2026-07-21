import { Controller, HttpCode, Param, Post, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentSession } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthContext } from '../../common/auth/session.types';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { ApprovalsService } from './approvals.service';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('receipts')
@apiErrorEnvelopeResponses()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post(':id/approve')
  @Version('1')
  @HttpCode(200)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Receipt approved',
    dataSchema: {
      type: 'object',
      required: ['id', 'reviewStatus', 'reviewedAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        reviewStatus: { type: 'string', example: 'APPROVED' },
        reviewedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiOperation({ summary: 'Approve pending receipt' })
  approveReceipt(
    @CurrentSession() context: AuthContext,
    @Param('id') receiptId: string,
  ) {
    return this.approvalsService.approveReceipt(
      context!.user.tenantId,
      context!,
      receiptId,
    );
  }

  @Post(':id/reject')
  @Version('1')
  @HttpCode(200)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Receipt rejected',
    dataSchema: {
      type: 'object',
      required: ['id', 'reviewStatus', 'reviewedAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        reviewStatus: { type: 'string', example: 'REJECTED' },
        reviewedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiOperation({ summary: 'Reject pending receipt' })
  rejectReceipt(
    @CurrentSession() context: AuthContext,
    @Param('id') receiptId: string,
  ) {
    return this.approvalsService.rejectReceipt(
      context!.user.tenantId,
      context!,
      receiptId,
    );
  }
}
