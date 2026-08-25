import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdempotencyRecordStatus, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../database/prisma.service';
import { ReportsService, type ReportCollection } from './reports.service';
import type { AuthContext } from '../../common/auth/session.types';

const DEFAULT_EXPORT_ROW_LIMIT = 5000;
const DEFAULT_EXPORT_RATE_LIMIT_PER_MINUTE = 10;

export type ReportExportName =
  | 'executive-summary'
  | 'liability-ageing'
  | 'customer-performance'
  | 'cashier-activity'
  | 'redemption-summary'
  | 'sms-operations'
  | 'audit-report'
  | 'materialization-state';

interface ReportExportQuery {
  branchId?: string;
  from?: string;
  to?: string;
  timezone?: string;
  format?: string;
}

export interface ExportResult {
  filename: string;
  csv: string;
  rowCount: number;
}

@Injectable()
export class ReportExportService {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async exportCsv(
    tenantId: string,
    context: AuthContext,
    report: ReportExportName,
    query: ReportExportQuery = {},
  ): Promise<ExportResult> {
    if (query.format && query.format !== 'csv') {
      throw new BadRequestException('Only CSV export is supported');
    }

    const collection = await this.loadReport(tenantId, context, report, query);
    const maxRows = this.rowLimit();

    if (collection.items.length > maxRows) {
      throw new BadRequestException('Export exceeds configured row cap');
    }

    const csv = this.toCsv(report, collection.items, context.user.role);

    await this.auditService.record({
      tenantId,
      actorId: context.user.id,
      action: 'REPORT_EXPORTED_CSV',
      entityType: 'REPORT',
      entityId: report,
      metadata: {
        report,
        scope: collection.scope,
        scopeKey: collection.scopeKey,
        branchId: collection.branchId,
        rowCount: collection.items.length,
      },
    });

    return {
      filename: this.filename(report, collection.scopeKey),
      csv,
      rowCount: collection.items.length,
    };
  }

