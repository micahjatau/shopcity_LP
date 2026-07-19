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
    data: { fullName: string; phone: string; isStaff?: boolean },
  ) {
    const phoneE164 = normalizePhoneToE164(data.phone);
    if (!phoneE164.startsWith('+')) {
      throw new BadRequestException('Phone number is invalid');
    }

    const existing = await this.prismaService.customer.findFirst({
      where: { tenantId, phoneE164, status: CustomerStatus.ACTIVE },
    });
    if (existing) {
      throw new ConflictException(
        'Active customer already exists for this phone',
      );
    }

    const customer = await this.prismaService.customer.create({
      data: {
        tenantId,
        branchId:
          actor.user.branchId ??
          (
            await this.prismaService.branch.findFirstOrThrow({
              where: { tenantId },
            })
          ).id,
        fullName: data.fullName,
        phoneE164,
        isStaff: data.isStaff ?? false,
        registeredBy: actor.user.id,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'customer.create',
      entityType: 'customer',
      entityId: customer.id,
      metadata: customer,
    });

    return customer;
  }

  async updateCustomer(
    tenantId: string,
    actor: AuthContext,
    id: string,
    data: { fullName?: string; phone?: string; isStaff?: boolean },
  ) {
    const customer = await this.getCustomer(tenantId, id);
    const phoneE164 = data.phone
      ? normalizePhoneToE164(data.phone)
      : customer.phoneE164;

    if (data.phone) {
      const duplicate = await this.prismaService.customer.findFirst({
        where: {
          tenantId,
          phoneE164,
          status: CustomerStatus.ACTIVE,
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException(
          'Active customer already exists for this phone',
        );
      }
    }

    const updated = await this.prismaService.customer.update({
      where: { id },
      data: {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.phone ? { phoneE164 } : {}),
        ...(typeof data.isStaff === 'boolean' ? { isStaff: data.isStaff } : {}),
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'customer.update',
      entityType: 'customer',
      entityId: updated.id,
      metadata: data,
    });

    return updated;
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

    const updated = await this.prismaService.customer.update({
      where: { id },
      data: {
        status: status as CustomerStatus,
        blockedAt: status === 'BLOCKED' ? new Date() : null,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'customer.status',
      entityType: 'customer',
      entityId: updated.id,
      metadata: { status },
    });

    return updated;
  }
}
