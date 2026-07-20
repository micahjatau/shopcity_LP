import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import { normalizePhoneToE164 } from '../../common/phone';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  listCustomers(tenantId: string, query?: string) {
    return this.prismaService.customer.findMany({
      where: query
        ? {
            tenantId,
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { phoneE164: { contains: query } },
              { email: { contains: query, mode: 'insensitive' } },
              { cards: { some: { barcodeValue: { contains: query } } } },
            ],
          }
        : { tenantId },
    });
  }

  async getCustomer(tenantId: string, id: string) {
    const customer = await this.prismaService.customer.findFirst({
      where: { tenantId, id },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
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
    const customer = await this.getCustomer(tenantId, id);
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
