import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
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

const CREDIT_EXPIRY_TRANSACTION_RETRY_ATTEMPTS = 5;

type CreditExpiryTransactionStage =
  | 'transaction_start'
  | 'due_lot_selection'
  | 'system_actor_resolution'
  | 'ledger_entry_creation'
  | 'expiry_evidence_creation'
  | 'lot_balance_decrement'
  | 'audit_record_creation'
  | 'transaction_callback_return';

@Injectable()
export class CreditExpiryService {
  private readonly logger = new Logger(CreditExpiryService.name);
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

    let attempt = 0;
    return runWithBoundedFinancialRetries(
      () => {
        attempt += 1;
        let stage: CreditExpiryTransactionStage = 'transaction_start';
        let callbackReturned = false;
        const startedAt = performance.now();

        return this.prismaService
          .$transaction(async (prisma) => {
            stage = 'due_lot_selection';
            const dueLots = await this.lockDueLots(prisma, input);

            if (dueLots.length === 0) {
              stage = 'transaction_callback_return';
              callbackReturned = true;
              return { examined: 0, expiredLots: 0, expiredAmountKobo: 0n };
            }

            const systemActorByTenant = new Map<
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
                stage = 'system_actor_resolution';
                systemActor = await this.systemActorService.getOrCreate(
                  prisma,
                  lot.tenantId,
                );
                systemActorByTenant.set(lot.tenantId, systemActor);
              }

              stage = 'ledger_entry_creation';
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

              stage = 'expiry_evidence_creation';
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

              stage = 'lot_balance_decrement';
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

              stage = 'audit_record_creation';
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

            stage = 'transaction_callback_return';
            callbackReturned = true;
            return {
              examined: dueLots.length,
              expiredLots,
              expiredAmountKobo,
            };
          }, FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS)
          .catch((error: unknown) => {
            try {
              const durationMs = Math.max(
                0,
                Math.round(performance.now() - startedAt),
              );
              this.logger.error(
                JSON.stringify({
                  event: 'credit_expiry_transaction_failed',
                  attempt,
                  stage,
                  phase: callbackReturned ? 'commit' : 'callback',
                  durationMs,
                  ...summarizeCreditExpiryError(error),
                }),
              );
            } catch {
              // Diagnostic failures must not replace the transaction error.
            }
            throw error;
          });
      },
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

type SafeCreditExpiryErrorSummary = {
  errorClass: string;
  reason: string;
  prismaCode?: string;
  sqlState?: string;
  constraint?: string;
  trigger?: string;
  routine?: string;
  model?: string;
};

const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/;
const SAFE_ERROR_CLASS = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;
const PRISMA_ERROR_CODE = /^P[0-9]{4}$/;
const POSTGRES_SQLSTATE = /^[0-9A-Z]{5}$/;

function summarizeCreditExpiryError(
  error: unknown,
): SafeCreditExpiryErrorSummary {
  const records = getErrorRecords(error);
  let prismaCode: string | undefined;
  let sqlState: string | undefined;
  let constraint: string | undefined;
  let trigger: string | undefined;
  let routine: string | undefined;
  let model: string | undefined;

  for (const record of records) {
    const code = readString(record, 'code');
    if (!prismaCode && code && PRISMA_ERROR_CODE.test(code)) {
      prismaCode = code;
    } else if (
      !sqlState &&
      code &&
      POSTGRES_SQLSTATE.test(code) &&
      !PRISMA_ERROR_CODE.test(code)
    ) {
      sqlState = code;
    }

    const meta = readProperty(record, 'meta');
    if (isRecord(meta)) {
      const metaCode = readString(meta, 'code');
      if (!prismaCode && metaCode && PRISMA_ERROR_CODE.test(metaCode)) {
        prismaCode = metaCode;
      } else if (
        !sqlState &&
        metaCode &&
        POSTGRES_SQLSTATE.test(metaCode) &&
        !PRISMA_ERROR_CODE.test(metaCode)
      ) {
        sqlState = metaCode;
      }
      constraint ??= readSafeIdentifier(meta, 'constraint', 'constraint_name');
      trigger ??= readSafeIdentifier(meta, 'trigger', 'trigger_name');
      routine ??= readSafeIdentifier(meta, 'routine', 'function');
      model ??= readSafeIdentifier(meta, 'modelName');
    }

    const message = readProperty(record, 'message');
    if (typeof message === 'string') {
      sqlState ??= extractSqlState(message);
      constraint ??= extractNamedIdentifier(message, 'constraint');
      trigger ??= extractNamedIdentifier(message, 'trigger');
      routine ??= extractRoutineName(message);
    }
  }

  const errorClass = getSafeErrorClass(records);
  return {
    errorClass,
    reason: classifyCreditExpiryError(errorClass, prismaCode, sqlState),
    ...(prismaCode ? { prismaCode } : {}),
    ...(sqlState ? { sqlState } : {}),
    ...(constraint ? { constraint } : {}),
    ...(trigger ? { trigger } : {}),
    ...(routine ? { routine } : {}),
    ...(model ? { model } : {}),
  };
}

function getErrorRecords(error: unknown): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];
  const visited = new Set<object>();
  let current = error;

  for (let depth = 0; depth < 3 && isRecord(current); depth += 1) {
    if (visited.has(current)) {
      break;
    }
    visited.add(current);
    records.push(current);
    current = readProperty(current, 'cause');
  }

  return records;
}

