jest.mock('./database/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

jest.mock('./jobs/sms.provider.factory', () => ({
  createSmsProvider: jest.fn(),
}));

import { PrismaService } from './database/prisma.service';
import { createSmsProvider } from './jobs/sms.provider.factory';
import { bootstrap } from './worker';

describe('worker bootstrap', () => {
  it('creates the SMS provider before Prisma', async () => {
    jest.mocked(createSmsProvider).mockImplementation(() => {
      throw new Error('sms provider failed');
    });

    await expect(bootstrap()).rejects.toThrow('sms provider failed');
    expect(PrismaService).not.toHaveBeenCalled();
  });
});
