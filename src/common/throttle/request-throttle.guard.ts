import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestThrottleService } from './request-throttle.service';
import { AuthenticatedRequest } from '../auth/session.types';
import { DomainHttpException } from '../errors/domain.exception';
import { THROTTLE_KEY } from './throttle.constants';
import { ThrottleOptions } from './throttle.decorator';

@Injectable()
export class RequestThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly throttleService: RequestThrottleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<
      ThrottleOptions | undefined
    >(THROTTLE_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const keys = this.resolveKeys(request, options);
    const results = await Promise.all(
      keys.map((key) =>
        this.throttleService.consume(
          `${options.bucket}:${key}`,
          options.limit,
          options.windowMs,
        ),
      ),
    );

    if (results.some((result) => !result.allowed)) {
      throw new DomainHttpException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMITED',
        'Too many requests',
      );
    }

    return true;
  }

  private resolveKeys(
    request: AuthenticatedRequest,
    options: ThrottleOptions,
  ): string[] {
    if (options.keyFactory) {
      const value = options.keyFactory(request);
      return Array.isArray(value) ? value : [value];
    }

    return [request.ip || 'unknown'];
  }
}
