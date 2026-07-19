import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { CardsService } from './cards.service';
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

  @Get('lookup/:barcode')
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  lookupCard(
    @Req() request: AuthenticatedRequest,
    @Param('barcode') barcode: string,
  ) {
    return this.cardsService.lookupCard(
      request.authContext!.user.tenantId,
      barcode,
    );
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ description: 'Card assigned', status: 201 })
  @ApiOperation({ summary: 'Assign card' })
  createCard(@Req() request: AuthenticatedRequest, @Body() dto: CreateCardDto) {
    return this.cardsService.createCard(
      request.authContext!.user.tenantId,
      request.authContext!,
      dto,
    );
  }

  @Post(':id/replace')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ description: 'Card replaced', status: 201 })
  replaceCard(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReplaceCardDto,
  ) {
    return this.cardsService.replaceCard(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCardStatusDto,
  ) {
    return this.cardsService.updateStatus(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.status,
    );
  }
}
