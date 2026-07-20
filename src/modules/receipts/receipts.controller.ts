import { Body, Controller, Headers, Post, Req, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { apiErrorEnvelopeResponses, apiSuccessEnvelopeResponse } from '../../common/openapi-envelope';
import { CaptureReceiptDto } from './receipts.dto';
import { ReceiptsService } from './receipts.service';

@ApiTags('receipts')
@ApiBearerAuth()
@Controller('receipts')
@apiErrorEnvelopeResponses()
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Receipt captured',
    status: 201,
    dataSchema: {
      type: 'object',
      required: [
        'id',
        'tenantId',
        'branchId',
        'customerId',
        'cardSerialNumber',
        'deviceId',
        'posReceiptNumber',
        'purchaseAmountKobo',
        'occurredAt',
        'capturedAt',
        'status',
      ],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        branchId: { type: 'string', format: 'uuid' },
        customerId: { type: 'string', format: 'uuid' },
        cardSerialNumber: { type: 'string' },
        deviceId: { type: 'string', format: 'uuid' },
        posReceiptNumber: { type: 'string' },
        purchaseAmountKobo: { type: 'integer' },
        occurredAt: { type: 'string', format: 'date-time' },
        capturedAt: { type: 'string', format: 'date-time' },
        status: { type: 'string', example: 'CAPTURED' },
      },
    },
  })
  @ApiOperation({ summary: 'Capture receipt' })
  captureReceipt(
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CaptureReceiptDto,
  ) {
    return this.receiptsService.captureReceipt(
      request.authContext!.user.tenantId,
      request.authContext!,
      idempotencyKey,
      dto,
    );
  }
}
