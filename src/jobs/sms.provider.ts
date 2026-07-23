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
}

export interface SmsProvider {
  send(input: SmsSendInput): Promise<SmsSendResult>;
}

export class DeterministicSmsProvider implements SmsProvider {
  async send(input: SmsSendInput): Promise<SmsSendResult> {
    return {
      status: 'DELIVERED',
      providerMessageId: `sms-${input.outboxEventId}`,
    };
  }
}

export class SandboxSmsProvider implements SmsProvider {
  async send(input: SmsSendInput): Promise<SmsSendResult> {
    return {
      status: 'SENT',
      providerMessageId: `sandbox-${input.outboxEventId}`,
    };
  }
}

export interface RealSmsProviderConfig {
  url: string;
  token?: string;
}

export class RealSmsProvider implements SmsProvider {
  constructor(private readonly config: RealSmsProviderConfig) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.config.token
          ? { authorization: `Bearer ${this.config.token}` }
          : {}),
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return {
        status: 'FAILED',
        errorMessage: `SMS provider request failed with ${response.status}`,
      };
    }

    const body = (await response.json()) as Partial<SmsSendResult> & {
      providerMessageId?: string;
      errorMessage?: string;
    };

    return {
      status: body.status ?? 'SENT',
      providerMessageId: body.providerMessageId,
      errorMessage: body.errorMessage,
    };
  }
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
