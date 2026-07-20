import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestThrottleService } from './request-throttle.service';
import { AuthenticatedRequest } from '../auth/session.types';
import { THROTTLE_KEY } from './throttle.constants';
import { ThrottleOptions } from './throttle.decorator';

@Injectable()
export class RequestThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly throttleService: RequestThrottleService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<
      ThrottleOptions | undefined
    >(THROTTLE_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = `${options.bucket}:${this.resolveKey(request, options)}`;
    const result = this.throttleService.consume(
      key,
      options.limit,
      options.windowMs,
    );

    if (!result.allowed) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private resolveKey(
    request: AuthenticatedRequest,
    options: ThrottleOptions,
  ): string {
    if (options.keyFactory) {
      return options.keyFactory(request);
    }

    return request.ip || 'unknown';
  }
}
