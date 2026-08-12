import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  Prisma,
} from '@prisma/client';
import { runWithBoundedFinancialRetries } from '../../common/balance/financial-transaction-retry';
import { FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS } from '../../common/balance/lot-allocation.service';
import { SystemActorService } from '../../common/system/system-actor.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ExpireDueCreditInput,
  ExpirySweepResult,
  LockedDueCreditLot,
} from './credit-expiry.types';

const CREDIT_EXPIRY_TRANSACTION_RETRY_ATTEMPTS = 3;

@Injectable()
export class CreditExpiryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly systemActorService: SystemActorService,
  ) {}

  async expireDueCredit(
    input: ExpireDueCreditInput,
  ): Promise<ExpirySweepResult> {
    if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
      throw new BadRequestException('now must be a valid Date');
    }

    if (!Number.isInteger(input.batchSize) || input.batchSize <= 0) {
      throw new BadRequestException('batchSize must be a positive integer');
    }

    return runWithBoundedFinancialRetries(
      () =>
        this.prismaService.$transaction(async (prisma) => {
          const dueLots = await this.lockDueLots(prisma, input);

          if (dueLots.length === 0) {
            return { examined: 0, expiredLots: 0, expiredAmountKobo: 0n };
          }

          let systemActorByTenant = new Map<
            string,
            { id: string; tenantId: string }
          >();
          let expiredLots = 0;
          let expiredAmountKobo = 0n;

          for (const lot of dueLots) {
            const amountKobo = lot.remainingAmountKobo;
            if (amountKobo <= 0n) {
              continue;
            }

            let systemActor = systemActorByTenant.get(lot.tenantId);
            if (!systemActor) {
              systemActor = await this.systemActorService.getOrCreate(
                prisma,
                lot.tenantId,
              );
              systemActorByTenant.set(lot.tenantId, systemActor);
            }

            const ledgerEntry = await prisma.loyaltyLedgerEntry.create({
              data: {
                tenantId: lot.tenantId,
                customerId: lot.customerId,
                receiptId: null,
                type: LedgerEntryType.EXPIRY,
                direction: LedgerEntryDirection.DEBIT,
                amountKobo,
                status: LedgerEntryStatus.CONFIRMED,
                correlationId: `credit-expiry:${lot.id}`,
                createdByTenantId: lot.tenantId,
                createdBy: systemActor.id,
                effectiveAt: lot.expiresAt,
              },
            });

            await prisma.creditExpiry.create({
              data: {
                tenantId: lot.tenantId,
                customerId: lot.customerId,
                creditLotId: lot.id,
                ledgerEntryId: ledgerEntry.id,
                amountKobo,
                expiredAt: lot.expiresAt,
              },
            });

            const updatedLot = await prisma.creditLot.updateMany({
              where: {
                tenantId: lot.tenantId,
                id: lot.id,
                customerId: lot.customerId,
                remainingAmountKobo: { gte: amountKobo },
              },
              data: {
                remainingAmountKobo: {
                  decrement: amountKobo,
                },
              },
            });

            if (updatedLot.count !== 1) {
              throw new Prisma.PrismaClientKnownRequestError(
                'credit expiry lot changed during sweep',
                {
                  code: 'P2034',
                  clientVersion: 'manual-conflict',
                },
              );
            }

            await this.auditService.recordWithClient(prisma, {
              tenantId: lot.tenantId,
              actorId: systemActor.id,
              action: 'credit.expire',
              entityType: 'credit_lot',
              entityId: lot.id,
              metadata: {
                ledgerEntryId: ledgerEntry.id,
                amountKobo: amountKobo.toString(),
                expiredAt: lot.expiresAt.toISOString(),
              },
            });

            expiredLots += 1;
            expiredAmountKobo += amountKobo;
          }

          return {
            examined: dueLots.length,
            expiredLots,
            expiredAmountKobo,
          };
        }, FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS),
      {
        attempts: CREDIT_EXPIRY_TRANSACTION_RETRY_ATTEMPTS,
        conflictCode: 'CREDIT_EXPIRY_TRANSACTION_CONFLICT',
        conflictMessage: 'Credit expiry sweep conflicted; retry the sweep',
      },
    );
  }

  private async lockDueLots(
    prisma: Pick<Prisma.TransactionClient, '$queryRaw'>,
    input: ExpireDueCreditInput,
  ): Promise<LockedDueCreditLot[]> {
    return prisma.$queryRaw<LockedDueCreditLot[]>(Prisma.sql`
      SELECT "id", "tenantId", "customerId", "remainingAmountKobo", "expiresAt"
      FROM "CreditLot"
      WHERE "expiresAt" <= ${input.now}
        AND "remainingAmountKobo" > 0
      ORDER BY "expiresAt" ASC, "earnedAt" ASC, "id" ASC
      LIMIT ${input.batchSize}
      FOR UPDATE SKIP LOCKED
    `);
  }
}
