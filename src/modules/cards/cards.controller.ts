import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Headers,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { CardsService } from './cards.service';
import { Throttle } from '../../common/throttle/throttle.decorator';
import { buildCardLookupThrottleKey } from '../../common/throttle/throttle.keys';
import {
  CreateCardDto,
  ReplaceCardDto,
  UpdateCardStatusDto,
} from './cards.dto';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';

@ApiTags('cards')
@ApiBearerAuth()
@Controller('cards')
@apiErrorEnvelopeResponses()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get('lookup/:serialNumber')
  @Throttle({
    bucket: 'cards.lookup',
    limit: 30,
    windowMs: 60 * 1000,
    keyFactory: buildCardLookupThrottleKey,
  })
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  lookupCard(
    @Req() request: AuthenticatedRequest,
    @Param('serialNumber') serialNumber: string,
  ) {
    return this.cardsService.lookupCard(
      request.authContext!.user.tenantId,
      serialNumber,
    );
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ description: 'Card assigned', status: 201 })
  @ApiOperation({ summary: 'Assign card' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createCard(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCardDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.cardsService.createCard(
      request.authContext!.user.tenantId,
      request.authContext!,
      dto,
      idempotencyKey,
    );
  }

  @Post(':id/replace')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ description: 'Card replaced', status: 201 })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  replaceCard(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReplaceCardDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.cardsService.replaceCard(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto,
      idempotencyKey,
    );
  }

  @Patch(':id/status')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCardStatusDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.cardsService.updateStatus(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.status,
      idempotencyKey,
    );
  }
}
