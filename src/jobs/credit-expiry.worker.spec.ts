import {
  CreditExpiryWorkerRuntime,
  loadCreditExpiryWorkerConfig,
} from './credit-expiry.worker';

describe('CreditExpiryWorkerRuntime', () => {
  it('runs expiry and reminder sweeps with the same injected clock instant', async () => {
    const now = new Date('2027-07-02T00:00:00.000Z');
    const creditExpiryService = {
      expireDueCredit: jest.fn().mockResolvedValue({}),
    };
    const expiryReminderService = {
      enqueueDueReminders: jest.fn().mockResolvedValue({}),
    };
    const runtime = new CreditExpiryWorkerRuntime(
      creditExpiryService as never,
      expiryReminderService as never,
      {
        expirySweepIntervalMs: 60_000,
        expiryBatchSize: 50,
        reminderDays: 30,
        reminderBatchSize: 25,
      },
      () => now,
    );

    await runtime.start();
    await runtime.stop();

    expect(creditExpiryService.expireDueCredit).toHaveBeenCalledWith({
      now,
      batchSize: 50,
    });
    expect(expiryReminderService.enqueueDueReminders).toHaveBeenCalledWith({
      now,
      reminderDays: 30,
      batchSize: 25,
    });
  });

  it('loads worker config from validated environment values', () => {
    expect(
      loadCreditExpiryWorkerConfig({
        ...process.env,
        DATABASE_URL:
          'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity_test?schema=public',
        REDIS_URL: 'redis://127.0.0.1:6379',
        SESSION_SECRET: 'test-session-secret-test-session-secret',
        CSRF_SECRET: 'test-csrf-secret-test-csrf-secret',
        DEVICE_ATTESTATION_KEK:
          'test-device-attestation-kek-test-device-attestation-kek',
        CREDIT_EXPIRY_SWEEP_INTERVAL_MS: '120000',
        CREDIT_EXPIRY_BATCH_SIZE: '20',
        CREDIT_EXPIRY_REMINDER_DAYS: '30',
        CREDIT_EXPIRY_REMINDER_BATCH_SIZE: '40',
      }),
    ).toEqual({
      expirySweepIntervalMs: 120000,
      expiryBatchSize: 20,
      reminderDays: 30,
      reminderBatchSize: 40,
    });
  });
});
