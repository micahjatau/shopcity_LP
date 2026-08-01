import { HttpException, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('preserves domain error codes and request IDs', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const filter = new HttpExceptionFilter();
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      header: jest.fn(),
    };
    const request = {
      url: '/api/v1/customers',
      id: 'req-fastify',
      headers: { 'x-request-id': 'req-123' },
    };

    filter.catch(
      new HttpException(
        { code: 'RECEIPT_ALREADY_USED', message: 'Duplicate receipt' },
        409,
      ),
      {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => request,
        }),
      } as never,
    );

    expect(response.header).toHaveBeenCalledWith('X-Request-Id', 'req-123');
    expect(response.status).toHaveBeenCalledWith(409);
    const sendMock = response.send as unknown as {
      mock: { calls: unknown[][] };
    };
    const payload = sendMock.mock.calls[0]?.[0] as {
      success: false;
      error: { code: string; message: string; statusCode: number };
      meta: { requestId: string };
    };

    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('RECEIPT_ALREADY_USED');
    expect(payload.error.message).toBe('Duplicate receipt');
    expect(payload.error.statusCode).toBe(409);
    expect(payload.meta.requestId).toBe('req-123');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
