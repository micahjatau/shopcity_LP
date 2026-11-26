import { ConfigService } from '@nestjs/config';
import { ScheduledJobsController } from './scheduled-jobs.controller';
import type { ScheduledJobsService } from './scheduled-jobs.service';

const SCHEDULED_FLOWS = [
  'F0',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
] as const;

describe('ScheduledJobsController', () => {
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          SCHEDULER_SECRET: 's'.repeat(48),
          SCHEDULER_ENVIRONMENT: 'preview',
          SHOPCITY_DEPLOYMENT_ENV: 'preview',
        })[key],
    ),
  } as unknown as ConfigService;
  const completedRun = {
    flow: 'F0',
    status: 'COMPLETED',
    startedAt: new Date('2026-11-15T00:00:00.000Z'),
    finishedAt: new Date('2026-11-15T00:00:01.000Z'),
    result: { flow: 'F0', counters: { expired: 2 } },
    failureCategory: null,
  };
  const runJob = jest.fn().mockResolvedValue(completedRun);
  const jobs = {
    isFlow: jest.fn((value: string) =>
      SCHEDULED_FLOWS.includes(value as (typeof SCHEDULED_FLOWS)[number]),
    ),
    run: runJob,
  } as unknown as ScheduledJobsService;
  let controller: ScheduledJobsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ScheduledJobsController(config, jobs);
  });

  it('rejects absent credentials before running a flow', async () => {
    await expect(
      controller.run({ flow: 'F0', invocationKey: 'p:1' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(runJob).not.toHaveBeenCalled();
  });

  it('rejects a scheduler request from another environment', async () => {
    await expect(
      controller.run(
        { flow: 'F0', invocationKey: 'p:1' },
        `Bearer ${'s'.repeat(48)}`,
        'production',
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(runJob).not.toHaveBeenCalled();
  });

  it('rejects malformed flow and idempotency values', async () => {
    await expect(
      controller.run(
        { flow: 'UNKNOWN', invocationKey: 'p:1' },
        `Bearer ${'s'.repeat(48)}`,
        'preview',
      ),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      controller.run(
        { flow: 'F0', invocationKey: 'bad key' },
        `Bearer ${'s'.repeat(48)}`,
        'preview',
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(runJob).not.toHaveBeenCalled();
  });

  it('runs an authenticated, explicitly scoped flow with its idempotency key', async () => {
    const response = await controller.run(
      { flow: 'F0', invocationKey: 'preview:2026-11-15T00:00Z' },
      `Bearer ${'s'.repeat(48)}`,
      'preview',
    );
    expect(runJob).toHaveBeenCalledWith(
      'F0',
      'preview:2026-11-15T00:00Z',
      expect.any(Number),
    );
    expect(response).toMatchObject({
      success: true,
      flow: 'F0',
      status: 'COMPLETED',
    });
  });

  it.each(SCHEDULED_FLOWS)(
    'accepts and dispatches flow %s through the guarded endpoint',
    async (flow) => {
      const invocationKey = `preview:${flow}:matrix`;
      await controller.run(
        { flow, invocationKey },
        `Bearer ${'s'.repeat(48)}`,
        'preview',
      );
      expect(runJob).toHaveBeenCalledWith(
        flow,
        invocationKey,
        expect.any(Number),
      );
    },
  );
});
