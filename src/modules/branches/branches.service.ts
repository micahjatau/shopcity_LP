import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import {
  encryptDeviceAttestationSecret,
  generateDeviceAttestationSecret,
} from '../../common/auth/device-attestation-secret';

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
    return this.prismaService.$transaction(async (prisma) => {
      const branch = await prisma.branch.create({
        data: {
          tenantId,
          name: data.name,
          timezone: data.timezone,
          receiptWeekStartDay: data.receiptWeekStartDay,
        },
      });

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'branch.create',
        entityType: 'branch',
        entityId: branch.id,
        metadata: branch,
      });

      return branch;
    });
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

    return this.prismaService.$transaction(async (prisma) => {
      const updated = await prisma.branch.update({
        where: { id: branchId },
        data,
      });

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'branch.update',
        entityType: 'branch',
        entityId: updated.id,
        metadata: data,
      });

      return updated;
    });
  }

  listDevices(tenantId: string) {
    return this.prismaService.device.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        name: true,
        fingerprintHash: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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

    return this.prismaService.$transaction(async (prisma) => {
      const attestationSecret = generateDeviceAttestationSecret();
      const device = await prisma.device.create({
        data: {
          tenantId,
          branchId: data.branchId,
          name: data.name,
          fingerprintHash: data.fingerprintHash,
          attestationSecretCiphertext: encryptDeviceAttestationSecret(
            attestationSecret,
            this.attestationSecretKey(),
          ),
        },
      });

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'device.create',
        entityType: 'device',
        entityId: device.id,
        metadata: {
          id: device.id,
          tenantId: device.tenantId,
          branchId: device.branchId,
          name: device.name,
          fingerprintHash: device.fingerprintHash,
          status: device.status,
        },
      });

      const { attestationSecretCiphertext, ...safeDevice } = device;
      void attestationSecretCiphertext;
      return { ...safeDevice, attestationSecret };
    });
  }

  async updateDevice(
    tenantId: string,
    actor: AuthContext,
    deviceId: string,
    data: { name?: string; status?: string; rotateAttestationSecret?: boolean },
  ) {
    const device = await this.prismaService.device.findFirst({
      where: { id: deviceId, tenantId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prismaService.$transaction(async (prisma) => {
      let attestationSecret: string | null = null;
      const updated = await prisma.device.update({
        where: { id: deviceId },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.status ? { status: data.status as DeviceStatus } : {}),
        },
      });

      if (data.rotateAttestationSecret) {
        attestationSecret = generateDeviceAttestationSecret();
        await prisma.device.update({
          where: { id: deviceId },
          data: {
            attestationSecretCiphertext: encryptDeviceAttestationSecret(
              attestationSecret,
              this.attestationSecretKey(),
            ),
          },
        });
      }

      if (data.status && data.status !== DeviceStatus.ACTIVE) {
        const revoked = await prisma.session.updateMany({
          where: { deviceId, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt: new Date() },
        });

        if (revoked.count > 0) {
          await this.auditService.recordWithClient(prisma, {
            tenantId,
            actorId: actor.user.id,
            action: 'device.sessions.revoke',
            entityType: 'device',
            entityId: updated.id,
            metadata: {
              reason: 'device_status_ineligible',
              status: data.status,
              revokedSessionCount: revoked.count,
            },
          });
        }
      }

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'device.update',
        entityType: 'device',
        entityId: updated.id,
        metadata: data,
      });

      const { attestationSecretCiphertext, ...safeUpdated } = updated;
      void attestationSecretCiphertext;
      return attestationSecret
        ? { ...safeUpdated, attestationSecret }
        : safeUpdated;
    });
  }

  private attestationSecretKey(): string {
    return process.env.SESSION_SECRET ?? '';
  }
}
