import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CardStatus,
  CustomerStatus,
  IdempotencyRecordStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { ActiveBalanceService } from '../../common/balance/active-balance.service';

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
    idempotencyKey: string | undefined,
  ) {
    const normalizedKey = normalizeCardIdempotencyKey(idempotencyKey);
    const endpoint = 'cards.create';
    const requestHash = hashCardRequest({
      tenantId,
      actorId: actor.user.id,
      customerId: data.customerId,
      serialNumber: data.serialNumber.trim(),
    });
    const existing = await findCardIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      normalizedKey,
      requestHash,
    );
    if (existing?.responseJson) {
      return existing.responseJson;
    }
    if (existing) {
      throw new ConflictException('Idempotency key is still being processed');
    }
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
      await prisma.idempotencyRecord.create({
        data: {
          tenantId,
          actorId: actor.user.id,
          endpoint,
          idempotencyKey: normalizedKey,
          requestHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: IdempotencyRecordStatus.PENDING,
        },
      });

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

        const response = toPublicCard(card);
        await prisma.idempotencyRecord.update({
          where: {
            tenantId_actorId_endpoint_idempotencyKey: {
              tenantId,
              actorId: actor.user.id,
              endpoint,
              idempotencyKey: normalizedKey,
            },
          },
          data: {
            status: IdempotencyRecordStatus.COMPLETED,
            responseJson: toJsonValue(response),
          },
        });
        return response;
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
      const occurredAt = new Date();
      const replaced = await prisma.card.updateMany({
        where: {
          id: current.id,
          tenantId,
          status: CardStatus.ACTIVE,
        },
        data: {
          status: CardStatus.REPLACED,
          blockedAt: occurredAt,
          replacedAt: occurredAt,
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

        await prisma.outboxEvent.create({
          data: {
            tenantId,
            aggregateType: 'card',
            aggregateId: newCard.id,
            eventType: 'fraud.evaluate',
            payload: {
              kind: 'card.replaced',
              tenantId,
              branchId: customer.branchId,
              customerId: current.customerId,
              cardId: newCard.id,
              occurredAt: occurredAt.toISOString(),
            },
            status: 'PENDING',
            nextAttemptAt: occurredAt,
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

const CARD_IDEMPOTENCY_KEY_MAX_LENGTH = 255;

function normalizeCardIdempotencyKey(value: string | undefined): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    throw new BadRequestException('Idempotency-Key header is required');
  }
  if (normalized.length > CARD_IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new BadRequestException('Idempotency-Key header is too long');
  }
  return normalized;
}

function hashCardRequest(value: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function findCardIdempotency(
  prisma: PrismaService,
  tenantId: string,
  actorId: string,
  endpoint: string,
  idempotencyKey: string,
  requestHash: string,
) {
  await prisma.idempotencyRecord.deleteMany({
    where: {
      tenantId,
      actorId,
      endpoint,
      idempotencyKey,
      expiresAt: { lt: new Date() },
    },
  });
  const existing = await prisma.idempotencyRecord.findUnique({
    where: {
      tenantId_actorId_endpoint_idempotencyKey: {
        tenantId,
        actorId,
        endpoint,
        idempotencyKey,
      },
    },
  });
  if (existing && existing.requestHash !== requestHash) {
    throw new DomainHttpException(
      409,
      'IDEMPOTENCY_CONFLICT',
      'Idempotency key reused with different payload',
    );
  }
  return existing;
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
      isStaff: card.customer.isStaff,
      earningEligible: !card.customer.isStaff,
      eligibilityReason: card.customer.isStaff ? 'STAFF_INELIGIBLE' : null,
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
