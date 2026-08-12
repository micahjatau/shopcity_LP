import { SmsMessageStatus } from '@prisma/client';
import { ExpiryReminderService } from './expiry-reminder.service';

describe('ExpiryReminderService', () => {
  it('creates one reminder, outbox event, and SMS row per customer-day candidate', async () => {
    const outboxEventCreate = jest.fn().mockResolvedValue({ id: 'outbox-1' });
    const smsMessageCreate = jest.fn().mockResolvedValue({ id: 'sms-1' });
    const creditExpiryReminderCreate = jest
      .fn()
      .mockResolvedValue({ id: 'reminder-1' });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          remainingAmountKobo: 1500n,
          expiresAt: new Date('2027-08-01T08:00:00.000Z'),
        },
      ]),
      outboxEvent: { create: outboxEventCreate },
      smsMessage: { create: smsMessageCreate },
      creditExpiryReminder: {
        create: creditExpiryReminderCreate,
      },
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          phoneE164: '+2348000000000',
          totalExpiringKobo: 1500n,
          earliestExpiresAt: new Date('2027-08-01T08:00:00.000Z'),
          latestExpiresAt: new Date('2027-08-01T10:00:00.000Z'),
        },
      ]),
      $transaction: jest
        .fn()
        .mockImplementation(
          async (callback: (client: typeof tx) => Promise<unknown>) =>
            callback(tx),
        ),
    };
    const service = new ExpiryReminderService(prisma as never);
    const now = new Date('2027-07-02T00:00:00.000Z');

    await expect(
      service.enqueueDueReminders({ now, reminderDays: 30, batchSize: 10 }),
    ).resolves.toEqual({ customers: 1, amountKobo: 1500n });

    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(smsMessageCreate).toHaveBeenCalledTimes(1);
    const [[smsMessageCreateCall]] = smsMessageCreate.mock.calls as Array<
      [{ data: { status: SmsMessageStatus; template: string } }]
    >;
    expect(smsMessageCreateCall.data.status).toBe(SmsMessageStatus.QUEUED);
    expect(smsMessageCreateCall.data.template).toBe(
      'credit-expiry-reminder-v1',
    );
    expect(tx.creditExpiryReminder.create).toHaveBeenCalledTimes(1);
  });

  it('revalidates candidate totals inside the transaction before persisting reminder evidence', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      outboxEvent: { create: jest.fn() },
      smsMessage: { create: jest.fn() },
      creditExpiryReminder: { create: jest.fn() },
    };
    const lots = [
      {
        remainingAmountKobo: 5_000n,
        expiresAt: new Date('2027-08-01T08:00:00.000Z'),
      },
    ];
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          phoneE164: '+2348000000000',
          totalExpiringKobo: 5_000n,
          earliestExpiresAt: new Date('2027-08-01T08:00:00.000Z'),
          latestExpiresAt: new Date('2027-08-01T08:00:00.000Z'),
        },
      ]),
      $transaction: jest
        .fn()
        .mockImplementation(
          (callback: (client: typeof tx) => Promise<unknown>) => {
            lots[0].remainingAmountKobo = 0n;
            tx.$queryRaw.mockResolvedValue([]);
            return Promise.resolve(callback(tx));
          },
        ),
    };
    const service = new ExpiryReminderService(prisma as never);

    await expect(
      service.enqueueDueReminders({
        now: new Date('2027-07-02T00:00:00.000Z'),
        reminderDays: 30,
        batchSize: 10,
      }),
    ).resolves.toEqual({ customers: 0, amountKobo: 0n });

    expect(tx.outboxEvent.create).not.toHaveBeenCalled();
    expect(tx.smsMessage.create).not.toHaveBeenCalled();
    expect(tx.creditExpiryReminder.create).not.toHaveBeenCalled();
  });

  it('rejects invalid sweep inputs', async () => {
    const service = new ExpiryReminderService({
      $queryRaw: jest.fn(),
    } as never);

    await expect(
      service.enqueueDueReminders({
        now: new Date('invalid'),
        reminderDays: 30,
        batchSize: 10,
      }),
    ).rejects.toThrow(/valid Date/i);
    await expect(
      service.enqueueDueReminders({
        now: new Date(),
        reminderDays: 0,
        batchSize: 10,
      }),
    ).rejects.toThrow(/positive integer/i);
    await expect(
      service.enqueueDueReminders({
        now: new Date(),
        reminderDays: 30,
        batchSize: 0,
      }),
    ).rejects.toThrow(/positive integer/i);
  });
});
