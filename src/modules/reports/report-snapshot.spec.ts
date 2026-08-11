import {
  approvalStatusAt,
  redemptionStatusAt,
  smsStatusAt,
} from './report-snapshot';

describe('report snapshot helpers', () => {
  it('reconstructs redemption state at a watermark', () => {
    const requestedAt = new Date('2026-08-10T10:00:00.000Z');
    const confirmedAt = new Date('2026-08-10T11:00:00.000Z');
    const reversedAt = new Date('2026-08-10T12:00:00.000Z');

    expect(
      redemptionStatusAt(
        {
          requestedAt,
          confirmedAt,
          rejectedAt: null,
          reversedAt,
        },
        new Date('2026-08-10T10:30:00.000Z'),
      ),
    ).toBe('PENDING_APPROVAL');
    expect(
      redemptionStatusAt(
        {
          requestedAt,
          confirmedAt,
          rejectedAt: null,
          reversedAt,
        },
        new Date('2026-08-10T11:30:00.000Z'),
      ),
    ).toBe('CONFIRMED');
    expect(
      redemptionStatusAt(
        {
          requestedAt,
          confirmedAt,
          rejectedAt: null,
          reversedAt,
        },
        new Date('2026-08-10T12:30:00.000Z'),
      ),
    ).toBe('REVERSED');
  });

  it('does not leak future redemption rejection backward', () => {
    expect(
      redemptionStatusAt(
        {
          requestedAt: new Date('2026-08-01T09:00:00.000Z'),
          confirmedAt: null,
          rejectedAt: new Date('2026-08-10T09:00:00.000Z'),
          reversedAt: null,
        },
        new Date('2026-08-05T09:00:00.000Z'),
      ),
    ).toBe('PENDING_APPROVAL');
  });

  it('reconstructs SMS state from the latest transition at a watermark', () => {
    const queuedAt = new Date('2026-08-10T09:00:00.000Z');
    const failedAt = new Date('2026-08-10T09:05:00.000Z');
    const sentAt = new Date('2026-08-10T09:15:00.000Z');
    const deliveredAt = new Date('2026-08-10T09:16:00.000Z');

    expect(
      smsStatusAt(
        {
          queuedAt,
          sentAt,
          deliveredAt,
          failedAt,
          suppressedAt: null,
        },
        new Date('2026-08-10T09:03:00.000Z'),
      ),
    ).toBe('QUEUED');
    expect(
      smsStatusAt(
        {
          queuedAt,
          sentAt,
          deliveredAt,
          failedAt,
          suppressedAt: null,
        },
        new Date('2026-08-10T09:10:00.000Z'),
      ),
    ).toBe('FAILED');
    expect(
      smsStatusAt(
        {
          queuedAt,
          sentAt,
          deliveredAt,
          failedAt,
          suppressedAt: null,
        },
        new Date('2026-08-10T09:20:00.000Z'),
      ),
    ).toBe('DELIVERED');
  });

  it('reconstructs approval state at a watermark', () => {
    const requestedAt = new Date('2026-08-10T09:00:00.000Z');
    const decidedAt = new Date('2026-08-10T10:00:00.000Z');
    const executedAt = new Date('2026-08-10T11:00:00.000Z');
    const expiresAt = new Date('2026-08-11T09:00:00.000Z');

    expect(
      approvalStatusAt(
        {
          requestedAt,
          decidedAt,
          executedAt,
          expiresAt,
          status: 'PENDING',
        },
        new Date('2026-08-10T09:30:00.000Z'),
      ),
    ).toBe('PENDING');
    expect(
      approvalStatusAt(
        {
          requestedAt,
          decidedAt,
          executedAt,
          expiresAt,
          status: 'APPROVED',
        },
        new Date('2026-08-10T10:30:00.000Z'),
      ),
    ).toBe('APPROVED');
    expect(
      approvalStatusAt(
        {
          requestedAt,
          decidedAt,
          executedAt,
          expiresAt,
          status: 'EXECUTED',
        },
        new Date('2026-08-10T11:30:00.000Z'),
      ),
    ).toBe('EXECUTED');
  });
});
