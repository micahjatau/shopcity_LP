import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import { hashToken } from '../../common/auth/session.guard';

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

  async login(username: string, password: string): Promise<IssuedSession> {
    const { data, error } =
      await this.supabaseService.publicClient.auth.signInWithPassword({
        email: username,
        password,
      });

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prismaService.user.findFirst({
      where: {
        OR: [{ supabaseAuthId: data.user.id }, { username }],
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    return this.issueSession(user.id, user.tenantId, 'auth.login');
  }

  async refresh(sessionId: string): Promise<IssuedSession> {
    const session = await this.prismaService.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (
      !session ||
      session.status !== 'ACTIVE' ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    await this.prismaService.session.update({
      where: { id: session.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    return this.issueSession(
      session.userId,
      session.user.tenantId,
      'auth.refresh',
    );
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
    userId: string,
    tenantId: string,
    action: string,
  ): Promise<IssuedSession> {
    const [sessionToken, refreshToken, csrfToken] = [
      randomUUID(),
      randomUUID(),
      randomUUID(),
    ];
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
    const sessionSecret =
      this.configService.get<string>('SESSION_SECRET') ?? '';
    const csrfSecret = this.configService.get<string>('CSRF_SECRET') ?? '';

    return this.prismaService.$transaction(async (prisma) => {
      const session = await prisma.session.create({
        data: {
          userId,
          sessionTokenHash: hashToken(sessionToken, sessionSecret),
          refreshTokenHash: hashToken(refreshToken, sessionSecret),
          csrfTokenHash: createHash('sha256')
            .update(`${csrfSecret}:${csrfToken}`)
            .digest('hex'),
          expiresAt,
          lastUsedAt: new Date(),
        },
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

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
    });
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
      include: { user: true },
    });

    if (!session || session.status !== 'ACTIVE') {
      throw new UnauthorizedException('Session expired or revoked');
    }

    return { session, user: session.user };
  }
}
