import {
  BadRequestException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CashierLoginAttemptPurpose,
  DeviceAuthBindingMode,
  DeviceAttestationTrustResult,
  DeviceStatus,
  DeviceWebAuthnCredentialStatus,
  Prisma,
  SessionPurpose,
  UserRole,
} from '@prisma/client';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import {
  randomBytes,
  randomUUID,
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { AuthContext } from '../../common/auth/session.types';
import {
  hashToken,
  isAuthUserEligible,
  isSessionDeviceEligible,
} from '../../common/auth/session.guard';
import { decryptDeviceAttestationSecret } from '../../common/auth/device-attestation-secret';

const MAX_DEVICE_ATTESTATION_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_SESSION_LIFETIME_MS = 1000 * 60 * 60 * 12;
const SMOKE_SESSION_LIFETIME_MS = 15 * 60 * 1000;
const deviceCredentialSessionSelect = {
  id: true,
  tenantId: true,
  deviceId: true,
  status: true,
  authenticatorAttachment: true,
  backupEligible: true,
  backedUp: true,
  attestationTrustResult: true,
  rpId: true,
} satisfies Prisma.DeviceWebAuthnCredentialSelect;

interface IssuedSession {
  context: AuthContext;
  sessionToken: string;
  csrfToken: string;
}

interface CashierAssertionRequired {
  statusCode: 202;
  code: 'DEVICE_ASSERTION_REQUIRED';
  attemptToken: string;
  options: Awaited<ReturnType<typeof generateAuthenticationOptions>>;
}
type LoginResult = IssuedSession | CashierAssertionRequired;

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(
    username: string,
    password: string,
    deviceId?: string,
    deviceAttestation?: string,
  ): Promise<LoginResult> {
    const normalizedUsername = normalizeUsername(username);
    const candidate = await this.prismaService.user.findFirst({
      where: {
        username: {
          equals: normalizedUsername,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        tenantId: true,
        username: true,
      },
    });

    const { data, error } =
      await this.supabaseService.publicClient.auth.signInWithPassword({
        email: username,
        password,
      });

    if (error || !data.user) {
      if (candidate) {
        await this.recordFailedLoginEvidence(candidate, normalizedUsername);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        supabaseAuthId: data.user.id,
      },
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (!user || !isAuthUserEligible(user)) {
      throw new UnauthorizedException('User is not active');
    }

    const usesDeviceProof = Boolean(
      deviceId && (user.role === UserRole.CASHIER || deviceAttestation),
    );
    const sessionDevice = usesDeviceProof
      ? await this.prismaService.device.findFirst({
          where: { id: deviceId, tenantId: user.tenantId },
          include: {
            branch: true,
            webAuthnCredentials: {
              where: { status: DeviceWebAuthnCredentialStatus.ACTIVE },
            },
          },
        })
      : null;

    if (
      usesDeviceProof &&
      (!sessionDevice ||
        sessionDevice.status !== 'ACTIVE' ||
        sessionDevice.branch.status !== 'ACTIVE' ||
        (user.branchId && user.branchId !== sessionDevice.branchId))
    ) {
      if (user.role === UserRole.CASHIER) throw deviceAuthFailed();
      throw new BadRequestException('Device is not active');
    }

    if (user.role === UserRole.CASHIER) {
      if (!sessionDevice || user.branchId !== sessionDevice.branchId) {
        throw deviceAuthFailed();
      }
      if (sessionDevice.authBindingMode === DeviceAuthBindingMode.UNPAIRED) {
        throw deviceAuthFailed();
      }
      if (sessionDevice.authBindingMode === DeviceAuthBindingMode.WEBAUTHN) {
        return this.beginCashierWebAuthnLogin(user, sessionDevice);
      }
      if (sessionDevice.authBindingMode !== DeviceAuthBindingMode.HMAC_LEGACY) {
        throw deviceAuthFailed();
      }
    }

    if (sessionDevice && !deviceAttestation) {
      if (user.role === UserRole.CASHIER) throw deviceAuthFailed();
      throw new BadRequestException('Device attestation is required');
    }

    let attestation: { timestamp: number; nonce: string } | null = null;
    if (sessionDevice) {
      const deviceSecret = resolveDeviceAttestationSecret(
        sessionDevice,
        this.configService.get<string>('DEVICE_ATTESTATION_KEK') ?? '',
      );
      try {
        attestation = assertDeviceAttestationValid(
          sessionDevice.id,
          deviceAttestation!,
          deviceSecret,
        );
      } catch (error) {
        if (user.role === UserRole.CASHIER) throw deviceAuthFailed();
        throw error;
      }
    }

    return this.prismaService.$transaction(async (prisma) => {
      let attestationId: string | null = null;
      if (sessionDevice && attestation) {
        attestationId = await recordDeviceAttestation(prisma, {
          tenantId: user.tenantId,
          deviceId: sessionDevice.id,
          nonce: attestation.nonce,
          attestationTimestamp: new Date(attestation.timestamp),
          expiresAt: new Date(
            attestation.timestamp + MAX_DEVICE_ATTESTATION_SKEW_MS,
          ),
        });
      }

      const issued = await this.issueSession(
        prisma,
        user.id,
        user.tenantId,
        'auth.login',
        sessionDevice?.id ?? null,
      );

      if (attestationId) {
        await prisma.deviceAttestation.update({
          where: { id: attestationId },
          data: { issuedSessionId: issued.context.session.id },
        });
      }

      return issued;
    });
  }

  async completeCashierLogin(
    attemptToken: unknown,
    assertion: unknown,
  ): Promise<IssuedSession> {
    if (
      typeof attemptToken !== 'string' ||
      !isCashierAttemptToken(attemptToken) ||
      !assertion ||
      typeof assertion !== 'object' ||
      Array.isArray(assertion)
    ) {
      throw deviceAuthFailed();
    }
    const assertionResponse = assertion as Record<string, unknown>;
    const bearerTokenHash = hashSecret(attemptToken);
    const config = this.requiredWebAuthnLoginConfig();

    try {
      return await this.prismaService.$transaction(async (prisma) => {
        const attempt = await prisma.cashierLoginAttempt.findUnique({
          where: { bearerTokenHash },
          include: {
            user: { include: { tenant: true, branch: true } },
            device: {
              include: {
                branch: true,
                webAuthnCredentials: {
                  where: { status: DeviceWebAuthnCredentialStatus.ACTIVE },
                },
              },
            },
          },
        });
        const now = new Date();
        if (
          !attempt ||
          attempt.consumedAt ||
          attempt.expiresAt <= now ||
          attempt.purpose !== CashierLoginAttemptPurpose.CASHIER_LOGIN ||
          attempt.user.id !== attempt.userId ||
          attempt.user.role !== UserRole.CASHIER ||
          !isAuthUserEligible(attempt.user) ||
          attempt.user.tenantId !== attempt.tenantId ||
          attempt.user.branchId !== attempt.branchId ||
          attempt.device.id !== attempt.deviceId ||
          attempt.device.tenantId !== attempt.tenantId ||
          attempt.device.branchId !== attempt.branchId ||
          attempt.device.webAuthnCredentials.length === 0
        ) {
          throw deviceAuthFailed();
        }

        await prisma.$queryRaw(Prisma.sql`
          SELECT "id"
          FROM "Device"
          WHERE "id" = ${attempt.deviceId}
            AND "tenantId" = ${attempt.tenantId}
          FOR UPDATE
        `);
        const lockedDevice = await prisma.device.findFirst({
          where: {
            id: attempt.deviceId,
            tenantId: attempt.tenantId,
          },
          include: { branch: true },
        });
        if (
          !lockedDevice ||
          lockedDevice.id !== attempt.deviceId ||
          lockedDevice.tenantId !== attempt.tenantId ||
          lockedDevice.branchId !== attempt.branchId ||
          lockedDevice.branch.id !== attempt.branchId ||
          lockedDevice.status !== DeviceStatus.ACTIVE ||
          lockedDevice.branch.status !== 'ACTIVE' ||
          lockedDevice.branch.tenantId !== attempt.tenantId ||
          lockedDevice.authBindingMode !== DeviceAuthBindingMode.WEBAUTHN
        ) {
          throw deviceAuthFailed();
        }

        const credentialId =
          typeof assertionResponse.id === 'string'
            ? assertionResponse.id
            : undefined;
        const credential = attempt.device.webAuthnCredentials.find(
          (candidate) => candidate.credentialId === credentialId,
        );
        if (!credential) throw deviceAuthFailed();

        await prisma.$queryRaw(Prisma.sql`
          SELECT "id"
          FROM "DeviceWebAuthnCredential"
          WHERE "id" = ${credential.id}
            AND "deviceId" = ${attempt.deviceId}
          FOR UPDATE
        `);
        const lockedCredential =
          await prisma.deviceWebAuthnCredential.findFirst({
            where: {
              id: credential.id,
              deviceId: attempt.deviceId,
              status: DeviceWebAuthnCredentialStatus.ACTIVE,
            },
          });
        if (
          !lockedCredential ||
          lockedCredential.tenantId !== attempt.tenantId ||
          lockedCredential.attestationTrustResult !==
            DeviceAttestationTrustResult.TRUSTED ||
          lockedCredential.authenticatorAttachment !== 'platform' ||
          lockedCredential.backupEligible ||
          lockedCredential.backedUp ||
          lockedCredential.rpId !== config.rpId
        ) {
          throw deviceAuthFailed();
        }

        const verification = await verifyAuthenticationResponse({
          response: assertionResponse as never,
          expectedChallenge: (challenge: string) =>
            hashSecret(challenge) === attempt.assertionChallengeHash,
          expectedOrigin: config.origins,
          expectedRPID: config.rpId,
          credential: {
            id: lockedCredential.credentialId,
            publicKey: lockedCredential.publicKey,
            counter: lockedCredential.signCount,
            transports: lockedCredential.transports,
          },
          requireUserVerification: true,
        });
        if (!verification.verified) throw deviceAuthFailed();
        const claimTime = new Date();
        if (attempt.expiresAt <= claimTime) throw deviceAuthFailed();
        const authenticationInfo = verification.authenticationInfo;
        if (
          !authenticationInfo.userVerified ||
          authenticationInfo.credentialDeviceType !== 'singleDevice' ||
          authenticationInfo.credentialBackedUp ||
          (lockedCredential.signCount > 0 &&
            authenticationInfo.newCounter <= lockedCredential.signCount)
        ) {
          throw deviceAuthFailed();
        }

        const claimed = await prisma.cashierLoginAttempt.updateMany({
          where: {
            id: attempt.id,
            bearerTokenHash,
            consumedAt: null,
            expiresAt: { gt: claimTime },
          },
          data: { consumedAt: claimTime },
        });
        if (claimed.count !== 1) throw deviceAuthFailed();

        if (authenticationInfo.newCounter > lockedCredential.signCount) {
          const counterUpdated =
            await prisma.deviceWebAuthnCredential.updateMany({
              where: {
                id: credential.id,
                deviceId: attempt.deviceId,
                status: DeviceWebAuthnCredentialStatus.ACTIVE,
                signCount: lockedCredential.signCount,
              },
              data: { signCount: authenticationInfo.newCounter },
            });
          if (counterUpdated.count !== 1) throw deviceAuthFailed();
        }

        const currentUser = await prisma.user.findUnique({
          where: { id: attempt.userId },
          include: { tenant: true, branch: true },
        });
        const currentDevice = await prisma.device.findUnique({
          where: { id: attempt.deviceId },
          include: { branch: true },
        });
        const currentCredential =
          await prisma.deviceWebAuthnCredential.findUnique({
            where: { id: credential.id },
          });
        if (
          !currentUser ||
          !isAuthUserEligible(currentUser) ||
          currentUser.role !== UserRole.CASHIER ||
          currentUser.tenantId !== attempt.tenantId ||
          currentUser.branchId !== attempt.branchId ||
          !currentDevice ||
          currentDevice.tenantId !== attempt.tenantId ||
          currentDevice.branchId !== attempt.branchId ||
          currentDevice.status !== DeviceStatus.ACTIVE ||
          currentDevice.branch.status !== 'ACTIVE' ||
          currentDevice.authBindingMode !== DeviceAuthBindingMode.WEBAUTHN ||
          !currentCredential ||
          currentCredential.status !== DeviceWebAuthnCredentialStatus.ACTIVE ||
          currentCredential.tenantId !== attempt.tenantId ||
          currentCredential.deviceId !== currentDevice.id ||
          currentCredential.attestationTrustResult !==
            DeviceAttestationTrustResult.TRUSTED ||
          currentCredential.authenticatorAttachment !== 'platform' ||
          currentCredential.backupEligible ||
          currentCredential.backedUp ||
          currentCredential.rpId !== config.rpId
        ) {
          throw deviceAuthFailed();
        }

        return this.issueSession(
          prisma,
          currentUser.id,
          currentUser.tenantId,
          'auth.cashier_login',
          currentDevice.id,
          DEFAULT_SESSION_LIFETIME_MS,
          SessionPurpose.USER,
          currentCredential.id,
        );
      });
    } catch {
      throw deviceAuthFailed();
    }
  }

  async bootstrapSmokeSession(
    bootstrapSecret: string | undefined,
    role: UserRole,
    userId: string,
    tenantId: string,
    deviceId?: string,
    deviceAttestation?: string,
  ): Promise<IssuedSession> {
    assertSmokeBootstrapSecret(
      bootstrapSecret,
      this.configService.get<string>('SMOKE_SESSION_BOOTSTRAP_SECRET'),
    );

    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        role,
        tenantId,
      },
      include: { tenant: true, branch: true },
    });

    if (!user || !isAuthUserEligible(user)) {
      throw new UnauthorizedException('User is not active');
    }

    if (role === UserRole.CASHIER && !deviceId) {
      throw new BadRequestException('Device is required');
    }

    const sessionDevice = deviceId
      ? await this.prismaService.device.findFirst({
          where: { id: deviceId, tenantId: user.tenantId },
          include: { branch: true },
        })
      : null;

    if (
      deviceId &&
      (!sessionDevice ||
        sessionDevice.status !== 'ACTIVE' ||
        sessionDevice.branch.status !== 'ACTIVE' ||
        (user.branchId && user.branchId !== sessionDevice.branchId))
    ) {
      throw new BadRequestException('Device is not active');
    }

    if (deviceId && !deviceAttestation) {
      throw new BadRequestException('Device attestation is required');
    }

    const attestation = deviceId
      ? assertDeviceAttestationValid(
          deviceId,
          deviceAttestation!,
          resolveDeviceAttestationSecret(
            sessionDevice!,
            this.configService.get<string>('DEVICE_ATTESTATION_KEK') ?? '',
          ),
        )
      : null;

    return this.prismaService.$transaction(async (prisma) => {
      let attestationId: string | null = null;
      if (sessionDevice && attestation) {
        attestationId = await recordDeviceAttestation(prisma, {
          tenantId: user.tenantId,
          deviceId: sessionDevice.id,
          nonce: attestation.nonce,
          attestationTimestamp: new Date(attestation.timestamp),
          expiresAt: new Date(
            attestation.timestamp + MAX_DEVICE_ATTESTATION_SKEW_MS,
          ),
        });
      }

      const issued = await this.issueSession(
        prisma,
        user.id,
        user.tenantId,
        'auth.smoke_session_bootstrap',
        sessionDevice?.id ?? null,
        SMOKE_SESSION_LIFETIME_MS,
        SessionPurpose.SMOKE,
      );

      if (attestationId) {
        await prisma.deviceAttestation.update({
          where: { id: attestationId },
          data: { issuedSessionId: issued.context.session.id },
        });
      }

      return issued;
    });
  }

  async refresh(sessionId: string): Promise<IssuedSession> {
    const session = await this.prismaService.session.findUnique({
      where: { id: sessionId },
      include: {
        user: { include: { tenant: true, branch: true } },
        device: { include: { branch: true } },
        deviceCredential: { select: deviceCredentialSessionSelect },
      },
    });

    if (
      !session ||
      session.status !== 'ACTIVE' ||
      session.expiresAt <= new Date() ||
      !isAuthUserEligible(session.user)
    ) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    if (!isSessionDeviceEligible(session, this.configuredWebAuthnRpId())) {
      throw new DomainHttpException(
        HttpStatus.UNAUTHORIZED,
        'DEVICE_REVOKED',
        'Device session is no longer valid',
      );
    }

    if (session.purpose === SessionPurpose.SMOKE) {
      throw new UnauthorizedException('Smoke sessions cannot be refreshed');
    }

    return this.prismaService.$transaction(async (prisma) => {
      if (session.deviceId) {
        await prisma.$queryRaw(Prisma.sql`
          SELECT "id"
          FROM "Device"
          WHERE "id" = ${session.deviceId}
          FOR UPDATE
        `);
      }
      if (session.deviceCredentialId && session.deviceId) {
        await prisma.$queryRaw(Prisma.sql`
          SELECT "id"
          FROM "DeviceWebAuthnCredential"
          WHERE "id" = ${session.deviceCredentialId}
            AND "deviceId" = ${session.deviceId}
          FOR UPDATE
        `);
      }

      const revokedAt = new Date();
      const revoked = await prisma.session.updateMany({
        where: {
          id: session.id,
          status: 'ACTIVE',
          expiresAt: { gt: revokedAt },
        },
        data: { status: 'REVOKED', revokedAt },
      });
      if (revoked.count !== 1) {
        throw new UnauthorizedException('Session already rotated');
      }

      const currentSession = await prisma.session.findUnique({
        where: { id: session.id },
        include: {
          user: { include: { tenant: true, branch: true } },
          device: { include: { branch: true } },
          deviceCredential: { select: deviceCredentialSessionSelect },
        },
      });

      if (!currentSession || !isAuthUserEligible(currentSession.user)) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      if (
        !isSessionDeviceEligible(currentSession, this.configuredWebAuthnRpId())
      ) {
        throw new DomainHttpException(
          HttpStatus.UNAUTHORIZED,
          'DEVICE_REVOKED',
          'Device session is no longer valid',
        );
      }

      return this.issueSession(
        prisma,
        currentSession.userId,
        currentSession.user.tenantId,
        'auth.refresh',
        currentSession.deviceId ?? null,
        DEFAULT_SESSION_LIFETIME_MS,
        SessionPurpose.USER,
        currentSession.deviceCredentialId ?? null,
      );
    });
  }

  async logout(sessionId: string): Promise<void> {
    await this.prismaService.session.updateMany({
      where: { id: sessionId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }

  me(context: AuthContext): AuthContext {
    return context;
  }

  private async beginCashierWebAuthnLogin(
    user: { id: string; tenantId: string; branchId: string | null },
    device: Prisma.DeviceGetPayload<{
      include: { branch: true; webAuthnCredentials: true };
    }>,
  ): Promise<CashierAssertionRequired> {
    if (
      device.authBindingMode !== DeviceAuthBindingMode.WEBAUTHN ||
      device.status !== DeviceStatus.ACTIVE ||
      device.branch.status !== 'ACTIVE' ||
      user.branchId !== device.branchId ||
      device.webAuthnCredentials.length === 0
    ) {
      throw deviceAuthFailed();
    }

    const config = this.requiredWebAuthnLoginConfig();
    const eligibleCredentials = device.webAuthnCredentials.filter(
      (credential) =>
        credential.attestationTrustResult ===
          DeviceAttestationTrustResult.TRUSTED &&
        credential.authenticatorAttachment === 'platform' &&
        !credential.backupEligible &&
        !credential.backedUp &&
        credential.rpId === config.rpId,
    );
    if (eligibleCredentials.length === 0) throw deviceAuthFailed();

    const options = await generateAuthenticationOptions({
      rpID: config.rpId,
      timeout: 2 * 60 * 1000,
      userVerification: 'required',
      allowCredentials: eligibleCredentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports,
      })),
    });
    if (Buffer.from(options.challenge, 'base64url').length < 32) {
      throw deviceAuthFailed();
    }

    const attemptToken = randomBytes(32).toString('base64url');
    await this.prismaService.cashierLoginAttempt.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        branchId: device.branchId,
        deviceId: device.id,
        bearerTokenHash: hashSecret(attemptToken),
        assertionChallengeHash: hashSecret(options.challenge),
        purpose: CashierLoginAttemptPurpose.CASHIER_LOGIN,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      },
    });

    return {
      statusCode: 202,
      code: 'DEVICE_ASSERTION_REQUIRED',
      attemptToken,
      options,
    };
  }

  private configuredWebAuthnRpId(): string | undefined {
    return this.configService
      .get<string>('WEBAUTHN_RP_ID')
      ?.trim()
      .toLowerCase();
  }

  private requiredWebAuthnLoginConfig(): { rpId: string; origins: string[] } {
    const rpId = this.configService
      .get<string>('WEBAUTHN_RP_ID')
      ?.trim()
      .toLowerCase();
    const origins = this.configService
      .get<string>('WEBAUTHN_ALLOWED_ORIGINS')
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (!rpId || !origins?.length) throw deviceAuthFailed();
    return { rpId, origins };
  }

  private async issueSession(
    prisma: Prisma.TransactionClient,
    userId: string,
    tenantId: string,
    action: string,
    deviceId: string | null,
    lifetimeMs = DEFAULT_SESSION_LIFETIME_MS,
    purpose: SessionPurpose = SessionPurpose.USER,
    deviceCredentialId: string | null = null,
  ): Promise<IssuedSession> {
    const [sessionToken, csrfToken] = [randomUUID(), randomUUID()];
    if (
      !Number.isSafeInteger(lifetimeMs) ||
      lifetimeMs <= 0 ||
      (purpose === SessionPurpose.SMOKE &&
        lifetimeMs > SMOKE_SESSION_LIFETIME_MS)
    ) {
      throw new Error('Session lifetime exceeds the allowed maximum');
    }
    const expiresAt = new Date(Date.now() + lifetimeMs);
    const sessionSecret =
      this.configService.get<string>('SESSION_SECRET') ?? '';
    const csrfSecret = this.configService.get<string>('CSRF_SECRET') ?? '';

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true, branch: true },
    });
    if (!user || !isAuthUserEligible(user)) {
      throw new UnauthorizedException('User is not active');
    }

    const session = await prisma.session.create({
      data: {
        userId,
        deviceId,
        deviceCredentialId,
        sessionTokenHash: hashToken(sessionToken, sessionSecret),
        csrfTokenHash: createHash('sha256')
          .update(`${csrfSecret}:${csrfToken}`)
          .digest('hex'),
        purpose,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    await this.auditService.recordWithClient(prisma, {
      tenantId,
      actorId: userId,
      action,
      entityType: 'session',
      entityId: session.id,
      metadata: { expiresAt },
    });

    return {
      context: { session, user },
      sessionToken,
      csrfToken,
    };
  }

  toResponse(context: AuthContext) {
    return {
      user: {
        id: context.user.id,
        username: context.user.username,
        role: context.user.role,
        branchId: context.user.branchId,
      },
      session: {
        expiresAt: context.session.expiresAt.toISOString(),
        deviceId: context.session.deviceId,
      },
    };
  }

  private async recordFailedLoginEvidence(
    candidate: {
      id: string;
      tenantId: string;
      username: string;
    },
    normalizedUsername: string,
  ): Promise<void> {
    await this.prismaService.$transaction(async (tx) => {
      await this.auditService.recordWithClient(tx, {
        tenantId: candidate.tenantId,
        actorId: candidate.id,
        action: 'auth.login.failed',
        entityType: 'user',
        entityId: candidate.id,
        metadata: {
          username: normalizedUsername,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: candidate.tenantId,
          aggregateType: 'auth-user',
          aggregateId: candidate.id,
          eventType: 'fraud.evaluate',
          payload: {
            kind: 'auth.login.failed',
            userId: candidate.id,
            username: normalizedUsername,
            occurredAt: new Date().toISOString(),
          },
          status: 'PENDING',
          nextAttemptAt: new Date(),
        },
      });
    });
  }

  async resolveCurrentSession(sessionId: string): Promise<AuthContext> {
    const session = await this.prismaService.session.findUnique({
      where: { id: sessionId },
      include: {
        user: { include: { tenant: true, branch: true } },
        device: { include: { branch: true } },
        deviceCredential: { select: deviceCredentialSessionSelect },
      },
    });

    if (
      !session ||
      session.status !== 'ACTIVE' ||
      !isAuthUserEligible(session.user) ||
      !isSessionDeviceEligible(session, this.configuredWebAuthnRpId())
    ) {
      throw new UnauthorizedException('User is not active');
    }

    return { session, user: session.user };
  }
}

function isCashierAttemptToken(value: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === 32 && decoded.toString('base64url') === value;
}

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function deviceAuthFailed(): DomainHttpException {
  return new DomainHttpException(
    HttpStatus.UNAUTHORIZED,
    'DEVICE_AUTH_FAILED',
    'Device authentication failed',
  );
}

function assertDeviceAttestationValid(
  deviceId: string,
  attestation: string,
  fingerprintHash: string,
): { timestamp: number; nonce: string } {
  const parts = attestation.split('.');
  if (parts.length !== 3) {
    throw new BadRequestException('Device attestation is invalid');
  }

  const [timestampRaw, nonce, signature] = parts;
  const timestamp = Number(timestampRaw);
  if (!Number.isInteger(timestamp) || !nonce || !signature) {
    throw new BadRequestException('Device attestation is invalid');
  }

  if (Math.abs(Date.now() - timestamp) > MAX_DEVICE_ATTESTATION_SKEW_MS) {
    throw new BadRequestException('Device attestation is invalid');
  }

  const expected = createHmac('sha256', fingerprintHash)
    .update(`${deviceId}.${timestamp}.${nonce}`)
    .digest('base64url');

  const expectedBuffer = Buffer.from(expected, 'base64url');
  const providedBuffer = Buffer.from(signature, 'base64url');

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new BadRequestException('Device attestation is invalid');
  }

  return { timestamp, nonce };
}

