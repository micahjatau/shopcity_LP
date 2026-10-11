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
import { SKIP_RESPONSE_ENVELOPE_KEY } from './skip-response-envelope.decorator';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const requestId = resolveRequestId(request);
    setRequestIdHeader(reply, requestId);

    if (Reflect.getMetadata(SKIP_RESPONSE_ENVELOPE_KEY, context.getHandler())) {
      return next.handle();
    }

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
