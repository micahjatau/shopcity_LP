import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { LedgerEntryType, Prisma, UserRole } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import {
  decodeCursor,
  encodeCursor,
  parseCursorPageRequest,
} from '../../common/pagination/cursor-pagination';
import { PrismaService } from '../../database/prisma.service';

type AdminTransactionOutcome = 'CONFIRMED' | 'REVERSED';

export interface AdminTransactionSearchFilters {
  branchId?: string;
  status?: string;
  staffId?: string;
  minReceiptAmountKobo?: string;
}

export interface AdminTransactionSearchResponse {
  items: Array<{
    transactionId: string;
    receiptNumber: string;
    operation: 'EARN' | 'REDEEM';
    amountKobo: number;
    creditKobo: number | null;
    customerName: string | null;
    purchaseAmountKobo: number | null;
    status: AdminTransactionOutcome;
    occurredAt: string;
  }>;
  staffOptions: Array<{ id: string; label: string }>;
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class AdminTransactionSearchService {
  constructor(private readonly prismaService: PrismaService) {}

  async searchTransactions(
    tenantId: string,
    actor: AuthContext,
    receiptNumber?: string,
    limitValue?: string,
    cursor?: string,
    filters: AdminTransactionSearchFilters = {},
  ): Promise<AdminTransactionSearchResponse> {
    if (actor.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin transaction search is restricted');
    }

    const normalizedReceiptNumber = receiptNumber?.trim()
      ? receiptNumber.trim().toUpperCase()
      : undefined;
    const { limit } = parseCursorPageRequest(limitValue, cursor, 10, 50);
    const cursorPosition = cursor ? decodeCursor(cursor) : null;
    const cursorTimestamp = cursorPosition
      ? new Date(cursorPosition.timestamp)
      : null;
    if (
      cursorPosition &&
      (!cursorTimestamp || Number.isNaN(cursorTimestamp.getTime()))
    ) {
      throw new BadRequestException('Pagination cursor timestamp is invalid');
    }

    const normalizedStatus = filters.status?.trim().toUpperCase();
    if (
      normalizedStatus &&
      normalizedStatus !== 'CONFIRMED' &&
      normalizedStatus !== 'REVERSED'
    ) {
      throw new BadRequestException('Unsupported transaction status filter');
    }

    const branchId = filters.branchId?.trim() || undefined;
    const staffId = filters.staffId?.trim() || undefined;
    const rawMinimum = filters.minReceiptAmountKobo?.trim();
    let minimumReceiptAmountKobo: bigint | undefined;
    if (rawMinimum) {
      if (!/^\d{1,19}$/.test(rawMinimum)) {
        throw new BadRequestException(
          'Minimum receipt amount must be integer kobo',
        );
      }
      minimumReceiptAmountKobo = BigInt(rawMinimum);
      if (minimumReceiptAmountKobo > 9223372036854775807n) {
        throw new BadRequestException('Minimum receipt amount is out of range');
      }
    }

    const receiptScope: Prisma.ReceiptWhereInput = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      ...(normalizedReceiptNumber
        ? { normalizedPosReceiptNumber: normalizedReceiptNumber }
        : {}),
      ...(staffId ? { capturedBy: staffId } : {}),
      ...(minimumReceiptAmountKobo !== undefined
        ? { purchaseAmountKobo: { gte: minimumReceiptAmountKobo } }
        : {}),
    };
    const where: Prisma.LoyaltyLedgerEntryWhereInput = {
      tenantId,
      type: { in: [LedgerEntryType.EARN, LedgerEntryType.REDEEM] },
      receipt: { is: receiptScope },
      ...(normalizedStatus === 'REVERSED'
        ? { reversedByEntries: { some: { tenantId } } }
        : normalizedStatus === 'CONFIRMED'
          ? { reversedByEntries: { none: { tenantId } } }
          : {}),
      ...(cursorPosition && cursorTimestamp
        ? {
            OR: [
              { effectiveAt: { lt: cursorTimestamp } },
              {
                effectiveAt: cursorTimestamp,
                id: { lt: cursorPosition.id },
              },
            ],
          }
        : {}),
    };

    const [entries, tenantStaff] = await Promise.all([
      this.prismaService.loyaltyLedgerEntry.findMany({
        where,
        orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
          type: true,
          amountKobo: true,
          effectiveAt: true,
          reversedByEntries: { select: { id: true }, take: 1 },
          receipt: {
            select: {
              posReceiptNumber: true,
              purchaseAmountKobo: true,
              customer: { select: { fullName: true } },
            },
          },
        },
      }),
      this.prismaService.user.findMany({
        where: {
          tenantId,
          receiptsCaptured: {
            some: {
              tenantId,
              ...(branchId ? { branchId } : {}),
              ...(normalizedReceiptNumber
                ? { normalizedPosReceiptNumber: normalizedReceiptNumber }
                : {}),
            },
          },
        },
        select: { id: true, username: true },
        orderBy: [{ username: 'asc' }, { id: 'asc' }],
        take: 50,
      }),
    ]);

    const hasMore = entries.length > limit;
    const pageItems = entries.slice(0, limit);
    const lastItem = pageItems.at(-1);

    return {
      items: pageItems.map((entry) => ({
        transactionId: entry.id,
        receiptNumber:
          entry.receipt?.posReceiptNumber ??
          normalizedReceiptNumber ??
          'Not provided',
        operation: entry.type === LedgerEntryType.EARN ? 'EARN' : 'REDEEM',
        amountKobo: Number(entry.amountKobo),
        creditKobo:
          entry.type === LedgerEntryType.EARN ? Number(entry.amountKobo) : null,
        customerName: entry.receipt?.customer?.fullName ?? null,
        purchaseAmountKobo:
          entry.receipt?.purchaseAmountKobo == null
            ? null
            : Number(entry.receipt.purchaseAmountKobo),
        status: entry.reversedByEntries?.length ? 'REVERSED' : 'CONFIRMED',
        occurredAt: entry.effectiveAt.toISOString(),
      })),
      staffOptions: tenantStaff.map((staff) => ({
        id: staff.id,
        label: staff.username,
      })),
      nextCursor:
        hasMore && lastItem
          ? encodeCursor(lastItem.id, lastItem.effectiveAt)
          : null,
      hasMore,
    };
  }
}
