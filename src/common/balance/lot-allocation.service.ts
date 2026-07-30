import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainHttpException } from '../errors/domain.exception';

export const FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 15_000,
};

export interface AllocateDebitInput {
  tenantId: string;
  customerId: string;
  debitLedgerEntryId: string;
  amountKobo: bigint;
  now?: Date;
  redemptionId?: string;
  adjustmentId?: string;
  excludedCreditLotIds?: string[];
}

export interface PersistedAllocation {
  creditLotId: string;
  amountKobo: bigint;
  allocationOrder: number;
  expiresAt: Date;
}

export interface PlanRestorationInput {
  tenantId: string;
  debitLedgerEntryId: string;
  now?: Date;
}

export interface PlannedRestoration {
  allocationId: string;
  creditLotId: string;
  amountKobo: bigint;
  expiresAt: Date;
}

type LockedCreditLot = {
  id: string;
  remainingAmountKobo: bigint;
  expiresAt: Date;
};

type AllocationPrismaClient = {
  $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>;
  redemptionAllocation: {
    createMany: (args: {
      data: Array<{
        tenantId: string;
        redemptionId?: string;
        adjustmentId?: string;
        redemptionLedgerEntryId: string;
        creditLotId: string;
        amountKobo: bigint;
        allocationOrder: number;
      }>;
    }) => Promise<unknown>;
  };
  creditLot: {
    updateMany: (args: {
      where: {
        tenantId: string;
        id: string;
        customerId: string;
        remainingAmountKobo: { gte: bigint };
      };
      data: { remainingAmountKobo: { decrement: bigint } };
    }) => Promise<{ count: number }>;
  };
};

type RestorationPrismaClient = {
  redemptionAllocation: {
    findMany: (args: {
      where: { tenantId: string; redemptionLedgerEntryId: string };
      orderBy: { allocationOrder: 'asc' };
      select: {
        id: true;
        creditLotId: true;
        amountKobo: true;
        creditLot: { select: { expiresAt: true } };
        restorations: { select: { amountKobo: true } };
      };
    }) => Promise<
      Array<{
        id: string;
        creditLotId: string;
        amountKobo: bigint;
        creditLot: { expiresAt: Date };
        restorations: Array<{ amountKobo: bigint }>;
      }>
    >;
  };
};

@Injectable()
export class LotAllocationService {
  async allocateDebit(
    prisma: AllocationPrismaClient,
    input: AllocateDebitInput,
  ): Promise<PersistedAllocation[]> {
    if (input.amountKobo <= 0n) {
      throw new DomainHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Debit allocation amount must be positive',
      );
    }

    const targetCount =
      Number(Boolean(input.redemptionId)) + Number(Boolean(input.adjustmentId));

    if (targetCount !== 1) {
      throw new DomainHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Debit allocation must target exactly one redemption or adjustment',
      );
    }

    const lots = await this.lockEligibleLots(prisma, input);
    const allocations = this.planAllocations(lots, input.amountKobo);

    await prisma.redemptionAllocation.createMany({
      data: allocations.map((allocation) => ({
        tenantId: input.tenantId,
        redemptionId: input.redemptionId,
        adjustmentId: input.adjustmentId,
        redemptionLedgerEntryId: input.debitLedgerEntryId,
        creditLotId: allocation.creditLotId,
        amountKobo: allocation.amountKobo,
        allocationOrder: allocation.allocationOrder,
      })),
    });

    for (const allocation of allocations) {
      const result = await prisma.creditLot.updateMany({
        where: {
          tenantId: input.tenantId,
          id: allocation.creditLotId,
          customerId: input.customerId,
          remainingAmountKobo: { gte: allocation.amountKobo },
        },
        data: { remainingAmountKobo: { decrement: allocation.amountKobo } },
      });

      if (result.count !== 1) {
        throw new DomainHttpException(
          HttpStatus.SERVICE_UNAVAILABLE,
          'REDEMPTION_TRANSACTION_CONFLICT',
          'Credit lot changed during allocation',
        );
      }
    }

    return allocations;
  }

  async planRestorations(
    prisma: RestorationPrismaClient,
    input: PlanRestorationInput,
  ): Promise<PlannedRestoration[]> {
    const now = input.now ?? new Date();
    const allocations = await prisma.redemptionAllocation.findMany({
      where: {
        tenantId: input.tenantId,
        redemptionLedgerEntryId: input.debitLedgerEntryId,
      },
      orderBy: { allocationOrder: 'asc' },
      select: {
        id: true,
        creditLotId: true,
        amountKobo: true,
        creditLot: { select: { expiresAt: true } },
        restorations: { select: { amountKobo: true } },
      },
    });

    const restorations = allocations
      .map((allocation) => {
        if (allocation.creditLot.expiresAt <= now) {
          throw reviewRequired('Original credit lot is expired');
        }

        const restoredAmount = allocation.restorations.reduce(
          (sum, restoration) => sum + restoration.amountKobo,
          0n,
        );
        const amountKobo = allocation.amountKobo - restoredAmount;

        if (amountKobo < 0n) {
          throw reviewRequired(
            'Restoration evidence exceeds allocation amount',
          );
        }

        return {
          allocationId: allocation.id,
          creditLotId: allocation.creditLotId,
          amountKobo,
          expiresAt: allocation.creditLot.expiresAt,
        };
      })
      .filter((restoration) => restoration.amountKobo > 0n);

    if (restorations.length === 0) {
      throw reviewRequired('No restorable allocation balance remains');
    }

    return restorations;
  }

  private async lockEligibleLots(
    prisma: AllocationPrismaClient,
    input: AllocateDebitInput,
  ): Promise<LockedCreditLot[]> {
    const now = input.now ?? new Date();
    const excludedCreditLotIds = input.excludedCreditLotIds ?? [];
    const exclusion = excludedCreditLotIds.length
      ? Prisma.sql`AND "id" NOT IN (${Prisma.join(excludedCreditLotIds)})`
      : Prisma.empty;

    return prisma.$queryRaw<LockedCreditLot[]>(Prisma.sql`
      SELECT "id", "remainingAmountKobo", "expiresAt"
      FROM "CreditLot"
      WHERE "tenantId" = ${input.tenantId}
        AND "customerId" = ${input.customerId}
        AND "remainingAmountKobo" > 0
        AND "expiresAt" > ${now}
        ${exclusion}
      ORDER BY "expiresAt" ASC, "earnedAt" ASC, "id" ASC
      FOR UPDATE
    `);
  }

  private planAllocations(
    lots: LockedCreditLot[],
    amountKobo: bigint,
  ): PersistedAllocation[] {
    let remaining = amountKobo;
    const allocations: PersistedAllocation[] = [];

    for (const lot of lots) {
      if (remaining === 0n) {
        break;
      }

      const amount =
        lot.remainingAmountKobo < remaining
          ? lot.remainingAmountKobo
          : remaining;

      allocations.push({
        creditLotId: lot.id,
        amountKobo: amount,
        allocationOrder: allocations.length + 1,
        expiresAt: lot.expiresAt,
      });
      remaining -= amount;
    }

    if (remaining > 0n) {
      throw new DomainHttpException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INSUFFICIENT_BALANCE',
        'Active balance is lower than requested debit amount',
      );
    }

    return allocations;
  }
}

function reviewRequired(message: string): DomainHttpException {
  return new DomainHttpException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'REVERSAL_REVIEW_REQUIRED',
    message,
  );
}
