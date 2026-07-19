import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CardStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';

@Injectable()
export class CardsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async lookupCard(tenantId: string, barcodeValue: string) {
    const card = await this.prismaService.card.findFirst({
      where: { tenantId, barcodeValue },
      include: { customer: true },
    });
    if (!card || card.status !== CardStatus.ACTIVE) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  async createCard(
    tenantId: string,
    actor: AuthContext,
    data: { customerId: string; barcodeValue: string },
  ) {
    const customer = await this.prismaService.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const card = await this.prismaService.card.create({
      data: {
        tenantId,
        customerId: customer.id,
        barcodeValue: data.barcodeValue,
        issuedBy: actor.user.id,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'card.create',
      entityType: 'card',
      entityId: card.id,
      metadata: card,
    });

    return card;
  }

  async replaceCard(
    tenantId: string,
    actor: AuthContext,
    cardId: string,
    data: { barcodeValue: string },
  ) {
    const current = await this.prismaService.card.findFirst({
      where: { id: cardId, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Card not found');
    }

    const replacement = await this.prismaService.$transaction(
      async (prisma) => {
        const newCard = await prisma.card.create({
          data: {
            tenantId,
            customerId: current.customerId,
            barcodeValue: data.barcodeValue,
            issuedBy: actor.user.id,
          },
        });

        await prisma.card.update({
          where: { id: current.id },
          data: {
            status: CardStatus.REPLACED,
            blockedAt: new Date(),
            replacedByCardId: newCard.id,
            replacedAt: new Date(),
          },
        });

        return newCard;
      },
    );

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'card.replace',
      entityType: 'card',
      entityId: replacement.id,
      metadata: { previousCardId: cardId, barcodeValue: data.barcodeValue },
    });

    return replacement;
  }

  async updateStatus(
    tenantId: string,
    actor: AuthContext,
    cardId: string,
    status: string,
  ) {
    if (!['ACTIVE', 'BLOCKED', 'REPLACED'].includes(status)) {
      throw new BadRequestException('Invalid card status');
    }

    const card = await this.prismaService.card.findFirst({
      where: { id: cardId, tenantId },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const updated = await this.prismaService.card.update({
      where: { id: cardId },
      data: {
        status: status as CardStatus,
        blockedAt: status === 'BLOCKED' ? new Date() : null,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'card.status',
      entityType: 'card',
      entityId: updated.id,
      metadata: { status },
    });

    return updated;
  }
}
