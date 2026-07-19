import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiErrorResponse } from '../types/api-contract';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<FastifyReply>();
    const request = context.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? (body as { message?: string | string[] }).message
        : typeof body === 'string'
          ? body
          : 'Internal server error';
    const details =
      typeof body === 'object' && body !== null ? body : undefined;
    const error: ApiErrorResponse = {
      success: false,
      error: {
        statusCode: status,
        code: errorCodeFromStatus(status),
        message: Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'Internal server error'),
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    this.logger.error(exception);

    void response.status(status).send(error);
  }
}

function errorCodeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'AUTH_REQUIRED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    default:
      return status >= 500 ? 'SYSTEM_ERROR' : `HTTP_${status}`;
  }
}