function getSafeErrorClass(records: Array<Record<string, unknown>>): string {
  for (const record of records) {
    const name = readString(record, 'name');
    if (name && SAFE_ERROR_CLASS.test(name)) {
      return name;
    }
    const constructor = readProperty(record, 'constructor');
    if (isRecord(constructor)) {
      const constructorName = readString(constructor, 'name');
      if (constructorName && SAFE_ERROR_CLASS.test(constructorName)) {
        return constructorName;
      }
    }
  }

  return 'Error';
}

function classifyCreditExpiryError(
  errorClass: string,
  prismaCode?: string,
  sqlState?: string,
): string {
  const postgresReasons: Record<string, string> = {
    '23502': 'not_null_violation',
    '23503': 'foreign_key_violation',
    '23505': 'unique_violation',
    '23514': 'check_violation',
    '40001': 'serialization_failure',
    '40P01': 'deadlock_detected',
    '55P03': 'lock_not_available',
    '57014': 'query_canceled',
    '42501': 'insufficient_privilege',
    '42703': 'undefined_column',
    '42P01': 'undefined_table',
    '42883': 'undefined_function',
  };
  const prismaReasons: Record<string, string> = {
    P2002: 'unique_constraint_violation',
    P2003: 'foreign_key_violation',
    P2004: 'database_constraint_violation',
    P2010: 'raw_query_error',
    P2024: 'connection_pool_timeout',
    P2028: 'transaction_api_error',
    P2034: 'transaction_conflict',
  };

  if (sqlState && postgresReasons[sqlState]) {
    return postgresReasons[sqlState];
  }
  if (prismaCode && prismaReasons[prismaCode]) {
    return prismaReasons[prismaCode];
  }
  if (errorClass === 'PrismaClientUnknownRequestError') {
    return 'prisma_unknown_request_error';
  }
  if (errorClass.startsWith('Prisma')) {
    return 'prisma_error';
  }
  return 'database_or_application_error';
}

function extractSqlState(message: string): string | undefined {
  const match = message.match(
    /\b(?:SQLSTATE|SQL\s+STATE|database\s+error\s+code|error\s+code|code)\s*(?::|=)?\s*["']?([0-9A-Z]{5})\b/i,
  );
  const code = match?.[1];
  return code && POSTGRES_SQLSTATE.test(code) && !PRISMA_ERROR_CODE.test(code)
    ? code
    : undefined;
}

function extractNamedIdentifier(
  message: string,
  label: 'constraint' | 'trigger',
): string | undefined {
  const match = message.match(
    new RegExp(`\\b${label}\\s+["']([A-Za-z_][A-Za-z0-9_$]{0,62})["']`, 'i'),
  );
  return match?.[1];
}

function extractRoutineName(message: string): string | undefined {
  const match = message.match(
    /\bfunction\s+(?:["']?([A-Za-z_][A-Za-z0-9_$]*)["']?\.)?["']?([A-Za-z_][A-Za-z0-9_$]*)["']?\s*\(/i,
  );
  const name = match?.[2] ?? match?.[1];
  return name && SAFE_IDENTIFIER.test(name) ? name : undefined;
}

function readSafeIdentifier(
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = readString(record, key);
    if (value && SAFE_IDENTIFIER.test(value)) {
      return value;
    }
  }

  return undefined;
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = readProperty(record, key);
  return typeof value === 'string' ? value : undefined;
}

function readProperty(record: Record<string, unknown>, key: string): unknown {
  try {
    return Reflect.get(record, key);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
