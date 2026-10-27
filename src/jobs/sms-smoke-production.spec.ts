import { EbulkSmsProvider } from './sms.provider';
import {
  createEbulkSmsProviderFromEnv,
  requireSmokeDestination,
} from '../../scripts/sms/smoke-production';

describe('SMS production smoke configuration', () => {
  const providerEnv: NodeJS.ProcessEnv = {
    SMS_PROVIDER_MODE: 'real',
    SMS_PROVIDER_URL: 'https://api.ebulksms.com:8443/sendsms.json',
    SMS_PROVIDER_USERNAME: 'smoke@example.test',
    SMS_PROVIDER_API_KEY: 'test-api-key',
    SMS_PROVIDER_SENDER_ID: 'ShopCity',
  };

  it('creates the eBulkSMS provider without unrelated application secrets', () => {
    expect(createEbulkSmsProviderFromEnv(providerEnv)).toBeInstanceOf(
      EbulkSmsProvider,
    );
  });

  it('rejects non-real mode and non-eBulkSMS endpoints', () => {
    expect(() =>
      createEbulkSmsProviderFromEnv({
        ...providerEnv,
        SMS_PROVIDER_MODE: 'sandbox',
      }),
    ).toThrow('SMS_PROVIDER_MODE=real is required');

    expect(() =>
      createEbulkSmsProviderFromEnv({
        ...providerEnv,
        SMS_PROVIDER_URL: 'https://attacker.example/sendsms.json',
      }),
    ).toThrow('HTTPS eBulkSMS /sendsms.json endpoint');
  });

  it('requires a valid international destination to exactly match the allowlist', () => {
    expect(
      requireSmokeDestination({
        SMS_SMOKE_DESTINATION_E164: '2348012345678',
        SMS_SMOKE_ALLOWED_DESTINATIONS: '2348012345678',
      }),
    ).toBe('2348012345678');

    expect(() =>
      requireSmokeDestination({
        SMS_SMOKE_DESTINATION_E164: '2348012345678',
        SMS_SMOKE_ALLOWED_DESTINATIONS: '2348098765432',
      }),
    ).toThrow('is not in the allowlist');

    expect(() =>
      requireSmokeDestination({
        SMS_SMOKE_DESTINATION_E164: '+2348012345678',
        SMS_SMOKE_ALLOWED_DESTINATIONS: '+2348012345678',
      }),
    ).toThrow('international digits without a plus sign');
  });
});