function resolveDeviceAttestationSecret(
  device: {
    attestationSecretCiphertext?: string | null;
  },
  keyMaterial: string,
): string {
  if (device.attestationSecretCiphertext) {
    return decryptDeviceAttestationSecret(
      device.attestationSecretCiphertext,
      keyMaterial,
    );
  }

  throw new DomainHttpException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'DEVICE_ATTESTATION_SECRET_UNAVAILABLE',
    'Device attestation secret is unavailable',
  );
}

function assertSmokeBootstrapSecret(
  provided: string | undefined,
  expected: string | undefined,
): void {
  if (!provided?.trim() || !expected?.trim()) {
    throw new UnauthorizedException('Invalid smoke bootstrap credentials');
  }

  const providedHash = createHash('sha256').update(provided.trim()).digest();
  const expectedHash = createHash('sha256').update(expected.trim()).digest();
  if (!timingSafeEqual(providedHash, expectedHash)) {
    throw new UnauthorizedException('Invalid smoke bootstrap credentials');
  }
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

async function recordDeviceAttestation(
  prisma: Prisma.TransactionClient,
  input: {
    tenantId: string;
    deviceId: string;
    nonce: string;
    attestationTimestamp: Date;
    expiresAt: Date;
  },
): Promise<string> {
  await prisma.deviceAttestation.deleteMany({
    where: { deviceId: input.deviceId, expiresAt: { lt: new Date() } },
  });

  try {
    const attestation = await prisma.deviceAttestation.create({
      data: {
        tenantId: input.tenantId,
        deviceId: input.deviceId,
        nonce: input.nonce,
        nonceHash: hashDeviceAttestationNonce(input.nonce),
        attestationTimestamp: input.attestationTimestamp,
        acceptedAt: new Date(),
        expiresAt: input.expiresAt,
      },
    });

    return attestation.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new DomainHttpException(
        HttpStatus.CONFLICT,
        'DEVICE_ATTESTATION_REPLAYED',
        'Device attestation has already been used',
      );
    }

    throw error;
  }
}

function hashDeviceAttestationNonce(nonce: string): string {
  return createHash('sha256').update(nonce).digest('hex');
}
