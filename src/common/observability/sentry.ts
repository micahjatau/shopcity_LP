import * as Sentry from '@sentry/node';

export interface SentryInitOptions {
  runtime: 'api' | 'worker';
}

type SanitizableSentryEvent = {
  request?: { headers?: Record<string, string | undefined> };
};

type SentryRuntime = {
  init(options: Sentry.NodeOptions): unknown;
  setTag(key: string, value: string): void;
};

const sentry = Sentry as unknown as SentryRuntime;
let initialized = false;

export function initializeSentryIfConfigured(
  env: NodeJS.ProcessEnv = process.env,
  options: SentryInitOptions = { runtime: 'api' },
): boolean {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn || initialized) {
    return false;
  }

  try {
    const sentryOptions = {
      dsn,
      environment: env.NODE_ENV ?? 'development',
      release: env.RELEASE_SHA?.trim() || undefined,
      sendDefaultPii: false,
      beforeSend(event: SanitizableSentryEvent): SanitizableSentryEvent {
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers['x-csrf-token'];
        }

        return event;
      },
    };
    // Sentry's Node v10 declaration currently narrows init() to
    // BaseNodeOptions even though runtime accepts the documented DSN option.
    sentry.init(sentryOptions as unknown as Sentry.NodeOptions);

    sentry.setTag('shopcity.runtime', options.runtime);
    sentry.setTag('shopcity.release.version', env.RELEASE_VERSION ?? 'unknown');
    sentry.setTag('shopcity.release.sha', env.RELEASE_SHA ?? 'dev');
    initialized = true;
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.warn(
      `Sentry initialization failed; continuing startup. ${message}`,
    );
    return false;
  }
}

export function resetSentryInitializationForTests(): void {
  initialized = false;
}
