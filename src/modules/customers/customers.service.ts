import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CardStatus,
  Customer,
  CustomerStatus,
  IdempotencyRecordStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { ActiveBalanceService } from '../../common/balance/active-balance.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { normalizePhoneToE164 } from '../../common/phone';
import {
  CursorPageRequest,
  decodeCursor,
  encodeCursor,
  pageMeta,
} from '../../common/pagination/cursor-pagination';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly activeBalanceService: ActiveBalanceService = new ActiveBalanceService(
      prismaService,
    ),
  ) {}

  async listCustomers(tenantId: string, query?: string): Promise<Customer[]>;
  async listCustomers(
    tenantId: string,
    actor: AuthContext,
    query?: string,
    page?: CursorPageRequest,
  ): Promise<{
    items: Array<PrivilegedCustomerSummary | CashierCustomerSummary>;
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  async listCustomers(
    tenantId: string,
    actorOrQuery?: AuthContext | string,
    query?: string,
    page?: CursorPageRequest,
  ): Promise<unknown> {
    const actor = typeof actorOrQuery === 'string' ? undefined : actorOrQuery;
    const normalizedQuery =
      typeof actorOrQuery === 'string' ? actorOrQuery : query;
    if (!actor) {
      return this.prismaService.customer.findMany({
        where: customerSearchWhere(tenantId, normalizedQuery),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    }

    const decodedCursor = page?.cursor ? decodeCursor(page.cursor) : undefined;
    const customers = await this.prismaService.customer.findMany({
      where: customerSearchWhere(tenantId, normalizedQuery),
      include: customerReadInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(page
        ? {
            take: page.limit + 1,
            ...(decodedCursor
              ? { cursor: { id: decodedCursor.id }, skip: 1 }
              : {}),
          }
        : {}),
    });

    const { pageItems, hasMore } = pageMeta(
      customers,
      page?.limit ?? customers.length,
    );
    const balances = await this.activeBalanceService.getActiveBalancesKobo(
      tenantId,
      pageItems.map((customer) => customer.id),
    );

    if (isPrivilegedCustomerRead(actor)) {
      await this.auditService.record({
        tenantId,
        actorId: actor.user.id,
        action: 'customer.pii.list',
        entityType: 'customer',
        metadata: {
          queryPresent: Boolean(normalizedQuery),
          queryType: classifyCustomerSearchQuery(normalizedQuery),
          resultCount: pageItems.length,
        },
      });

      return {
        items: pageItems.map((customer) =>
          toPrivilegedCustomerSummary(
            customer,
            balances.get(customer.id) ?? 0n,
          ),
        ),
        nextCursor: hasMore ? customerCursor(pageItems.at(-1)!) : null,
        hasMore,
      };
    }

    return {
      items: pageItems.map((customer) =>
        toCashierCustomerSummary(customer, balances.get(customer.id) ?? 0n),
      ),
      nextCursor: hasMore ? customerCursor(pageItems.at(-1)!) : null,
      hasMore,
    };
  }

  async getCustomer(tenantId: string, id: string): Promise<CustomerReadRecord>;
  async getCustomer(
    tenantId: string,
    id: string,
    actor: AuthContext,
  ): Promise<
    CustomerReadRecord | PrivilegedCustomerSummary | CashierCustomerSummary
  >;
  async getCustomer(tenantId: string, id: string, actor?: AuthContext) {
    const customer = await this.prismaService.customer.findFirst({
      where: { tenantId, id },
      include: customerReadInclude,
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const activeBalanceKobo =
      await this.activeBalanceService.getActiveBalanceKobo(
        tenantId,
        customer.id,
      );

    if (actor && isPrivilegedCustomerRead(actor)) {
      await this.auditService.record({
        tenantId,
        actorId: actor.user.id,
        action: 'customer.pii.read',
        entityType: 'customer',
        entityId: customer.id,
      });

      return toPrivilegedCustomerSummary(customer, activeBalanceKobo);
    }

    if (actor?.user.role === UserRole.CASHIER) {
      return toCashierCustomerSummary(customer, activeBalanceKobo);
    }

    return customer;
  }

  async createCustomer(
    tenantId: string,
    actor: AuthContext,
    data: {
      fullName: string;
      phone: string;
      email?: string;
      isStaff?: boolean;
      branchId?: string;
    },
    idempotencyKey: string | undefined,
  ) {
    const normalizedKey = normalizeCustomerIdempotencyKey(idempotencyKey);
    const endpoint = 'customers.create';
    const requestHash = hashCustomerRequest({
      tenantId,
      actorId: actor.user.id,
      ...data,
    });
    const existingIdempotency = await findCustomerIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      normalizedKey,
      requestHash,
    );
    if (existingIdempotency?.responseJson) {
      return existingIdempotency.responseJson as unknown as Customer;
    }
    if (existingIdempotency) {
      throw new ConflictException('Idempotency key is still being processed');
    }

    const phoneE164 = normalizePhoneToE164(data.phone);
    const email = data.email?.trim().toLowerCase();
    if (!phoneE164.startsWith('+')) {
      throw new BadRequestException('Phone number is invalid');
    }

    const branchId = data.branchId ?? actor.user.branchId ?? undefined;
    if (!branchId) {
      throw new BadRequestException('Branch is required for customer creation');
    }

    const branch = await this.prismaService.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) {
      throw new BadRequestException('Branch not found for tenant');
    }

    const existing = await this.prismaService.customer.findFirst({
      where: {
        tenantId,
        OR: [{ phoneE164 }, ...(email ? [{ email }] : [])],
      },
    });
    if (existing) {
      throw new ConflictException('Active customer already exists');
    }

    return this.prismaService.$transaction(async (prisma) => {
      await prisma.idempotencyRecord.create({
        data: {
          tenantId,
          actorId: actor.user.id,
          endpoint,
          idempotencyKey: normalizedKey,
          requestHash,
          status: IdempotencyRecordStatus.PENDING,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const customer = await prisma.customer.create({
        data: {
          tenantId,
          branchId,
          fullName: data.fullName,
          email,
          phoneE164,
          isStaff: data.isStaff ?? false,
          registeredByTenantId: actor.user.tenantId,
          registeredBy: actor.user.id,
        },
      });

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'customer.create',
        entityType: 'customer',
        entityId: customer.id,
        metadata: customer,
      });

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
          responseJson: customer,
        },
      });

      return customer;
    });
  }

  async updateCustomer(
    tenantId: string,
    actor: AuthContext,
    id: string,
    data: {
      fullName?: string;
      phone?: string;
      email?: string;
      isStaff?: boolean;
    },
    idempotencyKey: string | undefined,
  ) {
    const normalizedKey = normalizeCustomerIdempotencyKey(idempotencyKey);
    const endpoint = 'customers.update';
    const requestHash = hashCustomerRequest({
      tenantId,
      actorId: actor.user.id,
      customerId: id,
      ...data,
    });
    const existingIdempotency = await findCustomerIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      normalizedKey,
      requestHash,
    );
    if (existingIdempotency?.responseJson) {
      return existingIdempotency.responseJson as unknown as Customer;
    }
    if (existingIdempotency) {
      throw new ConflictException('Idempotency key is still being processed');
    }

    const customer = await this.getCustomerRecord(tenantId, id);
    const phoneE164 = data.phone
      ? normalizePhoneToE164(data.phone)
      : customer.phoneE164;
    const email = data.email?.trim().toLowerCase();

    if (data.phone || data.email) {
      const duplicate = await this.prismaService.customer.findFirst({
        where: {
          tenantId,
          OR: [
            ...(data.phone ? [{ phoneE164 }] : []),
            ...(email ? [{ email }] : []),
          ],
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException('Active customer already exists');
      }
    }

    if (data.phone || data.fullName) {
      const branch = await this.prismaService.branch.findFirst({
        where: { id: customer.branchId, tenantId },
      });
      if (!branch) {
        throw new BadRequestException('Branch not found for tenant');
      }
    }

    return this.prismaService.$transaction(async (prisma) => {
      await prisma.idempotencyRecord.create({
        data: {
          tenantId,
          actorId: actor.user.id,
          endpoint,
          idempotencyKey: normalizedKey,
          requestHash,
          status: IdempotencyRecordStatus.PENDING,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          ...(data.fullName ? { fullName: data.fullName } : {}),
          ...(data.phone ? { phoneE164 } : {}),
          ...(data.email ? { email } : {}),
          ...(typeof data.isStaff === 'boolean'
            ? { isStaff: data.isStaff }
            : {}),
        },
      });

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'customer.update',
        entityType: 'customer',
        entityId: updated.id,
        metadata: data,
      });

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
          responseJson: updated,
        },
      });

      return updated;
    });
  }

  private async getCustomerRecord(tenantId: string, id: string) {
    const customer = await this.prismaService.customer.findFirst({
      where: { tenantId, id },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async updateCustomerStatus(
    tenantId: string,
    actor: AuthContext,
    id: string,
    status: string,
    idempotencyKey: string | undefined,
  ) {
    const normalizedKey = normalizeCustomerIdempotencyKey(idempotencyKey);
    const endpoint = 'customers.status';
    const requestHash = hashCustomerRequest({
      tenantId,
      actorId: actor.user.id,
      customerId: id,
      status,
    });
    const existingIdempotency = await findCustomerIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      normalizedKey,
      requestHash,
    );
    if (existingIdempotency?.responseJson) {
      return existingIdempotency.responseJson as unknown as Customer;
    }
    if (existingIdempotency) {
      throw new ConflictException('Idempotency key is still being processed');
    }

    if (!['ACTIVE', 'BLOCKED'].includes(status)) {
      throw new BadRequestException('Invalid customer status');
    }

    const customer = await this.prismaService.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prismaService.$transaction(async (prisma) => {
      await prisma.idempotencyRecord.create({
        data: {
          tenantId,
          actorId: actor.user.id,
          endpoint,
          idempotencyKey: normalizedKey,
          requestHash,
          status: IdempotencyRecordStatus.PENDING,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          status: status as CustomerStatus,
          blockedAt: status === 'BLOCKED' ? new Date() : null,
        },
      });

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'customer.status',
        entityType: 'customer',
        entityId: updated.id,
        metadata: { status },
      });

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
          responseJson: updated,
        },
      });

      return updated;
    });
  }
}

