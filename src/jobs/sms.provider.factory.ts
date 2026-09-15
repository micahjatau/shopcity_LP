import { envValidationSchema } from '../config/env.validation';
import {
  DeterministicSmsProvider,
  EbulkSmsProvider,
  SandboxSmsProvider,
  type SmsProvider,
} from './sms.provider';

export function createSmsProvider(env = process.env): SmsProvider {
  const result = envValidationSchema.validate(env, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (result.error) {
    throw new Error(
      `Invalid SMS provider environment: ${result.error.message}`,
    );
  }

  const values = result.value as Record<string, unknown>;
  const mode = readString(values, 'SMS_PROVIDER_MODE', 'deterministic');
  const nodeEnv = readString(
    values,
    'NODE_ENV',
    process.env.NODE_ENV ?? 'development',
  );

  if (
    nodeEnv === 'production' &&
    (mode === 'deterministic' || mode === 'sandbox')
  ) {
    throw new Error(
      'Fake SMS providers are not allowed in production; use SMS_PROVIDER_MODE=real',
    );
  }

  switch (mode) {
    case 'real': {
      const url = readString(values, 'SMS_PROVIDER_URL').trim();
      const username = readString(values, 'SMS_PROVIDER_USERNAME').trim();
      const apiKey = readString(values, 'SMS_PROVIDER_API_KEY').trim();
      const senderId = readString(values, 'SMS_PROVIDER_SENDER_ID').trim();
      if (!url) {
        throw new Error('SMS_PROVIDER_URL is required for real SMS mode');
      }

      if (!username) {
        throw new Error('SMS_PROVIDER_USERNAME is required for real SMS mode');
      }

      if (!apiKey) {
        throw new Error('SMS_PROVIDER_API_KEY is required for real SMS mode');
      }

      if (!senderId) {
        throw new Error('SMS_PROVIDER_SENDER_ID is required for real SMS mode');
      }

      return new EbulkSmsProvider({
        url,
        username,
        apiKey,
        senderId,
        timeoutMs:
          typeof values.SMS_PROVIDER_TIMEOUT_MS === 'number'
            ? values.SMS_PROVIDER_TIMEOUT_MS
            : 10000,
        deliveryReportUrl:
          readString(values, 'SMS_PROVIDER_DLR_URL') || undefined,
      });
    }
    case 'sandbox':
      return new SandboxSmsProvider();
    case 'deterministic':
      return new DeterministicSmsProvider();
    default:
      throw new Error(`Unsupported SMS provider mode: ${mode}`);
  }
}

function readString(
  values: Record<string, unknown>,
  key: string,
  fallback = '',
): string {
  const value = values[key];

  return typeof value === 'string' ? value : fallback;
}
