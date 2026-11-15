jest.mock('./database/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

jest.mock('./jobs/sms.provider.factory', () => ({
  createSmsProvider: jest.fn(),
}));

jest.mock('./common/observability/sentry', () => ({
  initializeSentryIfConfigured: jest.fn(),
}));

import { PrismaService } from './database/prisma.service';
import { initializeSentryIfConfigured } from './common/observability/sentry';
import { createSmsProvider } from './jobs/sms.provider.factory';
import { bootstrap } from './worker';

describe('worker bootstrap', () => {
  it('initializes Sentry before the worker runtime and still creates the SMS provider before Prisma', async () => {
    const originalProviderMode = process.env.SMS_PROVIDER_MODE;
    const originalProviderVendor = process.env.SMS_PROVIDER_VENDOR;
    const originalTermiiSenderId = process.env.TERMII_SENDER_ID;
    process.env.SMS_PROVIDER_MODE = 'deterministic';
    process.env.SMS_PROVIDER_VENDOR = 'ebulksms';
    process.env.TERMII_SENDER_ID = 'ShopCity';

    try {
      jest.mocked(createSmsProvider).mockImplementation(() => {
        throw new Error('sms provider failed');
      });

      await expect(bootstrap()).rejects.toThrow('sms provider failed');
      expect(initializeSentryIfConfigured).toHaveBeenCalledWith(process.env, {
        runtime: 'worker',
      });
      expect(PrismaService).not.toHaveBeenCalled();
    } finally {
      if (originalProviderMode === undefined) {
        delete process.env.SMS_PROVIDER_MODE;
      } else {
        process.env.SMS_PROVIDER_MODE = originalProviderMode;
      }
      if (originalProviderVendor === undefined) {
        delete process.env.SMS_PROVIDER_VENDOR;
      } else {
        process.env.SMS_PROVIDER_VENDOR = originalProviderVendor;
      }
      if (originalTermiiSenderId === undefined) {
        delete process.env.TERMII_SENDER_ID;
      } else {
        process.env.TERMII_SENDER_ID = originalTermiiSenderId;
      }
    }
  });
});
