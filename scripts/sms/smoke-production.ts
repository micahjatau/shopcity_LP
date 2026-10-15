import { randomUUID } from 'node:crypto';
import { EbulkSmsProvider } from '../../src/jobs/sms.provider';
import { buildTransactionReversedSmsPayload } from '../../src/jobs/sms.templates';

async function main() {
  requireApprovedSmoke();

  const destination = requireSmokeDestination();
  const provider = createEbulkSmsProviderFromEnv();
  const correlationId = randomUUID();
  const releaseSha =
    process.env.GITHUB_SHA?.trim() ||
    process.env.RELEASE_SHA?.trim() ||
    'unknown';
  const sentAt = new Date().toISOString();

  const result = await provider.send({
    tenantId: 'sms-smoke',
    receiptId: null,
    outboxEventId: correlationId,
    phoneE164: destination,
    template: 'transaction-reversed',
    payload: buildTransactionReversedSmsPayload({
      transactionId: `SMS-SMOKE-${correlationId.slice(0, 8)}`,
      phoneE164: destination,
    }),
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        releaseSha,
        provider: 'ebulksms',
        destinationSuffix: destination.slice(-4),
        correlationId,
        providerMessageId: result.providerMessageId ?? null,
        submittedAt: sentAt,
        outcome: result.status,
      },
      null,
      2,
    )}\n`,
  );
}

function requireApprovedSmoke() {
  if (process.env.SMS_SMOKE_APPROVED !== 'true') {
    throw new Error('SMS_SMOKE_APPROVED=true is required');
  }

  if (process.env.SMS_PROVIDER_MODE !== 'real') {
    throw new Error('SMS_PROVIDER_MODE=real is required');
  }
}

export function requireSmokeDestination(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const destination = requireEnv('SMS_SMOKE_DESTINATION_E164', env);
  const allowedDestinations = requireEnv('SMS_SMOKE_ALLOWED_DESTINATIONS', env)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!/^\d{11,15}$/.test(destination)) {
    throw new Error(
      'SMS_SMOKE_DESTINATION_E164 must use international digits without a plus sign',
    );
  }

  if (!allowedDestinations.includes(destination)) {
    throw new Error('SMS_SMOKE_DESTINATION_E164 is not in the allowlist');
  }

  return destination;
}

export function createEbulkSmsProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): EbulkSmsProvider {
  if (env.SMS_PROVIDER_MODE?.trim() !== 'real') {
    throw new Error('SMS_PROVIDER_MODE=real is required');
  }

  const urlValue = requireEnv('SMS_PROVIDER_URL', env);
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error('SMS_PROVIDER_URL must be a valid eBulkSMS URL');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'api.ebulksms.com' ||
    url.pathname !== '/sendsms.json' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'SMS_PROVIDER_URL must be the HTTPS eBulkSMS /sendsms.json endpoint',
    );
  }

  const senderId = requireEnv('SMS_PROVIDER_SENDER_ID', env);
  const senderLength = [...senderId].length;
  const maxSenderLength = /^\d+$/.test(senderId) ? 14 : 11;
  if (senderLength > maxSenderLength) {
    throw new Error('SMS_PROVIDER_SENDER_ID exceeds eBulkSMS length limits');
  }

  const timeoutSetting = env.SMS_PROVIDER_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutSetting ? Number(timeoutSetting) : 10000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    throw new Error('SMS_PROVIDER_TIMEOUT_MS must be between 1000 and 60000');
  }

  return new EbulkSmsProvider({
    url: urlValue,
    username: requireEnv('SMS_PROVIDER_USERNAME', env),
    apiKey: requireEnv('SMS_PROVIDER_API_KEY', env),
    senderId,
    timeoutMs,
  });
}

function requireEnv(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

if (require.main === module) {
  void main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
