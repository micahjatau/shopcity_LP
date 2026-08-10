import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  Res,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildReverseThrottleKey } from '../../common/throttle/throttle.keys';
import { CreateAdjustmentDto } from './adjustments.dto';
import { AdjustmentsService } from './adjustments.service';

const adjustmentResponseSchema = {
  type: 'object',
  required: [
    'id',
    'transactionId',
    'adjustmentId',
    'customerId',
    'kind',
    'amountKobo',
    'newActiveBalanceKobo',
    'allocations',
    'creditLot',
    'smsStatus',
    'occurredAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    transactionId: { type: 'string', format: 'uuid' },
    adjustmentId: { type: 'string', format: 'uuid' },
    customerId: { type: 'string', format: 'uuid' },
    kind: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
    amountKobo: { type: 'integer' },
    newActiveBalanceKobo: { type: 'integer' },
    allocations: { type: 'array', items: { type: 'object' } },
    creditLot: { type: 'object', nullable: true },
    smsStatus: { type: 'string', nullable: true },
    occurredAt: { type: 'string', format: 'date-time' },
  },
} as const;

@ApiTags('adjustments')
@ApiBearerAuth()
@Controller('adjustments')
@apiErrorEnvelopeResponses()
export class AdjustmentsController {
  constructor(private readonly adjustmentsService: AdjustmentsService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.ADMIN)
  @Throttle({
    bucket: 'adjustments.create',
    limit: 20,
    windowMs: 60_000,
    keyFactory: buildReverseThrottleKey,
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Adjustment created',
    status: 201,
    dataSchema: adjustmentResponseSchema,
  })
  @ApiOperation({ summary: 'Create a manual adjustment' })
  async create(
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateAdjustmentDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const response = await this.adjustmentsService.createAdjustment(
      request.authContext!.user.tenantId,
      request.authContext!,
      idempotencyKey,
      dto,
    );

    reply.code(201);
    return response;
  }
}
