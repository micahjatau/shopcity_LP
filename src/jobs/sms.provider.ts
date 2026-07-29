export type SmsDeliveryOutcome = 'SENT' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED';

export interface SmsSendInput {
  tenantId: string;
  receiptId: string | null;
  outboxEventId: string;
  phoneE164: string;
  template: string;
  payload: Record<string, unknown>;
}

export interface SmsSendResult {
  status: SmsDeliveryOutcome;
  providerMessageId?: string;
  errorMessage?: string;
  failureCategory?: 'retryable' | 'terminal';
}

export interface SmsProvider {
  send(input: SmsSendInput): Promise<SmsSendResult>;
}

export class DeterministicSmsProvider implements SmsProvider {
  send(input: SmsSendInput): Promise<SmsSendResult> {
    return Promise.resolve({
      status: 'DELIVERED',
      providerMessageId: `sms-${input.outboxEventId}`,
    });
  }
}

export class SandboxSmsProvider implements SmsProvider {
  send(input: SmsSendInput): Promise<SmsSendResult> {
    return Promise.resolve({
      status: 'SENT',
      providerMessageId: `sandbox-${input.outboxEventId}`,
    });
  }
}

export interface EbulkSmsProviderConfig {
  url: string;
  username: string;
  apiKey: string;
  senderId: string;
  timeoutMs: number;
}

export class EbulkSmsProvider implements SmsProvider {
  constructor(private readonly config: EbulkSmsProviderConfig) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    timeout.unref?.();

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': input.outboxEventId,
        },
        body: JSON.stringify(buildEbulkSmsRequest(this.config, input)),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          status: 'FAILED',
          errorMessage: `eBulkSMS request failed with ${response.status}`,
          failureCategory: classifyHttpFailure(response.status),
        };
      }

      const body = await parseResponseBody(response, controller.signal);
      return mapEbulkSmsResponse(body);
    } catch (error) {
      return {
        status: 'FAILED',
        errorMessage: isAbortError(error)
          ? `SMS provider request timed out after ${this.config.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : 'eBulkSMS request failed',
        failureCategory: 'retryable',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

type EbulkSmsRequest = {
  SMS: {
    auth: {
      username: string;
      apikey: string;
    };
    message: {
      sender: string;
      messagetext: string;
    };
    recipients: {
      gsm: Array<{
        msidn: string;
        msgid: string;
      }>;
    };
  };
};

function buildEbulkSmsRequest(
  config: EbulkSmsProviderConfig,
  input: SmsSendInput,
): EbulkSmsRequest {
  return {
    SMS: {
      auth: {
        username: config.username,
        apikey: config.apiKey,
      },
      message: {
        sender: config.senderId,
        messagetext: renderSmsMessage(input),
      },
      recipients: {
        gsm: [
          {
            msidn: input.phoneE164,
            msgid: input.outboxEventId,
          },
        ],
      },
    },
  };
}

function renderSmsMessage(input: SmsSendInput): string {
  if (input.template === 'earn-confirmed') {
    const creditKobo = readPayloadString(input.payload, 'creditKobo');
    const creditNaira = creditKobo
      ? formatKoboAsNaira(BigInt(creditKobo))
      : 'store credit';

    return `ShopCity: Your receipt ${input.receiptId} earned ${creditNaira}.`;
  }

  return `ShopCity notification for receipt ${input.receiptId}.`;
}

function readPayloadString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function formatKoboAsNaira(kobo: bigint): string {
  const naira = kobo / 100n;
  const remainder = kobo % 100n;

  return `NGN ${naira.toString()}.${remainder.toString().padStart(2, '0')}`;
}

function classifyHttpFailure(status: number): 'retryable' | 'terminal' {
  if (status === 429 || status >= 500) {
    return 'retryable';
  }

  return 'terminal';
}

async function parseResponseBody(
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  try {
    return await Promise.race([
      response.json() as Promise<unknown>,
      new Promise<never>((_resolve, reject) => {
        if (signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
    ]);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return undefined;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error ||
      (typeof DOMException !== 'undefined' && error instanceof DOMException)) &&
    error.name === 'AbortError'
  );
}

function mapEbulkSmsResponse(body: unknown): SmsSendResult {
  if (!body || typeof body !== 'object') {
    return invalidProviderResponse();
  }

  const response = (body as { response?: unknown }).response;
  if (!response || typeof response !== 'object') {
    return invalidProviderResponse();
  }

  const status = (response as { status?: unknown }).status;
  if (typeof status !== 'string') {
    return invalidProviderResponse();
  }

  const providerMessageId =
    readResponseString(response, 'batch_id') ??
    readResponseString(response, 'msgid') ??
    readResponseString(response, 'message_id');
  const errorMessage =
    readResponseString(response, 'message') ??
    readResponseString(response, 'error');

  switch (status.toUpperCase()) {
    case 'SUCCESS':
      return {
        status: 'SENT',
        providerMessageId,
      };
    case 'INSUFFICIENT_CREDIT':
    case 'RATE_LIMITED':
    case 'SERVER_ERROR':
    case 'TEMPORARY_ERROR':
      return {
        status: 'FAILED',
        providerMessageId,
        errorMessage: errorMessage ?? `eBulkSMS returned ${status}`,
        failureCategory: 'retryable',
      };
    case 'AUTH_FAILURE':
    case 'INVALID_RECIPIENT':
    case 'INVALID_SENDER':
    case 'BAD_REQUEST':
    case 'INVALID_MESSAGE':
      return {
        status: 'FAILED',
        providerMessageId,
        errorMessage: errorMessage ?? `eBulkSMS returned ${status}`,
        failureCategory: 'terminal',
      };
    default:
      return invalidProviderResponse();
  }
}

function readResponseString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' && field.trim() ? field.trim() : undefined;
}

function invalidProviderResponse(): SmsSendResult {
  return {
    status: 'FAILED',
    errorMessage: 'eBulkSMS returned an invalid response payload',
    failureCategory: 'terminal',
  };
}

export class ScriptedSmsProvider implements SmsProvider {
  constructor(
    private readonly script: (
      input: SmsSendInput,
    ) => Promise<SmsSendResult> | SmsSendResult,
  ) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    return this.script(input);
  }
}
