import { publishOutboxEvent } from './outbox.publisher';

describe('publishOutboxEvent', () => {
  it('uses the outbox event id as the BullMQ job id', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const queue = {
      add,
      getJob: jest.fn().mockResolvedValue(undefined),
    } as never;

    await publishOutboxEvent(queue, {
      id: 'outbox-123',
      tenantId: 'tenant-1',
      aggregateType: 'receipt',
      aggregateId: 'receipt-1',
      eventType: 'sms.send',
      payload: { receiptId: 'receipt-1' },
    });

    expect(add).toHaveBeenCalledWith(
      'sms.send',
      expect.objectContaining({ id: 'outbox-123' }),
      expect.objectContaining({
        jobId: 'outbox-123',
        attempts: 5,
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
  });

  it('does not remove or republish a retained terminal job', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const add = jest.fn().mockResolvedValue(undefined);
    const queue = {
      add,
      getJob: jest.fn().mockResolvedValue({
        getState: jest.fn().mockResolvedValue('completed'),
        remove,
      }),
    } as never;

    await publishOutboxEvent(queue, {
      id: 'outbox-123',
      tenantId: 'tenant-1',
      aggregateType: 'receipt',
      aggregateId: 'receipt-1',
      eventType: 'sms.send',
      payload: { receiptId: 'receipt-1' },
    });

    expect(remove).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it('does not remove or republish a job that may be claimed concurrently', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const queue = {
      add,
      getJob: jest.fn().mockResolvedValue({
        getState: jest.fn().mockResolvedValue('waiting'),
      }),
    } as never;

    await publishOutboxEvent(queue, {
      id: 'outbox-123',
      tenantId: 'tenant-1',
      aggregateType: 'receipt',
      aggregateId: 'receipt-1',
      eventType: 'sms.send',
      payload: { receiptId: 'receipt-1' },
    });

    expect(add).not.toHaveBeenCalled();
  });
});
