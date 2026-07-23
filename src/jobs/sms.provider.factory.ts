import { envValidationSchema } from '../config/env.validation';
import {
  DeterministicSmsProvider,
  RealSmsProvider,
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

  if (nodeEnv === 'production' && mode === 'deterministic') {
    throw new Error('Deterministic SMS provider is not allowed in production');
  }

  switch (mode) {
    case 'real': {
      const url = readString(values, 'SMS_PROVIDER_URL').trim();
      if (!url) {
        throw new Error('SMS_PROVIDER_URL is required for real SMS mode');
      }

      return new RealSmsProvider({
        url,
        token: readString(values, 'SMS_PROVIDER_TOKEN').trim() || undefined,
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
