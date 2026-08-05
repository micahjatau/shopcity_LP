import { randomUUID } from 'node:crypto';
import { createSmsProvider } from '../../src/jobs/sms.provider.factory';
import { buildTransactionReversedSmsPayload } from '../../src/jobs/sms.templates';

async function main() {
  requireApprovedSmoke();

  const destination = requireEnv('SMS_SMOKE_DESTINATION_E164');
  const allowedDestinations = requireEnv('SMS_SMOKE_ALLOWED_DESTINATIONS')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowedDestinations.includes(destination)) {
    throw new Error('SMS_SMOKE_DESTINATION_E164 is not in the allowlist');
  }

  const provider = createSmsProvider(process.env);
  const correlationId = randomUUID();
  const releaseSha =
    process.env.GITHUB_SHA ?? process.env.RELEASE_SHA ?? 'unknown';
  const sentAt = new Date().toISOString();

  const result = await provider.send({
    tenantId: 'sms-smoke',
    receiptId: null,
    outboxEventId: correlationId,
    phoneE164: destination,
    template: 'transaction-reversed',
    payload: buildTransactionReversedSmsPayload({
      transactionId: releaseSha,
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

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

void main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
