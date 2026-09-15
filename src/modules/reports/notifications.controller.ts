import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentSession } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import type { AuthContext } from '../../common/auth/session.types';
import { ReportsService } from './reports.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sms/:transactionId')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiParam({ name: 'transactionId', description: 'Transaction identifier' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @ApiOkResponse({ description: 'Transaction SMS notification details' })
  @ApiOperation({ summary: 'Inspect SMS notifications for a transaction' })
  listTransactionSms(
    @CurrentSession() context: AuthContext,
    @Param('transactionId') transactionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.listTransactionSms(
      context.user.tenantId,
      context,
      transactionId,
      {
        page: parseOptionalPositiveInt(page, 'page'),
        limit: parseOptionalPositiveInt(limit, 'limit'),
      },
    );
  }
}

function parseOptionalPositiveInt(value: string | undefined, label: string) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${label} must be a positive integer`);
  }
  return parsed;
}
