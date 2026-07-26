import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

type ActiveBalancePrismaClient = {
  creditLot: {
    aggregate: (args: {
      where: {
        tenantId: string;
        customerId: string;
        remainingAmountKobo: { gt: number };
        expiresAt: { gt: Date };
      };
      _sum: { remainingAmountKobo: true };
    }) => Promise<{ _sum: { remainingAmountKobo: bigint | null } }>;
    groupBy: (args: {
      by: ['customerId'];
      where: {
        tenantId: string;
        customerId: { in: string[] };
        remainingAmountKobo: { gt: number };
        expiresAt: { gt: Date };
      };
      _sum: { remainingAmountKobo: true };
    }) => Promise<
      Array<{
        customerId: string;
        _sum: { remainingAmountKobo: bigint | null };
      }>
    >;
    findMany: (args: {
      where: {
        tenantId: string;
        customerId: string;
        remainingAmountKobo: { gt: number };
        expiresAt: { gt: Date };
      };
      orderBy: [{ expiresAt: 'asc' }, { earnedAt: 'asc' }, { id: 'asc' }];
      select: {
        id: true;
        tenantId: true;
        customerId: true;
        originalAmountKobo: true;
        remainingAmountKobo: true;
        earnedAt: true;
        expiresAt: true;
      };
    }) => Promise<ActiveCreditLot[]>;
  };
};

export interface ActiveCreditLot {
  id: string;
  tenantId: string;
  customerId: string;
  originalAmountKobo: bigint;
  remainingAmountKobo: bigint;
  earnedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class ActiveBalanceService {
  constructor(private readonly prismaService: PrismaService) {}

  async getActiveBalanceKobo(
    tenantId: string,
    customerId: string,
    now = new Date(),
    prisma: ActiveBalancePrismaClient = this.prismaService,
  ): Promise<bigint> {
    const result = await prisma.creditLot.aggregate({
      where: activeCreditLotWhere(tenantId, customerId, now),
      _sum: { remainingAmountKobo: true },
    });

    return result._sum.remainingAmountKobo ?? 0n;
  }

  async getActiveBalancesKobo(
    tenantId: string,
    customerIds: string[],
    now = new Date(),
    prisma: ActiveBalancePrismaClient = this.prismaService,
  ): Promise<Map<string, bigint>> {
    const uniqueCustomerIds = [...new Set(customerIds)];
    const balances = new Map<string, bigint>(
      uniqueCustomerIds.map((customerId) => [customerId, 0n]),
    );

    if (uniqueCustomerIds.length === 0) {
      return balances;
    }

    const rows = await prisma.creditLot.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        customerId: { in: uniqueCustomerIds },
        remainingAmountKobo: { gt: 0 },
        expiresAt: { gt: now },
      },
      _sum: { remainingAmountKobo: true },
    });

    for (const row of rows) {
      balances.set(row.customerId, row._sum.remainingAmountKobo ?? 0n);
    }

    return balances;
  }

  async getActiveCreditLots(
    tenantId: string,
    customerId: string,
    now = new Date(),
    prisma: ActiveBalancePrismaClient = this.prismaService,
  ): Promise<ActiveCreditLot[]> {
    return prisma.creditLot.findMany({
      where: activeCreditLotWhere(tenantId, customerId, now),
      orderBy: [{ expiresAt: 'asc' }, { earnedAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        tenantId: true,
        customerId: true,
        originalAmountKobo: true,
        remainingAmountKobo: true,
        earnedAt: true,
        expiresAt: true,
      },
    });
  }

  toJsonSafeKobo(amount: bigint): number {
    if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError('kobo amount exceeds JSON-safe integer range');
    }

    return Number(amount);
  }
}

function activeCreditLotWhere(tenantId: string, customerId: string, now: Date) {
  return {
    tenantId,
    customerId,
    remainingAmountKobo: { gt: 0 },
    expiresAt: { gt: now },
  };
}
