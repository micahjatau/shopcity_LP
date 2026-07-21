import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import { hashToken, isAuthUserEligible } from '../../common/auth/session.guard';

const MAX_DEVICE_ATTESTATION_SKEW_MS = 5 * 60 * 1000;

interface IssuedSession {
  context: AuthContext;
  sessionToken: string;
  csrfToken: string;
}

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
  ): Promise<IssuedSession> {
    const { data, error } =
      await this.supabaseService.publicClient.auth.signInWithPassword({
        email: username,
        password,
      });

    if (error || !data.user) {
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

    if (deviceId) {
      if (!deviceAttestation) {
        throw new BadRequestException('Device attestation is required');
      }

      assertDeviceAttestationValid(
        deviceId,
        deviceAttestation,
        sessionDevice!.fingerprintHash,
      );
    }

    return this.prismaService.$transaction((prisma) =>
      this.issueSession(
        prisma,
        user.id,
        user.tenantId,
        'auth.login',
        sessionDevice?.id ?? null,
      ),
    );
  }

  async refresh(sessionId: string): Promise<IssuedSession> {
    const session = await this.prismaService.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { tenant: true, branch: true } } },
    });

    if (
      !session ||
      session.status !== 'ACTIVE' ||
      session.expiresAt <= new Date() ||
      !isAuthUserEligible(session.user)
    ) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    return this.prismaService.$transaction(async (prisma) => {
      const revoked = await prisma.session.updateMany({
        where: {
          id: session.id,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException('Session already rotated');
      }

      return this.issueSession(
        prisma,
        session.userId,
        session.user.tenantId,
        'auth.refresh',
        session.deviceId ?? null,
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

  private async issueSession(
    prisma: Prisma.TransactionClient,
    userId: string,
    tenantId: string,
    action: string,
    deviceId: string | null,
  ): Promise<IssuedSession> {
    const [sessionToken, csrfToken] = [randomUUID(), randomUUID()];
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
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
        sessionTokenHash: hashToken(sessionToken, sessionSecret),
        csrfTokenHash: createHash('sha256')
          .update(`${csrfSecret}:${csrfToken}`)
          .digest('hex'),
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
      },
    };
  }

  async resolveCurrentSession(sessionId: string): Promise<AuthContext> {
    const session = await this.prismaService.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { tenant: true, branch: true } } },
    });

    if (
      !session ||
      session.status !== 'ACTIVE' ||
      !isAuthUserEligible(session.user)
    ) {
      throw new UnauthorizedException('User is not active');
    }

    return { session, user: session.user };
  }
}

function assertDeviceAttestationValid(
  deviceId: string,
  attestation: string,
  fingerprintHash: string,
): void {
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
}
