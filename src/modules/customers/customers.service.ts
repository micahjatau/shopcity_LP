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
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
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
  ) {}

  async listCustomers(tenantId: string, query?: string): Promise<Customer[]>;
  async listCustomers(
    tenantId: string,
    actor: AuthContext,
    query?: string,
    page?: CursorPageRequest,
  ): Promise<{
    items: Array<CustomerSalesSummary | CashierCustomerSummary>;
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
    const decodedCursor = page?.cursor ? decodeCursor(page.cursor) : undefined;
    const customers = await this.prismaService.customer.findMany({
      where: {
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
      },
      ...(actor ? { include: customerSalesSummaryInclude } : {}),
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

    if (!actor) {
      return customers;
    }

    if (isPrivilegedCustomerRead(actor)) {
      await this.auditService.record({
        tenantId,
        actorId: actor.user.id,
        action: 'customer.pii.list',
        entityType: 'customer',
        metadata: { query: normalizedQuery ?? null, count: customers.length },
      });

      const { pageItems, hasMore } = pageMeta(
        customers as CustomerSalesSummary[],
        page?.limit ?? customers.length,
      );

      return {
        items: pageItems,
        nextCursor: hasMore ? customerCursor(pageItems.at(-1)!) : null,
        hasMore,
      };
    }

    const { pageItems, hasMore } = pageMeta(
      customers as CustomerSalesSummary[],
      page?.limit ?? customers.length,
    );

    return {
      items: pageItems.map(toCashierCustomerSummary),
      nextCursor: hasMore ? customerCursor(pageItems.at(-1)!) : null,
      hasMore,
    };
  }

  async getCustomer(
    tenantId: string,
    id: string,
  ): Promise<CustomerSalesSummary>;
  async getCustomer(
    tenantId: string,
    id: string,
    actor: AuthContext,
  ): Promise<CustomerSalesSummary | CashierCustomerSummary>;
  async getCustomer(tenantId: string, id: string, actor?: AuthContext) {
    const customer = await this.prismaService.customer.findFirst({
      where: { tenantId, id },
      include: customerSalesSummaryInclude,
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (actor && isPrivilegedCustomerRead(actor)) {
      await this.auditService.record({
        tenantId,
        actorId: actor.user.id,
        action: 'customer.pii.read',
        entityType: 'customer',
        entityId: customer.id,
      });

      return customer;
    }

    if (actor?.user.role === UserRole.CASHIER) {
      return toCashierCustomerSummary(customer);
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
  ) {
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
  ) {
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
  ) {
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

      return updated;
    });
  }
}

const customerSalesSummaryInclude = {
  cards: {
    select: { status: true },
    orderBy: { issuedAt: 'desc' },
    take: 1,
  },
  creditLots: {
    select: { remainingAmountKobo: true },
  },
} satisfies Prisma.CustomerInclude;

type CustomerSalesSummary = Prisma.CustomerGetPayload<{
  include: typeof customerSalesSummaryInclude;
}>;

type CashierCustomerSummary = ReturnType<typeof toCashierCustomerSummary>;

function isPrivilegedCustomerRead(actor: AuthContext): boolean {
  return (
    actor.user.role === UserRole.SUPERVISOR ||
    actor.user.role === UserRole.ADMIN
  );
}

function toCashierCustomerSummary(customer: CustomerSalesSummary) {
  return {
    customerId: customer.id,
    fullName: customer.fullName,
    maskedPhone: maskPhone(customer.phoneE164),
    cardStatus: customer.cards[0]?.status ?? CardStatus.BLOCKED,
    availableBalanceKobo: customer.creditLots.reduce(
      (total, lot) => total + Number(lot.remainingAmountKobo),
      0,
    ),
  };
}

function customerCursor(customer: CustomerSalesSummary): string {
  return encodeCursor(customer.id, customer.createdAt);
}

function maskPhone(phoneE164: string): string {
  const normalized = phoneE164.trim();
  if (normalized.length <= 6) {
    return '***';
  }

  return `${normalized.slice(0, Math.min(7, normalized.length - 4))}* *** ${normalized.slice(-4)}`;
}
