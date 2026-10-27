import { envValidationSchema } from '../config/env.validation';
import {
  AfricaTalkingSmsProvider,
  ArkeselSmsProvider,
  DeterministicSmsProvider,
  EbulkSmsProvider,
  SandboxSmsProvider,
  TwilioSmsProvider,
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
  const vendor = readString(values, 'SMS_PROVIDER_VENDOR', 'ebulksms');
  const nodeEnv = readString(
    values,
    'NODE_ENV',
    process.env.NODE_ENV ?? 'development',
  );
  const arkeselSandbox = values.ARKESEL_SANDBOX === true;
  const africastalkingSandbox = values.AFRICASTALKING_SANDBOX === true;

  if (
    nodeEnv === 'production' &&
    (mode === 'deterministic' || mode === 'sandbox')
  ) {
    throw new Error(
      'Fake SMS providers are not allowed in production; use SMS_PROVIDER_MODE=real',
    );
  }

  if (nodeEnv === 'production' && arkeselSandbox) {
    throw new Error('Arkesel sandbox is not allowed in production');
  }

  if (nodeEnv === 'production' && africastalkingSandbox) {
    throw new Error("Africa's Talking sandbox is not allowed in production");
  }

  switch (mode) {
    case 'real': {
      const timeoutMs =
        typeof values.SMS_PROVIDER_TIMEOUT_MS === 'number'
          ? values.SMS_PROVIDER_TIMEOUT_MS
          : 10000;

      if (vendor === 'africastalking') {
        const apiKey = readString(
          values,
          africastalkingSandbox
            ? 'AFRICASTALKING_SANDBOX_API_KEY'
            : 'AFRICASTALKING_LIVE_API_KEY',
        ).trim();
        const username = africastalkingSandbox
          ? 'sandbox'
          : readString(values, 'AFRICASTALKING_LIVE_USERNAME').trim();
        const senderId = readString(values, 'AFRICASTALKING_SENDER_ID').trim();
        if (!apiKey) {
          throw new Error(
            `AFRICASTALKING_${africastalkingSandbox ? 'SANDBOX' : 'LIVE'}_API_KEY is required for real Africa's Talking mode`,
          );
        }
        if (!username) {
          throw new Error(
            "AFRICASTALKING_LIVE_USERNAME is required for live Africa's Talking mode",
          );
        }
        if (!africastalkingSandbox && !senderId) {
          throw new Error(
            "AFRICASTALKING_SENDER_ID is required for live Africa's Talking mode",
          );
        }

        return new AfricaTalkingSmsProvider({
          endpoint: africastalkingSandbox
            ? 'https://api.sandbox.africastalking.com/version1/messaging'
            : 'https://api.africastalking.com/version1/messaging',
          username,
          apiKey,
          senderId: senderId || undefined,
          timeoutMs,
        });
      }

      if (vendor === 'twilio') {
        const accountSid = readString(values, 'TWILIO_ACCOUNT_SID').trim();
        const apiKey = readString(values, 'TWILIO_API_KEY').trim();
        const apiSecret = readString(values, 'TWILIO_API_SECRET').trim();
        const fromNumber = readString(values, 'TWILIO_FROM_NUMBER').trim();
        const messagingServiceSid = readString(
          values,
          'TWILIO_MESSAGING_SERVICE_SID',
        ).trim();
        if (!accountSid || !apiKey || !apiSecret) {
          throw new Error(
            'TWILIO_ACCOUNT_SID, TWILIO_API_KEY, and TWILIO_API_SECRET are required for real Twilio mode',
          );
        }
        if (Boolean(fromNumber) === Boolean(messagingServiceSid)) {
          throw new Error(
            'Configure exactly one of TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID for real Twilio mode',
          );
        }

        return new TwilioSmsProvider({
          accountSid,
          apiKey,
          apiSecret,
          fromNumber: fromNumber || undefined,
          messagingServiceSid: messagingServiceSid || undefined,
          timeoutMs,
        });
      }

      if (vendor === 'arkesel') {
        const apiKey = readString(values, 'ARKESEL_API_KEY').trim();
        const senderId = readString(values, 'ARKESEL_SENDER_ID').trim();
        if (!apiKey) {
          throw new Error('ARKESEL_API_KEY is required for real Arkesel mode');
        }
        if (!senderId) {
          throw new Error(
            'ARKESEL_SENDER_ID is required for real Arkesel mode',
          );
        }

        return new ArkeselSmsProvider({
          baseUrl: readString(
            values,
            'ARKESEL_API_URL',
            'https://sms.arkesel.com/api/v2',
          ).replace(/\/+$/, ''),
          apiKey,
          senderId,
          sandbox: arkeselSandbox,
          timeoutMs,
        });
      }

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
        timeoutMs,
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
