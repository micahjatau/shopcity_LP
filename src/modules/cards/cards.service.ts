import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CardStatus, CustomerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import { ActiveBalanceService } from '../loyalty/active-balance.service';

@Injectable()
export class CardsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly activeBalanceService: ActiveBalanceService = new ActiveBalanceService(
      prismaService,
    ),
  ) {}

  async lookupCard(tenantId: string, serialNumber: string) {
    const card = await this.prismaService.card.findFirst({
      where: { tenantId, barcodeValue: serialNumber },
      include: {
        customer: true,
      },
    });
    if (
      !card ||
      card.status !== CardStatus.ACTIVE ||
      card.customer.status !== CustomerStatus.ACTIVE
    ) {
      throw new NotFoundException('Card not found');
    }

    const activeBalanceKobo =
      await this.activeBalanceService.getActiveBalanceKobo(
        tenantId,
        card.customerId,
      );

    return toPublicCardLookup(card, activeBalanceKobo);
  }

  async createCard(
    tenantId: string,
    actor: AuthContext,
    data: { customerId: string; serialNumber: string },
  ) {
    const customer = await this.prismaService.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });
    if (!customer || customer.status !== CustomerStatus.ACTIVE) {
      throw new NotFoundException('Customer not found');
    }

    const existingActiveCard = await this.prismaService.card.findFirst({
      where: { tenantId, customerId: customer.id, status: CardStatus.ACTIVE },
    });
    if (existingActiveCard) {
      throw new BadRequestException('Customer already has an active card');
    }

    return this.prismaService.$transaction(async (prisma) => {
      try {
        const card = await prisma.card.create({
          data: {
            tenantId,
            customerId: customer.id,
            barcodeValue: data.serialNumber,
            issuedByTenantId: actor.user.tenantId,
            issuedBy: actor.user.id,
          },
        });

        await this.auditService.recordWithClient(prisma, {
          tenantId,
          actorId: actor.user.id,
          action: 'card.create',
          entityType: 'card',
          entityId: card.id,
          metadata: card,
        });

        return toPublicCard(card);
      } catch (error) {
        throw normalizeCardWriteError(error);
      }
    });
  }

  async replaceCard(
    tenantId: string,
    actor: AuthContext,
    cardId: string,
    data: { serialNumber: string },
  ) {
    const current = await this.prismaService.card.findFirst({
      where: { id: cardId, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Card not found');
    }

    if (current.status !== CardStatus.ACTIVE) {
      throw new BadRequestException('Only active cards can be replaced');
    }

    const customer = await this.prismaService.customer.findFirst({
      where: { id: current.customerId, tenantId },
    });
    if (!customer || customer.status !== CustomerStatus.ACTIVE) {
      throw new BadRequestException('Customer is not active');
    }

    return this.prismaService.$transaction(async (prisma) => {
      const replaced = await prisma.card.updateMany({
        where: {
          id: current.id,
          tenantId,
          status: CardStatus.ACTIVE,
        },
        data: {
          status: CardStatus.REPLACED,
          blockedAt: new Date(),
          replacedAt: new Date(),
        },
      });

      if (replaced.count !== 1) {
        throw new BadRequestException('Only active cards can be replaced');
      }

      try {
        const newCard = await prisma.card.create({
          data: {
            tenantId,
            customerId: current.customerId,
            barcodeValue: data.serialNumber,
            issuedByTenantId: actor.user.tenantId,
            issuedBy: actor.user.id,
          },
        });

        await prisma.card.update({
          where: { id: current.id },
          data: {
            replacedByCardId: newCard.id,
          },
        });

        await this.auditService.recordWithClient(prisma, {
          tenantId,
          actorId: actor.user.id,
          action: 'card.replace',
          entityType: 'card',
          entityId: newCard.id,
          metadata: { previousCardId: cardId, serialNumber: data.serialNumber },
        });

        return toPublicCard(newCard);
      } catch (error) {
        throw normalizeCardWriteError(error);
      }
    });
  }

  async updateStatus(
    tenantId: string,
    actor: AuthContext,
    cardId: string,
    status: string,
  ) {
    if (!['ACTIVE', 'BLOCKED'].includes(status)) {
      throw new BadRequestException('Invalid card status');
    }

    const card = await this.prismaService.card.findFirst({
      where: { id: cardId, tenantId },
      include: { customer: true },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (card.status === CardStatus.REPLACED) {
      throw new BadRequestException('Replaced cards cannot be updated');
    }

    if (status === 'ACTIVE' && card.customer.status !== CustomerStatus.ACTIVE) {
      throw new BadRequestException('Customer is not active');
    }

    return this.prismaService.$transaction(async (prisma) => {
      if (status === 'ACTIVE') {
        const existingActiveCard = await prisma.card.findFirst({
          where: {
            tenantId,
            customerId: card.customerId,
            status: CardStatus.ACTIVE,
            NOT: { id: cardId },
          },
        });

        if (existingActiveCard) {
          throw new BadRequestException('Customer already has an active card');
        }
      }

      try {
        const updated = await prisma.card.updateMany({
          where: {
            id: cardId,
            tenantId,
            status: card.status,
          },
          data: {
            status: status as CardStatus,
            blockedAt: status === 'BLOCKED' ? new Date() : null,
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException('Card state changed during update');
        }

        const current = await prisma.card.findUnique({
          where: { id: cardId },
        });

        if (!current) {
          throw new ConflictException('Card state changed during update');
        }

        await this.auditService.recordWithClient(prisma, {
          tenantId,
          actorId: actor.user.id,
          action: 'card.status',
          entityType: 'card',
          entityId: current.id,
          metadata: { status },
        });

        return toPublicCard(current);
      } catch (error) {
        throw normalizeCardWriteError(error);
      }
    });
  }
}

function normalizeCardWriteError(error: unknown): Error {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(', ')
      : typeof error.meta?.target === 'string'
        ? error.meta.target
        : '';

    if (
      target.includes('Card_one_active_per_customer') ||
      (target.includes('tenantId') && target.includes('customerId'))
    ) {
      return new BadRequestException('Customer already has an active card');
    }

    if (target.includes('tenantId') && target.includes('barcodeValue')) {
      return new BadRequestException('Card barcode already exists');
    }
  }

  return error instanceof Error ? error : new Error('Unable to update card');
}

function toPublicCard<T extends { barcodeValue: string }>(card: T) {
  const { barcodeValue, ...rest } = card;
  return {
    ...rest,
    serialNumber: barcodeValue,
  };
}

function toPublicCardLookup(
  card: Prisma.CardGetPayload<{
    include: {
      customer: true;
    };
  }>,
  activeBalanceKobo: bigint,
) {
  return {
    id: card.id,
    tenantId: card.tenantId,
    customerId: card.customerId,
    status: card.status,
    serialNumber: card.barcodeValue,
    customer: {
      customerId: card.customer.id,
      fullName: card.customer.fullName,
      maskedPhone: maskPhone(card.customer.phoneE164),
      cardStatus: card.status,
      availableBalanceKobo: Number(activeBalanceKobo),
    },
  };
}

function maskPhone(phoneE164: string): string {
  const normalized = phoneE164.trim();
  if (normalized.length <= 6) {
    return '***';
  }

  return `${normalized.slice(0, Math.min(7, normalized.length - 4))}* *** ${normalized.slice(-4)}`;
}
