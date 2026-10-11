import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ReportsController } from '../../modules/reports/reports.controller';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

describe('ResponseEnvelopeInterceptor', () => {
  it('leaves explicitly raw CSV responses unwrapped', async () => {
    const exportHandler: unknown = Object.getOwnPropertyDescriptor(
      ReportsController.prototype,
      'exportReport',
    )?.value;
    if (typeof exportHandler !== 'function') {
      throw new Error('Expected reports export handler to be defined.');
    }
    const { context, reply } = httpContext(
      exportHandler as (...args: never[]) => unknown,
    );
    const csv = 'scope,scopeKey\nBRANCH,branch-1';
    const result = await firstValueFrom(
      new ResponseEnvelopeInterceptor().intercept(context, {
        handle: () => of(csv),
      } as CallHandler),
    );

    expect(result).toBe(csv);
    expect(reply.header).toHaveBeenCalledWith('X-Request-Id', 'request-csv');
  });

  it('continues wrapping ordinary API responses', async () => {
    const { context } = httpContext(jest.fn());
    const data = { status: 'ok' };
    const result = await firstValueFrom(
      new ResponseEnvelopeInterceptor().intercept(context, {
        handle: () => of(data),
      } as CallHandler),
    );

    expect(result).toMatchObject({ success: true, data });
  });
});

function httpContext(handler: (...args: never[]) => unknown) {
  const reply = { header: jest.fn() };
  const request = {
    headers: { 'x-request-id': 'request-csv' },
    url: '/api/v1/reports/executive-summary/export',
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply,
    }),
    getHandler: () => handler,
  } as unknown as ExecutionContext;

  return { context, reply };
}
