import * as Sentry from '@sentry/node';

export interface SentryInitOptions {
  runtime: 'api' | 'worker';
}

let initialized = false;

export function initializeSentryIfConfigured(
  env: NodeJS.ProcessEnv = process.env,
  options: SentryInitOptions = { runtime: 'api' },
): boolean {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn || initialized) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: env.NODE_ENV ?? 'development',
    release: env.RELEASE_SHA?.trim() || undefined,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-csrf-token'];
      }

      return event;
    },
  });

  Sentry.setTag('shopcity.runtime', options.runtime);
  Sentry.setTag('shopcity.release.version', env.RELEASE_VERSION ?? 'unknown');
  Sentry.setTag('shopcity.release.sha', env.RELEASE_SHA ?? 'dev');
  initialized = true;
  return true;
}

export function resetSentryInitializationForTests(): void {
  initialized = false;
}
