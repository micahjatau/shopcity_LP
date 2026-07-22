export type SmsDeliveryOutcome =
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'SUPPRESSED';

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
