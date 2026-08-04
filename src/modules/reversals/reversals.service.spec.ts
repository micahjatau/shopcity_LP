import { HttpStatus } from '@nestjs/common';
import { SessionStatus, UserRole, UserStatus } from '@prisma/client';
import { ReversalsService } from './reversals.service';

describe('ReversalsService', () => {
  const service = new ReversalsService();

  it('requires an idempotency key', async () => {
    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', undefined, {
        reason: 'Customer refund',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key header is required',
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('requires a non-empty reason', async () => {
    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', 'idem-1', {
        reason: '   ',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_ERROR',
        message: 'Reversal reason is required',
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('returns the unavailable boundary for valid reversal requests', async () => {
    await expect(
      service.reverse('tenant-1', actor(), 'transaction-1', 'idem-1', {
        reason: 'Customer refund',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'REVERSAL_UNAVAILABLE',
        message: 'Transaction reversal is not available in this release',
      },
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
  });
});

function actor() {
  return {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      branchId: null,
      username: 'supervisor-1',
      supabaseAuthId: null,
      role: UserRole.SUPERVISOR,
      status: UserStatus.ACTIVE,
      lastLoginAt: null,
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      updatedAt: new Date('2026-08-04T00:00:00.000Z'),
    },
    session: {
      id: 'session-1',
      userId: 'user-1',
      deviceId: null,
      sessionTokenHash: 'session-token-hash',
      csrfTokenHash: 'csrf-token-hash',
      status: SessionStatus.ACTIVE,
      expiresAt: new Date('2026-08-04T00:00:00.000Z'),
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      updatedAt: new Date('2026-08-04T00:00:00.000Z'),
    },
  };
}