  async refreshReport(
    tenantId: string,
    context: AuthContext,
    report: ReportExportName,
    query: Pick<ReportExportQuery, 'branchId' | 'timezone'> = {},
    idempotencyKey?: string,
  ): Promise<void> {
    this.ensureRefreshAccess(context);
    const normalizedKey = idempotencyKey?.trim() ?? '';
    if (!normalizedKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({ tenantId, actorId: context.user.id, report, query }),
      )
      .digest('hex');
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: {
        tenantId_actorId_endpoint_idempotencyKey: {
          tenantId,
          actorId: context.user.id,
          endpoint: 'reports.refresh',
          idempotencyKey: normalizedKey,
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
    if (existing) {
      if (existing.responseJson) return;
      throw new ConflictException('Idempotency key is still being processed');
    }

    await this.auditService.record({
      tenantId,
      actorId: context.user.id,
      action: 'REPORT_REFRESH_REQUESTED',
      entityType: 'REPORT',
      entityId: report,
      metadata: {
        report,
        branchId: query.branchId ?? null,
      },
    });

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'report',
        aggregateId: report,
        eventType: 'report.refresh',
        payload: {
          version: 1,
          report,
          branchId: query.branchId ?? null,
          timezone: query.timezone ?? null,
        },
        status: 'PENDING',
        nextAttemptAt: new Date(),
      },
    });
    await this.prisma.idempotencyRecord.create({
      data: {
        tenantId,
        actorId: context.user.id,
        endpoint: 'reports.refresh',
        idempotencyKey: normalizedKey,
        requestHash,
        status: IdempotencyRecordStatus.COMPLETED,
        responseJson: { status: 'accepted' },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  private ensureRefreshAccess(context: AuthContext) {
    if (context.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Report refresh is admin-only');
    }
  }

  private async loadReport(
    tenantId: string,
    context: AuthContext,
    report: ReportExportName,
    query: ReportExportQuery,
  ): Promise<ReportCollection<Record<string, unknown>>> {
    const common = {
      branchId: query.branchId,
      from: query.from,
      to: query.to,
      timezone: query.timezone,
    };

    switch (report) {
      case 'executive-summary':
        return this.reportsService.listExecutiveSummary(
          tenantId,
          context,
          common,
        );
      case 'liability-ageing':
        return this.reportsService.listLiabilityAgeing(
          tenantId,
          context,
          common,
        );
      case 'customer-performance':
        return this.reportsService.listCustomerPerformance(
          tenantId,
          context,
          common,
        );
      case 'cashier-activity':
        return this.reportsService.listCashierActivity(
          tenantId,
          context,
          common,
        );
      case 'redemption-summary':
        return this.reportsService.listRedemptionSummary(
          tenantId,
          context,
          common,
        );
      case 'sms-operations':
        return this.reportsService.listSmsOperations(tenantId, context, common);
      case 'audit-report':
        return this.reportsService.listAuditReport(tenantId, context, {
          from: query.from,
          to: query.to,
          timezone: query.timezone,
        });
      case 'materialization-state':
        return this.reportsService.listMaterializationState(tenantId, context, {
          branchId: query.branchId,
          timezone: query.timezone,
        });
      default:
        throw new BadRequestException('Unsupported report export');
    }
  }

  private toCsv(
    report: ReportExportName,
    rows: Array<Record<string, unknown>>,
    role: UserRole,
  ): string {
    const columns = reportColumns(report);
    const header = columns.map(escapeCsvCell).join(',');
    const body = rows.map((row) =>
      columns
        .map((column) =>
          escapeCsvCell(maskCell(row[column], role !== UserRole.ADMIN)),
        )
        .join(','),
    );

    return [header, ...body].join('\n');
  }

  private filename(report: ReportExportName, scopeKey: string): string {
    return `${report}-${scopeKey}-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  private rowLimit(): number {
    return (
      this.configService.get<number>('REPORT_EXPORT_MAX_ROWS') ??
      DEFAULT_EXPORT_ROW_LIMIT
    );
  }

  rateLimit(): number {
    return (
      this.configService.get<number>('REPORT_EXPORT_RATE_LIMIT_PER_MINUTE') ??
      DEFAULT_EXPORT_RATE_LIMIT_PER_MINUTE
    );
  }
}

function reportColumns(report: ReportExportName): string[] {
  switch (report) {
    case 'executive-summary':
      return [
        'scope',
        'scopeKey',
        'branchId',
        'reportDate',
        'registeredCustomers',
        'activeCustomers',
        'transactionCount',
        'loyaltyPurchaseValueKobo',
        'creditIssuedKobo',
        'creditRedeemedKobo',
        'creditExpiredKobo',
        'outstandingLiabilityKobo',
        'materializedAt',
      ];
    case 'liability-ageing':
      return [
        'scope',
        'scopeKey',
        'branchId',
        'reportDate',
        'expiryMonth',
        'ageBucket',
        'customerCount',
        'lotCount',
        'outstandingKobo',
        'materializedAt',
      ];
    case 'customer-performance':
      return [
        'scope',
        'scopeKey',
        'branchId',
        'customerId',
        'reportDate',
        'purchaseValueKobo',
        'currentBalanceKobo',
        'visitCount',
        'lastActivityAt',
        'dormant',
        'materializedAt',
      ];
    case 'cashier-activity':
      return [
        'scope',
        'scopeKey',
        'branchId',
        'cashierId',
        'reportDate',
        'transactionCount',
        'purchaseValueKobo',
        'creditIssuedKobo',
        'duplicateAttempts',
        'reversalCount',
        'approvalRequests',
        'materializedAt',
      ];
    case 'redemption-summary':
      return [
        'scope',
        'scopeKey',
        'branchId',
        'reportDate',
        'redemptionCount',
        'requestedKobo',
        'confirmedKobo',
        'reversedKobo',
        'pendingApprovalCount',
        'materializedAt',
      ];
    case 'sms-operations':
      return [
        'scope',
        'scopeKey',
        'branchId',
        'reportDate',
        'queuedCount',
        'sentCount',
        'deliveredCount',
        'failedCount',
        'suppressedCount',
        'materializedAt',
      ];
    case 'audit-report':
      return [
        'tenantId',
        'actorId',
        'actorTenantId',
        'action',
        'entityType',
        'entityId',
        'requestId',
        'createdAt',
      ];
    case 'materialization-state':
      return [
        'scope',
        'scopeKey',
        'branchId',
        'asOf',
        'status',
        'lastError',
        'materializedAt',
        'updatedAt',
      ];
  }
}

function maskCell(value: unknown, mask: boolean): unknown {
  if (!mask || typeof value !== 'string') {
    return value;
  }

  if (/^\+?\d{10,15}$/.test(value)) {
    return maskPhone(value);
  }

  return value;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) {
    return '***';
  }

  const start = digits.slice(0, 3);
  const end = digits.slice(-2);
  return `${start}${'*'.repeat(Math.max(0, digits.length - 5))}${end}`;
}

function escapeCsvCell(value: unknown): string {
  const text = normalizeCellValue(value);
  const escaped = text.replace(/"/g, '""');
  const safe = /^[=+\-@]/.test(escaped) ? `'${escaped}` : escaped;

  if (/[,"\n\r]/.test(safe) || /^\s|\s$/.test(safe)) {
    return `"${safe}"`;
  }

  return safe;
}

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === 'bigint' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return '';
}
