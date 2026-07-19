import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { ApiSuccessResponse, isApiEnvelope } from '../types/api-contract';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

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
          },
        };

        return wrapped;
      }),
    );
  }
}
