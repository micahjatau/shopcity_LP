import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BranchStatus,
  Prisma,
  DeviceAuthBindingMode,
  DeviceEnrollmentPurpose,
  DeviceStatus,
  DeviceWebAuthnCredentialStatus,
  DeviceAttestationTrustResult,
  IdempotencyRecordStatus,
  TenantStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import {
  generateRegistrationOptions,
  MetadataService,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import {
  encryptDeviceAttestationSecret,
  generateDeviceAttestationSecret,
} from '../../common/auth/device-attestation-secret';
import { DomainHttpException } from '../../common/errors/domain.exception';
type DeviceManagementScope =
  | { tenantWide: true; branchId: null }
  | { tenantWide: false; branchId: string };

type DeviceProvisioningResponse = {
  id: string;
  [key: string]: unknown;
};

@Injectable()
export class BranchesService {
  private metadataInitialization: Promise<void> | null = null;

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
        authBindingMode: true,
        pairedAt: true,
        branch: { select: { name: true } },
        webAuthnCredentials: {
          select: {
            id: true,
            status: true,
            pairedAt: true,
            revokedAt: true,
            aaguid: true,
            authenticatorAttachment: true,
            transports: true,
            backupEligible: true,
          },
        },
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createDevice(
    tenantId: string,
    actor: AuthContext,
    data: { branchId: string; name: string; fingerprintHash?: string },
    idempotencyKey: string | undefined,
  ): Promise<DeviceProvisioningResponse> {
    const normalizedKey = normalizeDeviceIdempotencyKey(idempotencyKey);
    const endpoint = 'devices.create';
    const requestHash = hashDeviceRequest({
      tenantId,
      actorId: actor.user.id,
      branchId: data.branchId,
      name: data.name,
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

      const device = await prisma.device.create({
        data: {
          tenantId,
          branchId: data.branchId,
          name: data.name,
          fingerprintHash: null,
          authBindingMode: DeviceAuthBindingMode.UNPAIRED,
          attestationSecretCiphertext: null,
          attestationSecretVersion: 0,
          attestationSecretRotatedAt: null,
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
      const response = safeDevice;
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

  async createDeviceEnrollment(
    tenantId: string,
    actor: AuthContext,
    deviceId: string,
  ) {
    this.assertWebAuthnEnabled();
    const scope = resolveDeviceManagementScope(actor);
    const device = await this.prismaService.device.findFirst({
      where: scope.tenantWide
        ? { id: deviceId, tenantId }
        : { id: deviceId, tenantId, branchId: scope.branchId },
      include: {
        branch: { include: { tenant: true } },
        webAuthnCredentials: {
          where: { status: DeviceWebAuthnCredentialStatus.ACTIVE },
        },
      },
    });
    if (
      !device ||
      device.status !== DeviceStatus.ACTIVE ||
      device.branch.status !== BranchStatus.ACTIVE ||
      device.branch.tenant.status !== TenantStatus.ACTIVE
    ) {
      throw deviceNotAvailable();
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const options = await generateRegistrationOptions({
      rpName: 'ShopCity POS',
      rpID: this.requiredWebAuthnConfig().rpId,
      userID: Buffer.from(device.id),
      userName: `device-${device.id}`,
      userDisplayName: device.name,
      timeout: 5 * 60 * 1000,
      attestationType: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      excludeCredentials: device.webAuthnCredentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports,
      })),
    });
    const challenge = options.challenge;
    const purpose =
      device.authBindingMode === DeviceAuthBindingMode.WEBAUTHN
        ? DeviceEnrollmentPurpose.REPAIR
        : DeviceEnrollmentPurpose.PAIRING;
    await this.prismaService.$transaction(async (prisma) => {
      await prisma.deviceEnrollmentChallenge.create({
        data: {
          tenantId,
          branchId: device.branchId,
          deviceId: device.id,
          actorUserId: actor.user.id,
          authorizationTokenHash: hashSecret(token),
          challengeHash: hashSecret(challenge),
          purpose,
          expiresAt,
        },
      });
      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'device.enrollment.authorize',
        entityType: 'device',
        entityId: device.id,
        metadata: { purpose, expiresAt },
      });
    });
    return { authorizationToken: token, expiresAt, options };
  }

  async completeDeviceEnrollment(
    deviceId: string,
    authorizationToken: unknown,
    response: unknown,
  ) {
    try {
      this.assertWebAuthnEnabled();
      if (
        typeof authorizationToken !== 'string' ||
        authorizationToken.length < 40
      ) {
        throw deviceEnrollmentInvalid();
      }
      const challenge =
        await this.prismaService.deviceEnrollmentChallenge.findFirst({
          where: {
            deviceId,
            authorizationTokenHash: hashSecret(authorizationToken),
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
          include: { device: true },
        });
      if (!challenge) throw deviceEnrollmentInvalid();
      const registrationResponse = response as Parameters<
        typeof verifyRegistrationResponse
      >[0]['response'];
      const verified = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: (candidate) =>
          hashSecret(candidate) === challenge.challengeHash,
        expectedOrigin: this.requiredWebAuthnConfig().origins,
        expectedRPID: this.requiredWebAuthnConfig().rpId,
        requireUserVerification: true,
      });
      if (!verified.verified) throw deviceEnrollmentInvalid();
      const info = verified.registrationInfo;
      if (
        !info ||
        registrationResponse.authenticatorAttachment !== 'platform' ||
        info.fmt === 'none' ||
        !info.userVerified ||
        info.credentialDeviceType !== 'singleDevice' ||
        info.credentialBackedUp
      )
        throw deviceEnrollmentInvalid();

      await this.initializeMetadataService();
      const statement = await MetadataService.getStatement(info.aaguid);
      const protections = statement?.keyProtection ?? [];
      const protectionApproved = protections.some((protection) =>
        ['hardware', 'tee', 'secure_element'].includes(protection),
      );
      if (!statement || !protectionApproved) throw deviceEnrollmentInvalid();

      const now = new Date();
      await this.prismaService.$transaction(async (prisma) => {
        const consumed = await prisma.deviceEnrollmentChallenge.updateMany({
          where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now } },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) throw deviceEnrollmentInvalid();
        const [device, actor] = await Promise.all([
          prisma.device.findFirst({
            where: {
              id: deviceId,
              tenantId: challenge.tenantId,
              branchId: challenge.branchId,
            },
            include: { branch: { include: { tenant: true } } },
          }),
          prisma.user.findFirst({
            where: {
              id: challenge.actorUserId,
              tenantId: challenge.tenantId,
              status: UserStatus.ACTIVE,
            },
          }),
        ]);
        if (
          !device ||
          device.status !== DeviceStatus.ACTIVE ||
          device.branch.status !== BranchStatus.ACTIVE ||
          device.branch.tenant.status !== TenantStatus.ACTIVE ||
          !actor ||
          !actorMayManageDevice(actor, device.branchId) ||
          (challenge.purpose === DeviceEnrollmentPurpose.PAIRING &&
            device.authBindingMode === DeviceAuthBindingMode.WEBAUTHN) ||
          (challenge.purpose === DeviceEnrollmentPurpose.REPAIR &&
            device.authBindingMode !== DeviceAuthBindingMode.WEBAUTHN)
        ) {
          throw deviceEnrollmentInvalid();
        }
        const pairedAtBeforeTransition = device.pairedAt;
        const transitioned = await prisma.device.updateMany({
          where: {
            id: device.id,
            tenantId: device.tenantId,
            branchId: device.branchId,
            status: DeviceStatus.ACTIVE,
            authBindingMode: device.authBindingMode,
            pairedAt: pairedAtBeforeTransition,
          },
          data: {
            authBindingMode: DeviceAuthBindingMode.WEBAUTHN,
            pairedAt: now,
            attestationSecretCiphertext: null,
            attestationSecretVersion: 0,
            attestationSecretRotatedAt: null,
          },
        });
        if (transitioned.count !== 1) throw deviceEnrollmentInvalid();

        const credential = await prisma.deviceWebAuthnCredential.create({
          data: {
            tenantId: device.tenantId,
            deviceId: device.id,
            credentialId: info.credential.id,
            publicKey: Buffer.from(info.credential.publicKey),
            aaguid: info.aaguid,
            signCount: info.credential.counter,
            authenticatorAttachment:
              registrationResponse.authenticatorAttachment,
            transports: registrationResponse.response.transports ?? [],
            backupEligible: false,
            backedUp: false,
            attestationFormat: info.fmt,
            attestationTrustResult: DeviceAttestationTrustResult.TRUSTED,
            rpId: this.requiredWebAuthnConfig().rpId,
            status: DeviceWebAuthnCredentialStatus.ACTIVE,
            pairedAt: now,
          },
        });
        await prisma.deviceWebAuthnCredential.updateMany({
          where: {
            deviceId: device.id,
            status: DeviceWebAuthnCredentialStatus.ACTIVE,
            id: { not: credential.id },
          },
          data: { status: DeviceWebAuthnCredentialStatus.SUPERSEDED },
        });
        const revoked = await prisma.session.updateMany({
          where: { deviceId: device.id, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt: now },
        });
        if (revoked.count > 0) {
          await this.auditService.recordWithClient(prisma, {
            tenantId: device.tenantId,
            actorId: actor.id,
            action: 'device.sessions.revoke',
            entityType: 'device',
            entityId: device.id,
            metadata: {
              reason: 'device_webauthn_credential_replaced',
              revokedSessionCount: revoked.count,
            },
          });
        }
        await this.auditService.recordWithClient(prisma, {
          tenantId: device.tenantId,
          actorId: actor.id,
          action: 'device.credential.activate',
          entityType: 'device',
          entityId: device.id,
          metadata: {
            credentialId: credential.id,
            replaced: true,
            revokedSessionCount: revoked.count,
          },
        });
      });
      return { status: 'ACTIVE' };
    } catch {
      throw deviceEnrollmentInvalid();
    }
  }

  async listDeviceCredentials(
    tenantId: string,
    actor: AuthContext,
    deviceId: string,
  ) {
    const scope = resolveDeviceManagementScope(actor);
    const device = await this.prismaService.device.findFirst({
      where: scope.tenantWide
        ? { id: deviceId, tenantId }
        : { id: deviceId, tenantId, branchId: scope.branchId },
    });
    if (!device) throw deviceNotAvailable();
    return this.prismaService.deviceWebAuthnCredential.findMany({
      where: { tenantId, deviceId },
      select: {
        id: true,
        aaguid: true,
        authenticatorAttachment: true,
        transports: true,
        backupEligible: true,
        backedUp: true,
        attestationFormat: true,
        attestationTrustResult: true,
        rpId: true,
        status: true,
        pairedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeDeviceCredential(
    tenantId: string,
    actor: AuthContext,
    deviceId: string,
    credentialId: string,
  ) {
    const scope = resolveDeviceManagementScope(actor);
    const device = await this.prismaService.device.findFirst({
      where: scope.tenantWide
        ? { id: deviceId, tenantId }
        : { id: deviceId, tenantId, branchId: scope.branchId },
    });
    if (!device) throw deviceNotAvailable();
    return this.prismaService.$transaction(async (prisma) => {
      await prisma.$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "Device"
        WHERE "id" = ${deviceId} AND "tenantId" = ${tenantId}
        FOR UPDATE
      `);
      const currentDevice = await prisma.device.findFirst({
        where: scope.tenantWide
          ? { id: deviceId, tenantId }
          : { id: deviceId, tenantId, branchId: scope.branchId },
        select: { id: true },
      });
      if (!currentDevice) throw deviceNotAvailable();
      await prisma.$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "DeviceWebAuthnCredential"
        WHERE "id" = ${credentialId} AND "deviceId" = ${deviceId}
          AND "tenantId" = ${tenantId}
        FOR UPDATE
      `);
      const currentCredential = await prisma.deviceWebAuthnCredential.findFirst(
        {
          where: {
            id: credentialId,
            deviceId,
            tenantId,
            status: DeviceWebAuthnCredentialStatus.ACTIVE,
          },
        },
      );
      if (!currentCredential) throw deviceNotAvailable();
      const now = new Date();
      const credentialRevoked =
        await prisma.deviceWebAuthnCredential.updateMany({
          where: {
            id: credentialId,
            deviceId,
            tenantId,
            status: DeviceWebAuthnCredentialStatus.ACTIVE,
          },
          data: {
            status: DeviceWebAuthnCredentialStatus.REVOKED,
            revokedAt: now,
          },
        });
      if (credentialRevoked.count !== 1) throw deviceNotAvailable();
      const revoked = await prisma.session.updateMany({
        where: {
          deviceId,
          deviceCredentialId: credentialId,
          status: 'ACTIVE',
        },
        data: { status: 'REVOKED', revokedAt: now },
      });
      if (revoked.count > 0) {
        await this.auditService.recordWithClient(prisma, {
          tenantId,
          actorId: actor.user.id,
          action: 'device.sessions.revoke',
          entityType: 'device',
          entityId: deviceId,
          metadata: {
            reason: 'device_credential_revoked',
            credentialId,
            revokedSessionCount: revoked.count,
          },
        });
      }
      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: 'device.credential.revoke',
        entityType: 'device',
        entityId: deviceId,
        metadata: { credentialId, revokedSessionCount: revoked.count },
      });
      return { status: DeviceWebAuthnCredentialStatus.REVOKED };
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
      data.rotateAttestationSecret &&
      device.authBindingMode !== DeviceAuthBindingMode.HMAC_LEGACY
    ) {
      throw new BadRequestException(
        'Legacy attestation rotation is only available for HMAC devices',
      );
    }

    if (
      data.status === DeviceStatus.ACTIVE &&
      !data.rotateAttestationSecret &&
      device.authBindingMode === DeviceAuthBindingMode.HMAC_LEGACY &&
      !hasActiveAttestationSecret(device)
    ) {
      throw new DomainHttpException(
        400,
        'VALIDATION_ERROR',
        'Device attestation secret metadata is required before activation',
      );
    }

    const response = await this.prismaService.$transaction(async (prisma) => {
      await prisma.$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "Device"
        WHERE "id" = ${deviceId} AND "tenantId" = ${tenantId}
        FOR UPDATE
      `);
      const currentDevice = await prisma.device.findFirst({
        where: scope.tenantWide
          ? { id: deviceId, tenantId }
          : { id: deviceId, tenantId, branchId: scope.branchId },
      });
      if (!currentDevice) throw new NotFoundException('Device not found');
      if (
        (data.rotateAttestationSecret || data.status !== undefined) &&
        (currentDevice.status !== device.status ||
          currentDevice.authBindingMode !== device.authBindingMode ||
          currentDevice.pairedAt?.getTime() !== device.pairedAt?.getTime())
      ) {
        throw deviceNotAvailable();
      }
      if (
        data.rotateAttestationSecret &&
        currentDevice.authBindingMode !== DeviceAuthBindingMode.HMAC_LEGACY
      ) {
        throw new BadRequestException(
          'Legacy attestation rotation is only available for HMAC devices',
        );
      }
      if (
        data.status === DeviceStatus.ACTIVE &&
        !data.rotateAttestationSecret &&
        currentDevice.authBindingMode === DeviceAuthBindingMode.HMAC_LEGACY &&
        !hasActiveAttestationSecret(currentDevice)
      ) {
        throw new DomainHttpException(
          400,
          'VALIDATION_ERROR',
          'Device attestation secret metadata is required before activation',
        );
      }

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

      if (
        data.status === DeviceStatus.ACTIVE &&
        !data.rotateAttestationSecret &&
        currentDevice.authBindingMode === DeviceAuthBindingMode.WEBAUTHN
      ) {
        const activeCredential =
          await prisma.deviceWebAuthnCredential.updateMany({
            where: {
              tenantId,
              deviceId,
              status: DeviceWebAuthnCredentialStatus.ACTIVE,
            },
            data: { status: DeviceWebAuthnCredentialStatus.ACTIVE },
          });
        if (activeCredential.count < 1) {
          throw new DomainHttpException(
            400,
            'VALIDATION_ERROR',
            'An active WebAuthn credential is required before activation',
          );
        }
      }

      let attestationSecret: string | null = null;
      let attestationSecretVersion: number | undefined;
      const updateData = {
        ...(data.name ? { name: data.name } : {}),
        ...(data.status ? { status: data.status as DeviceStatus } : {}),
      };

      if (data.rotateAttestationSecret) {
        attestationSecret = generateDeviceAttestationSecret();
        attestationSecretVersion =
          (currentDevice.attestationSecretVersion ?? 0) + 1;
        Object.assign(updateData, {
          attestationSecretCiphertext: encryptDeviceAttestationSecret(
            attestationSecret,
            this.attestationSecretKey(),
          ),
          attestationSecretVersion,
          attestationSecretRotatedAt: new Date(),
        });
      }

      let updated: Awaited<ReturnType<typeof prisma.device.update>>;
      if (data.rotateAttestationSecret || data.status === DeviceStatus.ACTIVE) {
        const stateTransition = await prisma.device.updateMany({
          where: {
            id: deviceId,
            tenantId,
            status: currentDevice.status,
            authBindingMode: currentDevice.authBindingMode,
            pairedAt: currentDevice.pairedAt,
          },
          data: updateData,
        });
        if (stateTransition.count !== 1) throw deviceNotAvailable();
        const updatedDevice = await prisma.device.findFirst({
          where: { id: deviceId, tenantId, branchId: device.branchId },
        });
        if (!updatedDevice) throw deviceNotAvailable();
        updated = updatedDevice;
      } else {
        updated = await prisma.device.update({
          where: { id: deviceId },
          data: updateData,
        });
      }

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
      // HMAC credentials are one-time response data, never replayable from the
      // persistent idempotency record.
      const idempotencyResponse = JSON.parse(
        JSON.stringify(response, (key, value: unknown) =>
          key === 'attestationSecret' ? undefined : value,
        ) ?? '{}',
      ) as Prisma.InputJsonValue;
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
          responseJson: idempotencyResponse,
        },
      });
    }

    return response;
  }

  private initializeMetadataService(): Promise<void> {
    this.metadataInitialization ??= MetadataService.initialize({
      verificationMode: 'strict',
    });
    return this.metadataInitialization;
  }

  private assertWebAuthnEnabled() {
    const qualificationApproved =
      this.configService.get<boolean>(
        'WEBAUTHN_DEVICE_QUALIFICATION_APPROVED',
      ) === true;
    const localDevelopmentEnabled =
      this.configService.get<string>('NODE_ENV') === 'development' &&
      this.configService.get<boolean>('WEBAUTHN_DEV_ENROLLMENT_ENABLED') ===
        true;
    if (!qualificationApproved && !localDevelopmentEnabled) {
      throw deviceEnrollmentInvalid();
    }
    this.requiredWebAuthnConfig();
  }

  private requiredWebAuthnConfig() {
    const rpId = this.configService
      .get<string>('WEBAUTHN_RP_ID')
      ?.trim()
      .toLowerCase();
    const rawOrigins = this.configService.get<string>(
      'WEBAUTHN_ALLOWED_ORIGINS',
    );
    const origins = rawOrigins
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (
      !rpId ||
      !origins?.length ||
      origins.some((origin) => !isAllowedWebAuthnOrigin(origin, rpId))
    ) {
      throw deviceEnrollmentInvalid();
    }
    return { rpId, origins };
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

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function deviceEnrollmentInvalid() {
  return new DomainHttpException(
    400,
    'DEVICE_ENROLLMENT_INVALID',
    'Device enrollment could not be completed',
  );
}

function deviceNotAvailable() {
  return new DomainHttpException(
    404,
    'DEVICE_NOT_AVAILABLE',
    'Device not available',
  );
}

function isAllowedWebAuthnOrigin(origin: string, rpId: string): boolean {
  try {
    const parsed = new URL(origin);
    const local =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const rpHostMatch =
      parsed.hostname === rpId || parsed.hostname.endsWith(`.${rpId}`);
    return (
      parsed.origin === origin &&
      (parsed.protocol === 'https:' ||
        (local && parsed.protocol === 'http:' && rpId === parsed.hostname)) &&
      rpHostMatch &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

function actorMayManageDevice(
  actor: { role: UserRole; branchId: string | null; status: UserStatus },
  deviceBranchId: string,
): boolean {
  return (
    actor.status === UserStatus.ACTIVE &&
    (actor.role === UserRole.ADMIN ||
      (actor.role === UserRole.SUPERVISOR && actor.branchId === deviceBranchId))
  );
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
