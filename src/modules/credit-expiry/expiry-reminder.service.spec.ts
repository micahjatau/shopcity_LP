import { SmsMessageStatus } from '@prisma/client';
import { ExpiryReminderService } from './expiry-reminder.service';

describe('ExpiryReminderService', () => {
  it('creates one reminder, outbox event, and SMS row per customer-day candidate', async () => {
    const tx = {
      outboxEvent: { create: jest.fn().mockResolvedValue({ id: 'outbox-1' }) },
      smsMessage: { create: jest.fn().mockResolvedValue({ id: 'sms-1' }) },
      creditExpiryReminder: { create: jest.fn().mockResolvedValue({ id: 'reminder-1' }) },
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
      $transaction: jest.fn().mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new ExpiryReminderService(prisma as never);
    const now = new Date('2027-07-02T00:00:00.000Z');

    await expect(
      service.enqueueDueReminders({ now, reminderDays: 30, batchSize: 10 }),
    ).resolves.toEqual({ customers: 1, amountKobo: 1500n });

    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.smsMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SmsMessageStatus.QUEUED,
          template: 'credit-expiry-reminder-v1',
        }),
      }),
    );
    expect(tx.creditExpiryReminder.create).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid sweep inputs', async () => {
    const service = new ExpiryReminderService({ $queryRaw: jest.fn() } as never);

    await expect(
      service.enqueueDueReminders({ now: new Date('invalid'), reminderDays: 30, batchSize: 10 }),
    ).rejects.toThrow(/valid Date/i);
    await expect(
      service.enqueueDueReminders({ now: new Date(), reminderDays: 0, batchSize: 10 }),
    ).rejects.toThrow(/positive integer/i);
    await expect(
      service.enqueueDueReminders({ now: new Date(), reminderDays: 30, batchSize: 0 }),
    ).rejects.toThrow(/positive integer/i);
  });
});
