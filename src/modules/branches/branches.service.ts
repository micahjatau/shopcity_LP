import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  listBranches(tenantId: string) {
    return this.prismaService.branch.findMany({ where: { tenantId } });
  }

  async createBranch(
    tenantId: string,
    actor: AuthContext,
    data: { name: string; timezone?: string; receiptWeekStartDay?: number },
  ) {
    const branch = await this.prismaService.branch.create({
      data: {
        tenantId,
        name: data.name,
        timezone: data.timezone,
        receiptWeekStartDay: data.receiptWeekStartDay,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'branch.create',
      entityType: 'branch',
      entityId: branch.id,
      metadata: branch,
    });

    return branch;
  }

  async updateBranch(
    tenantId: string,
    actor: AuthContext,
    branchId: string,
    data: { name?: string; timezone?: string; receiptWeekStartDay?: number },
  ) {
    const branch = await this.prismaService.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const updated = await this.prismaService.branch.update({
      where: { id: branchId },
      data,
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'branch.update',
      entityType: 'branch',
      entityId: updated.id,
      metadata: data,
    });

    return updated;
  }

  listDevices(tenantId: string) {
    return this.prismaService.device.findMany({ where: { tenantId } });
  }

  async createDevice(
    tenantId: string,
    actor: AuthContext,
    data: { branchId: string; name: string; fingerprintHash: string },
  ) {
    const branch = await this.prismaService.branch.findFirst({
      where: { id: data.branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const device = await this.prismaService.device.create({
      data: {
        tenantId,
        branchId: data.branchId,
        name: data.name,
        fingerprintHash: data.fingerprintHash,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'device.create',
      entityType: 'device',
      entityId: device.id,
      metadata: device,
    });

    return device;
  }

  async updateDevice(
    tenantId: string,
    actor: AuthContext,
    deviceId: string,
    data: { name?: string; status?: string },
  ) {
    const device = await this.prismaService.device.findFirst({
      where: { id: deviceId, tenantId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updated = await this.prismaService.device.update({
      where: { id: deviceId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.status ? { status: data.status as DeviceStatus } : {}),
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'device.update',
      entityType: 'device',
      entityId: updated.id,
      metadata: data,
    });

    return updated;
  }
}
