import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { map, Observable } from 'rxjs';
import { ApiSuccessResponse, isApiEnvelope } from '../types/api-contract';
import { resolveRequestId, setRequestIdHeader } from '../request-context';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const requestId = resolveRequestId(request);
    setRequestIdHeader(reply, requestId);

    return next.handle().pipe(
      map((data: unknown) => {
        if (isApiEnvelope(data)) {
          return data;
        }

        const wrapped: ApiSuccessResponse<unknown> = {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId,
          },
        };

        return wrapped;
      }),
    );
  }
}
