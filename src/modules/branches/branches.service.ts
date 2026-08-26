import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeviceStatus,
  IdempotencyRecordStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import {
  encryptDeviceAttestationSecret,
  generateDeviceAttestationSecret,
} from '../../common/auth/device-attestation-secret';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { createHash } from 'node:crypto';

type DeviceManagementScope =
  | { tenantWide: true; branchId: null }
  | { tenantWide: false; branchId: string };

type DeviceProvisioningResponse = {
  id: string;
  attestationSecret: string;
  [key: string]: unknown;
};

@Injectable()
export class BranchesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
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

  listDevices(tenantId: string, actor: AuthContext) {
    const scope = resolveDeviceManagementScope(actor);

    return this.prismaService.device.findMany({
      where: scope.tenantWide
        ? { tenantId }
        : { tenantId, branchId: scope.branchId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        name: true,
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
    idempotencyKey: string | undefined,
  ): Promise<DeviceProvisioningResponse> {
    const normalizedKey = normalizeDeviceIdempotencyKey(idempotencyKey);
    const endpoint = 'devices.create';
    const requestHash = hashDeviceRequest({
      tenantId,
      actorId: actor.user.id,
      branchId: data.branchId,
      name: data.name,
      fingerprintHash: data.fingerprintHash,
    });
    const existing = await findDeviceIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      normalizedKey,
      requestHash,
    );
    if (existing?.responseJson) {
      return existing.responseJson as unknown as DeviceProvisioningResponse;
    }
    if (existing) {
      throw new ConflictException('Idempotency key is still being processed');
    }
    const scope = resolveDeviceManagementScope(actor);
    if (!scope.tenantWide && scope.branchId !== data.branchId) {
      throw new NotFoundException('Branch not found');
    }

    const branch = await this.prismaService.branch.findFirst({
      where: { id: data.branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return this.prismaService.$transaction(async (prisma) => {
      if (prisma.idempotencyRecord?.create) {
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
      }

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
          attestationSecretVersion: 1,
          attestationSecretRotatedAt: new Date(),
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
          status: device.status,
        },
      });

      const { attestationSecretCiphertext, fingerprintHash, ...safeDevice } =
        device;
      void attestationSecretCiphertext;
      void fingerprintHash;
      const response = { ...safeDevice, attestationSecret };
      if (prisma.idempotencyRecord?.update) {
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
            responseJson: response,
          },
        });
      }
      return response;
    });
  }

  async updateDevice(
    tenantId: string,
    actor: AuthContext,
    deviceId: string,
    data: { name?: string; status?: string; rotateAttestationSecret?: boolean },
    idempotencyKey: string | undefined,
  ) {
    const normalizedKey = normalizeDeviceIdempotencyKey(idempotencyKey);
    const endpoint = 'devices.update';
    const requestHash = hashDeviceRequest({
      tenantId,
      actorId: actor.user.id,
      deviceId,
      ...data,
    });
    const existing = await findDeviceIdempotency(
      this.prismaService,
      tenantId,
      actor.user.id,
      endpoint,
      normalizedKey,
      requestHash,
    );
    if (existing?.responseJson) {
      return existing.responseJson as unknown as DeviceProvisioningResponse;
    }
    if (existing) {
      throw new ConflictException('Idempotency key is still being processed');
    }
    const scope = resolveDeviceManagementScope(actor);
    const device = await this.prismaService.device.findFirst({
      where: scope.tenantWide
        ? { id: deviceId, tenantId }
        : { id: deviceId, tenantId, branchId: scope.branchId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (
      data.status === DeviceStatus.ACTIVE &&
      !data.rotateAttestationSecret &&
      !hasActiveAttestationSecret(device)
    ) {
      throw new DomainHttpException(
        400,
        'VALIDATION_ERROR',
        'Device attestation secret metadata is required before activation',
      );
    }

    const response = await this.prismaService.$transaction(async (prisma) => {
      if (prisma.idempotencyRecord?.create) {
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
      }

      let attestationSecret: string | null = null;
      let attestationSecretVersion: number | undefined;
      const updateData = {
        ...(data.name ? { name: data.name } : {}),
        ...(data.status ? { status: data.status as DeviceStatus } : {}),
      };

      if (data.rotateAttestationSecret) {
        attestationSecret = generateDeviceAttestationSecret();
        attestationSecretVersion = (device.attestationSecretVersion ?? 0) + 1;
        Object.assign(updateData, {
          attestationSecretCiphertext: encryptDeviceAttestationSecret(
            attestationSecret,
            this.attestationSecretKey(),
          ),
          attestationSecretVersion,
          attestationSecretRotatedAt: new Date(),
        });
      }

      const updated = await prisma.device.update({
        where: { id: deviceId },
        data: updateData,
      });

      const shouldRevokeSessions =
        data.rotateAttestationSecret ||
        (data.status ? data.status !== DeviceStatus.ACTIVE : false);
      const revokeReason = data.rotateAttestationSecret
        ? 'device_attestation_rotated'
        : 'device_status_ineligible';

      if (shouldRevokeSessions) {
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
              reason: revokeReason,
              revokedSessionCount: revoked.count,
              ...(data.status ? { status: data.status } : {}),
            },
          });
        }

        if (data.rotateAttestationSecret && attestationSecretVersion) {
          await this.auditService.recordWithClient(prisma, {
            tenantId,
            actorId: actor.user.id,
            action: 'device.attestation-secret.rotate',
            entityType: 'device',
            entityId: updated.id,
            metadata: {
              attestationSecretVersion,
              rotatedAt: updated.attestationSecretRotatedAt,
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

      const { attestationSecretCiphertext, fingerprintHash, ...safeUpdated } =
        updated;
      void attestationSecretCiphertext;
      void fingerprintHash;
      return attestationSecret
        ? { ...safeUpdated, attestationSecret }
        : safeUpdated;
    });

    if (this.prismaService.idempotencyRecord?.update) {
      await this.prismaService.idempotencyRecord.update({
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
          responseJson: response,
        },
      });
    }

    return response;
  }

  private attestationSecretKey(): string {
    return this.configService.get<string>('DEVICE_ATTESTATION_KEK') ?? '';
  }
}

const DEVICE_IDEMPOTENCY_KEY_MAX_LENGTH = 255;

function normalizeDeviceIdempotencyKey(value: string | undefined): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    throw new BadRequestException('Idempotency-Key header is required');
  }
  if (normalized.length > DEVICE_IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new BadRequestException('Idempotency-Key header is too long');
  }
  return normalized;
}

function hashDeviceRequest(value: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function findDeviceIdempotency(
  prisma: PrismaService,
  tenantId: string,
  actorId: string,
  endpoint: string,
  idempotencyKey: string,
  requestHash: string,
) {
  if (!prisma.idempotencyRecord?.deleteMany) return null;

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

function resolveDeviceManagementScope(
  actor: AuthContext,
): DeviceManagementScope {
  if (actor.user.role === UserRole.ADMIN) {
    return { tenantWide: true, branchId: null };
  }

  if (actor.user.role !== UserRole.SUPERVISOR || !actor.user.branchId) {
    throw new ForbiddenException('Device administration is branch-scoped');
  }

  return { tenantWide: false, branchId: actor.user.branchId };
}

function hasActiveAttestationSecret(device: {
  attestationSecretCiphertext?: string | null;
  attestationSecretVersion?: number | null;
  attestationSecretRotatedAt?: Date | null;
}) {
  return Boolean(
    device.attestationSecretCiphertext &&
    (device.attestationSecretVersion ?? 0) > 0 &&
    device.attestationSecretRotatedAt,
  );
}
