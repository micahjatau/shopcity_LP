jest.mock('../database/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

jest.mock('./sms.provider.factory', () => ({
  createSmsProvider: jest.fn(),
}));

import { PrismaService } from '../database/prisma.service';
import { createSmsProvider } from './sms.provider.factory';
import { bootstrapWorker } from './worker';

describe('bootstrapWorker', () => {
  it('creates the SMS provider before Prisma', () => {
    jest.mocked(createSmsProvider).mockImplementation(() => {
      throw new Error('sms provider failed');
    });

    expect(() => bootstrapWorker('redis://127.0.0.1:6379')).toThrow(
      'sms provider failed',
    );
    expect(PrismaService).not.toHaveBeenCalled();
  });
});
