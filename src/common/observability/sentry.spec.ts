jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  setTag: jest.fn(),
}));

import * as Sentry from '@sentry/node';
import {
  initializeSentryIfConfigured,
  resetSentryInitializationForTests,
} from './sentry';

describe('initializeSentryIfConfigured', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetSentryInitializationForTests();
  });

  it('skips initialization when no DSN is configured', () => {
    expect(initializeSentryIfConfigured({}, { runtime: 'api' })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initializes once when a DSN is configured', () => {
    expect(
      initializeSentryIfConfigured(
        {
          SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/1',
          RELEASE_SHA: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          RELEASE_VERSION: '1.2.3',
        },
        { runtime: 'worker' },
      ),
    ).toBe(true);

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.setTag).toHaveBeenCalledWith('shopcity.runtime', 'worker');
    expect(Sentry.setTag).toHaveBeenCalledWith(
      'shopcity.release.version',
      '1.2.3',
    );
    expect(Sentry.setTag).toHaveBeenCalledWith(
      'shopcity.release.sha',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );

    expect(
      initializeSentryIfConfigured(
        { SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/1' },
        { runtime: 'api' },
      ),
    ).toBe(false);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
  });

  it('fails open when Sentry initialization throws', () => {
    jest.spyOn(Sentry, 'init').mockImplementation(() => {
      throw new Error('boom');
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(
      initializeSentryIfConfigured(
        { SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/1' },
        { runtime: 'api' },
      ),
    ).toBe(false);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Sentry initialization failed; continuing startup.',
      ),
    );
    expect(Sentry.setTag).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
