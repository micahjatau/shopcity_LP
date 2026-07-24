export type SmsDeliveryOutcome = 'SENT' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED';

export interface SmsSendInput {
  tenantId: string;
  receiptId: string;
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

export interface RealSmsProviderConfig {
  url: string;
  token?: string;
  timeoutMs: number;
}

export class RealSmsProvider implements SmsProvider {
  constructor(private readonly config: RealSmsProviderConfig) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    timeout.unref?.();

    let response: Response;

    try {
      response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': input.outboxEventId,
          ...(this.config.token
            ? { authorization: `Bearer ${this.config.token}` }
            : {}),
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } catch (error) {
      return {
        status: 'FAILED',
        errorMessage:
          error instanceof Error && error.name === 'AbortError'
            ? `SMS provider request timed out after ${this.config.timeoutMs}ms`
            : error instanceof Error
              ? error.message
              : 'SMS provider request failed',
        failureCategory: 'retryable',
      };
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return {
        status: 'FAILED',
        errorMessage: `SMS provider request failed with ${response.status}`,
        failureCategory: classifyHttpFailure(response.status),
      };
    }

    const body = await parseResponseBody(response);

    if (!isSmsSendResultBody(body)) {
      return {
        status: 'FAILED',
        errorMessage: 'SMS provider returned an invalid response payload',
        failureCategory: 'terminal',
      };
    }

    if (body.status === 'FAILED') {
      return {
        status: 'FAILED',
        providerMessageId: body.providerMessageId,
        errorMessage: body.errorMessage,
        failureCategory: body.failureCategory ?? 'terminal',
      };
    }

    return {
      status: body.status,
      providerMessageId: body.providerMessageId,
      errorMessage: body.errorMessage,
    };
  }
}

function classifyHttpFailure(status: number): 'retryable' | 'terminal' {
  if (status === 429 || status >= 500) {
    return 'retryable';
  }

  return 'terminal';
}

async function parseResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isSmsSendResultBody(
  value: unknown,
): value is Partial<SmsSendResult> & { status: SmsDeliveryOutcome } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const status = (value as { status?: unknown }).status;
  return (
    status === 'SENT' ||
    status === 'DELIVERED' ||
    status === 'FAILED' ||
    status === 'SUPPRESSED'
  );
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
