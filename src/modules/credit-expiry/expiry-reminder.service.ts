import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SmsMessageStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { buildCreditExpiryReminderSmsPayload } from '../../jobs/sms.templates';

export interface EnqueueDueRemindersInput {
  now: Date;
  reminderDays: number;
  batchSize: number;
}

export interface ReminderSweepResult {
  customers: number;
  amountKobo: bigint;
}

type ReminderCandidate = {
  tenantId: string;
  customerId: string;
  phoneE164: string;
};

type RevalidatedReminderCandidate = {
  totalExpiringKobo: bigint;
  earliestExpiresAt: Date;
  latestExpiresAt: Date;
};

@Injectable()
export class ExpiryReminderService {
  constructor(private readonly prismaService: PrismaService) {}

  async enqueueDueReminders(
    input: EnqueueDueRemindersInput,
  ): Promise<ReminderSweepResult> {
    if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
      throw new BadRequestException('now must be a valid Date');
    }

    if (!Number.isInteger(input.reminderDays) || input.reminderDays <= 0) {
      throw new BadRequestException('reminderDays must be a positive integer');
    }

    if (!Number.isInteger(input.batchSize) || input.batchSize <= 0) {
      throw new BadRequestException('batchSize must be a positive integer');
    }

    const reminderDate = startOfUtcDay(
      addDaysUtc(input.now, input.reminderDays),
    );
    const reminderDateEnd = addDaysUtc(reminderDate, 1);

    const candidates = await this.prismaService.$queryRaw<
      ReminderCandidate[]
    >(Prisma.sql`
      SELECT
        cl."tenantId",
        cl."customerId",
        c."phoneE164",
        SUM(cl."remainingAmountKobo")::bigint AS "totalExpiringKobo",
        MIN(cl."expiresAt") AS "earliestExpiresAt",
        MAX(cl."expiresAt") AS "latestExpiresAt"
      FROM "CreditLot" cl
      JOIN "Customer" c
        ON c."tenantId" = cl."tenantId"
       AND c."id" = cl."customerId"
      WHERE cl."remainingAmountKobo" > 0
        AND cl."expiresAt" >= ${reminderDate}
        AND cl."expiresAt" < ${reminderDateEnd}
        AND NOT EXISTS (
          SELECT 1
          FROM "CreditExpiryReminder" cer
          WHERE cer."tenantId" = cl."tenantId"
            AND cer."customerId" = cl."customerId"
            AND cer."reminderDate" = ${reminderDate}
        )
      GROUP BY cl."tenantId", cl."customerId", c."phoneE164"
      ORDER BY cl."tenantId" ASC, cl."customerId" ASC
      LIMIT ${input.batchSize}
    `);

    let customers = 0;
    let amountKobo = 0n;

    for (const candidate of candidates) {
      try {
        const reminder = await this.prismaService.$transaction(async (tx) => {
          const revalidated = await buildRevalidatedReminderCandidate(tx, {
            tenantId: candidate.tenantId,
            customerId: candidate.customerId,
            reminderDate,
            reminderDateEnd,
          });

          if (revalidated === null) {
            return null;
          }

          const payload = buildCreditExpiryReminderSmsPayload({
            customerId: candidate.customerId,
            phoneE164: candidate.phoneE164,
            totalExpiringKobo: revalidated.totalExpiringKobo,
            earliestExpiresAt: revalidated.earliestExpiresAt,
            latestExpiresAt: revalidated.latestExpiresAt,
          });

          const outboxEvent = await tx.outboxEvent.create({
            data: {
              tenantId: candidate.tenantId,
              aggregateType: 'customer',
              aggregateId: candidate.customerId,
              eventType: 'sms.send',
              payload,
              status: 'PENDING',
              nextAttemptAt: input.now,
            },
          });

          await tx.smsMessage.create({
            data: {
              tenantId: candidate.tenantId,
              receiptId: null,
              outboxEventId: outboxEvent.id,
              ledgerEntryId: null,
              redemptionId: null,
              adjustmentId: null,
              phoneE164: candidate.phoneE164,
              template: 'credit-expiry-reminder-v1',
              payload,
              status: SmsMessageStatus.QUEUED,
              queuedAt: input.now,
            },
          });

          await tx.creditExpiryReminder.create({
            data: {
              tenantId: candidate.tenantId,
              customerId: candidate.customerId,
              reminderDate,
              totalExpiringKobo: revalidated.totalExpiringKobo,
              earliestExpiresAt: revalidated.earliestExpiresAt,
              latestExpiresAt: revalidated.latestExpiresAt,
              outboxEventId: outboxEvent.id,
            },
          });

          return revalidated;
        });

        if (reminder === null) {
          continue;
        }

        customers += 1;
        amountKobo += reminder.totalExpiringKobo;
      } catch (error) {
        if (!isReminderUniquenessConflict(error)) {
          throw error;
        }
      }
    }

    return { customers, amountKobo };
  }
}

function isReminderUniquenessConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

async function buildRevalidatedReminderCandidate(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    customerId: string;
    reminderDate: Date;
    reminderDateEnd: Date;
  },
): Promise<RevalidatedReminderCandidate | null> {
  const lots = await tx.$queryRaw<
    Array<{ remainingAmountKobo: bigint; expiresAt: Date }>
  >(Prisma.sql`
      SELECT cl."remainingAmountKobo", cl."expiresAt"
      FROM "CreditLot" cl
      WHERE cl."tenantId" = ${input.tenantId}
        AND cl."customerId" = ${input.customerId}
        AND cl."remainingAmountKobo" > 0
        AND cl."expiresAt" >= ${input.reminderDate}
        AND cl."expiresAt" < ${input.reminderDateEnd}
      ORDER BY cl."expiresAt" ASC, cl."earnedAt" ASC, cl."id" ASC
      FOR UPDATE
    `);

  if (lots.length === 0) {
    return null;
  }

  let totalExpiringKobo = 0n;
  let earliestExpiresAt = lots[0].expiresAt;
  let latestExpiresAt = lots[0].expiresAt;

  for (const lot of lots) {
    totalExpiringKobo += lot.remainingAmountKobo;
    if (lot.expiresAt < earliestExpiresAt) {
      earliestExpiresAt = lot.expiresAt;
    }
    if (lot.expiresAt > latestExpiresAt) {
      latestExpiresAt = lot.expiresAt;
    }
  }

  return {
    totalExpiringKobo,
    earliestExpiresAt,
    latestExpiresAt,
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