const CUSTOMER_IDEMPOTENCY_KEY_MAX_LENGTH = 255;

function normalizeCustomerIdempotencyKey(value: string | undefined): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    throw new BadRequestException('Idempotency-Key header is required');
  }
  if (normalized.length > CUSTOMER_IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new BadRequestException('Idempotency-Key header is too long');
  }
  return normalized;
}

function hashCustomerRequest(value: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function findCustomerIdempotency(
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

const customerReadInclude = {
  cards: {
    select: { status: true },
    orderBy: { issuedAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.CustomerInclude;

type CustomerReadRecord = Prisma.CustomerGetPayload<{
  include: typeof customerReadInclude;
}>;

type CashierCustomerSummary = ReturnType<typeof toCashierCustomerSummary>;
type PrivilegedCustomerSummary = ReturnType<typeof toPrivilegedCustomerSummary>;

function isPrivilegedCustomerRead(actor: AuthContext): boolean {
  return (
    actor.user.role === UserRole.SUPERVISOR ||
    actor.user.role === UserRole.ADMIN
  );
}

function toCashierCustomerSummary(
  customer: CustomerReadRecord,
  activeBalanceKobo: bigint,
) {
  return {
    customerId: customer.id,
    fullName: customer.fullName,
    maskedPhone: maskPhone(customer.phoneE164),
    cardStatus: customer.cards[0]?.status ?? CardStatus.BLOCKED,
    availableBalanceKobo: Number(activeBalanceKobo),
  };
}

function toPrivilegedCustomerSummary(
  customer: CustomerReadRecord,
  activeBalanceKobo: bigint,
) {
  return {
    id: customer.id,
    tenantId: customer.tenantId,
    branchId: customer.branchId,
    fullName: customer.fullName,
    phoneE164: customer.phoneE164,
    email: customer.email,
    isStaff: customer.isStaff,
    status: customer.status,
    activeCardStatus: customer.cards[0]?.status ?? CardStatus.BLOCKED,
    availableBalanceKobo: Number(activeBalanceKobo),
    registeredBy: customer.registeredBy,
    registeredByTenantId: customer.registeredByTenantId,
    blockedAt: customer.blockedAt,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

function customerCursor(customer: CustomerReadRecord): string {
  return encodeCursor(customer.id, customer.createdAt);
}

function customerSearchWhere(
  tenantId: string,
  normalizedQuery?: string,
): Prisma.CustomerWhereInput {
  return {
    tenantId,
    ...(normalizedQuery
      ? {
          OR: [
            {
              fullName: { contains: normalizedQuery, mode: 'insensitive' },
            },
            { phoneE164: { contains: normalizedQuery } },
            { email: { contains: normalizedQuery, mode: 'insensitive' } },
            {
              cards: {
                some: { barcodeValue: { contains: normalizedQuery } },
              },
            },
          ],
        }
      : {}),
  };
}

function classifyCustomerSearchQuery(
  normalizedQuery?: string,
): 'none' | 'phone' | 'email' | 'card' | 'name' {
  const query = normalizedQuery?.trim();
  if (!query) {
    return 'none';
  }

  if (query.includes('@')) {
    return 'email';
  }

  if (/^\+?\d[\d\s-]+$/.test(query)) {
    return 'phone';
  }

  if (/\d/.test(query) && /[A-Za-z-]/.test(query)) {
    return 'card';
  }

  return 'name';
}

function maskPhone(phoneE164: string): string {
  const normalized = phoneE164.trim();
  if (normalized.length <= 6) {
    return '***';
  }

  return `${normalized.slice(0, Math.min(7, normalized.length - 4))}* *** ${normalized.slice(-4)}`;
}
