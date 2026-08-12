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
    jest.mocked(createSmsProvider).mockImplementation(() => {
      throw new Error('sms provider failed');
    });

    await expect(bootstrap()).rejects.toThrow('sms provider failed');
    expect(initializeSentryIfConfigured).toHaveBeenCalledWith(process.env, {
      runtime: 'worker',
    });
    expect(PrismaService).not.toHaveBeenCalled();
  });
});
