import { Body, Controller, Headers, Post, Req, Res, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { apiErrorEnvelopeResponses, apiSuccessEnvelopeResponse } from '../../common/openapi-envelope';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildReverseThrottleKey } from '../../common/throttle/throttle.keys';
import { CreateAdjustmentDto } from './adjustments.dto';
import { AdjustmentsService } from './adjustments.service';

@ApiTags('adjustments')
@ApiBearerAuth()
@Controller('adjustments')
@apiErrorEnvelopeResponses()
export class AdjustmentsController {
  constructor(private readonly adjustmentsService: AdjustmentsService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.ADMIN)
  @Throttle({ bucket: 'adjustments.create', limit: 20, windowMs: 60_000, keyFactory: buildReverseThrottleKey })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @apiSuccessEnvelopeResponse({
    description: 'Adjustment created',
    status: 201,
    dataSchema: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
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
