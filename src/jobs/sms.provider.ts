import twilio from 'twilio';
import {
  SmsPayloadError,
  type SmsTemplate,
  renderSmsMessage,
} from './sms.templates';

export type SmsDeliveryOutcome = 'SENT' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED';

export interface SmsSendInput {
  tenantId: string;
  receiptId: string | null;
  outboxEventId: string;
  phoneE164: string;
  template: SmsTemplate;
  payload: Record<string, unknown>;
}

export interface SmsSendResult {
  status: SmsDeliveryOutcome;
  providerMessageId?: string;
  errorMessage?: string;
  failureCategory?: 'retryable' | 'terminal';
}

export interface SmsDeliveryReport {
  status: Extract<SmsDeliveryOutcome, 'SENT' | 'DELIVERED' | 'FAILED'>;
  providerMessageId: string;
  occurredAt?: Date;
}

export interface SmsProvider {
  readonly requiresLocalSubmissionReservation?: boolean;
  readonly submissionReservationWindowMs?: number;
  send(input: SmsSendInput): Promise<SmsSendResult>;
  getDeliveryReport?(
    providerMessageId: string,
  ): Promise<SmsDeliveryReport | null>;
}

export interface TwilioSmsProviderConfig {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  fromNumber?: string;
  messagingServiceSid?: string;
  timeoutMs: number;
}

interface TwilioSmsCreateParams {
  to: string;
  body: string;
  from?: string;
  messagingServiceSid?: string;
}

interface TwilioSmsClient {
  messages: {
    create(params: TwilioSmsCreateParams): Promise<{ sid?: unknown }>;
  };
}

type TwilioSdkError = {
  status?: unknown;
  code?: unknown;
};

export class TwilioSmsProvider implements SmsProvider {
  readonly requiresLocalSubmissionReservation = true;
  private readonly client: TwilioSmsClient;

  get submissionReservationWindowMs(): number {
    return this.config.timeoutMs + 5_000;
  }

  constructor(
    private readonly config: TwilioSmsProviderConfig,
    client?: TwilioSmsClient,
  ) {
    this.client =
      client ??
      twilio(config.apiKey, config.apiSecret, {
        accountSid: config.accountSid,
        timeout: config.timeoutMs,
        autoRetry: false,
      });
  }

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    if (!/^\+[1-9]\d{7,14}$/.test(input.phoneE164)) {
      return {
        status: 'FAILED',
        errorMessage: 'Twilio recipient must be a valid E.164 phone number',
        failureCategory: 'terminal',
      };
    }

    let body: string;
    try {
      body = renderSmsMessage(input);
    } catch (error) {
      return {
        status: 'FAILED',
        errorMessage:
          error instanceof SmsPayloadError
            ? 'Twilio SMS payload is invalid'
            : 'Twilio SMS payload could not be rendered',
        failureCategory: 'terminal',
      };
    }

    const params: TwilioSmsCreateParams = {
      to: input.phoneE164,
      body,
      ...(this.config.fromNumber
        ? { from: this.config.fromNumber }
        : { messagingServiceSid: this.config.messagingServiceSid }),
    };

    try {
      const response = await this.client.messages.create(params);
      const providerMessageId =
        typeof response.sid === 'string' ? response.sid.trim() : '';
      if (!providerMessageId) {
        return {
          status: 'FAILED',
          errorMessage:
            'Twilio returned no message SID; verify provider history before retry',
          failureCategory: 'terminal',
        };
      }

      return { status: 'SENT', providerMessageId };
    } catch (error) {
      const providerError = asTwilioSdkError(error);
      const status =
        typeof providerError.status === 'number' ? providerError.status : null;
      const code =
        typeof providerError.code === 'number' ? providerError.code : null;
      const codeSuffix = code === null ? '' : `, code ${code}`;

      if (status === 429) {
        return {
          status: 'FAILED',
          errorMessage: `Twilio rate limited the request (HTTP 429${codeSuffix})`,
          failureCategory: 'retryable',
        };
      }

      if (status !== null) {
        const ambiguous = status >= 500;
        return {
          status: 'FAILED',
          errorMessage: ambiguous
            ? `Twilio outcome is unknown (HTTP ${status}${codeSuffix}); verify provider history before retry`
            : `Twilio rejected the request (HTTP ${status}${codeSuffix})`,
          failureCategory: 'terminal',
        };
      }

      return {
        status: 'FAILED',
        errorMessage:
          'Twilio outcome is unknown; verify provider history before retry',
        failureCategory: 'terminal',
      };
    }
  }
}

function asTwilioSdkError(error: unknown): TwilioSdkError {
  if (error && typeof error === 'object') {
    return error;
  }

  return {};
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
  deliveryReportUrl?: string;
}

export class EbulkSmsProvider implements SmsProvider {
  constructor(private readonly config: EbulkSmsProviderConfig) {}

  async getDeliveryReport(
    providerMessageId: string,
  ): Promise<SmsDeliveryReport | null> {
    const endpoint =
      this.config.deliveryReportUrl ?? deriveDeliveryReportUrl(this.config.url);
    const url = new URL(endpoint);
    url.searchParams.set('username', this.config.username);
    url.searchParams.set('apikey', this.config.apiKey);
    url.searchParams.set('uniqueid', providerMessageId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    timeout.unref?.();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/xml, text/xml' },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return parseEbulkDeliveryReport(await response.text(), providerMessageId);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

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
          : error instanceof SmsPayloadError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'eBulkSMS request failed',
        failureCategory:
          error instanceof SmsPayloadError ? 'terminal' : 'retryable',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export interface ArkeselSmsProviderConfig {
  baseUrl: string;
  apiKey: string;
  senderId: string;
  timeoutMs: number;
  sandbox: boolean;
}

export interface AfricaTalkingSmsProviderConfig {
  endpoint: string;
  username: string;
  apiKey: string;
  senderId?: string;
  timeoutMs: number;
}

export class ArkeselSmsProvider implements SmsProvider {
  constructor(private readonly config: ArkeselSmsProviderConfig) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    const recipient = normalizeArkeselRecipient(input.phoneE164);
    if (!recipient) {
      return {
        status: 'FAILED',
        errorMessage: 'Arkesel recipient must be a valid E.164 phone number',
        failureCategory: 'terminal',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    timeout.unref?.();

    try {
      const response = await fetch(`${this.config.baseUrl}/sms/send`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': this.config.apiKey,
          'idempotency-key': input.outboxEventId,
        },
        body: JSON.stringify({
          sender: this.config.senderId,
          recipients: [[recipient]],
          message: renderSmsMessage(input),
          use_case: 'transactional',
          sandbox: this.config.sandbox,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          status: 'FAILED',
          errorMessage: `Arkesel request failed with ${response.status}`,
          failureCategory: classifyHttpFailure(response.status),
        };
      }

      const body = await parseResponseBody(response, controller.signal);
      return mapArkeselSmsResponse(body, recipient);
    } catch (error) {
      return {
        status: 'FAILED',
        errorMessage: isAbortError(error)
          ? `SMS provider request timed out after ${this.config.timeoutMs}ms`
          : error instanceof SmsPayloadError
            ? 'Arkesel request payload is invalid'
            : 'Arkesel request failed',
        failureCategory:
          error instanceof SmsPayloadError ? 'terminal' : 'retryable',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async getDeliveryReport(
    providerMessageId: string,
  ): Promise<SmsDeliveryReport | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    timeout.unref?.();

    try {
      const response = await fetch(
        `${this.config.baseUrl}/sms/message-reports`,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'api-key': this.config.apiKey,
          },
          body: JSON.stringify({ msg_ids: [providerMessageId] }),
          signal: controller.signal,
        },
      );
      if (!response.ok) return null;
      return mapArkeselDeliveryReport(
        await parseResponseBody(response, controller.signal),
        providerMessageId,
      );
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class AfricaTalkingSmsProvider implements SmsProvider {
  constructor(private readonly config: AfricaTalkingSmsProviderConfig) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    if (!/^\+[1-9]\d{7,14}$/.test(input.phoneE164)) {
      return {
        status: 'FAILED',
        errorMessage:
          "Africa's Talking recipient must be a valid E.164 phone number",
        failureCategory: 'terminal',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    timeout.unref?.();

    try {
      const form = new URLSearchParams({
        username: this.config.username,
        to: input.phoneE164,
        message: renderSmsMessage(input),
        ...(this.config.senderId ? { from: this.config.senderId } : {}),
      });
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
          apiKey: this.config.apiKey,
        },
        body: form.toString(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const outcomeUnknown = response.status >= 500;
        return {
          status: 'FAILED',
          errorMessage: outcomeUnknown
            ? `Africa's Talking outcome is unknown (HTTP ${response.status}); verify provider history before retry`
            : `Africa's Talking request failed with ${response.status}`,
          failureCategory: response.status === 429 ? 'retryable' : 'terminal',
        };
      }

      return mapAfricaTalkingSmsResponse(
        await parseResponseBody(response, controller.signal),
        input.phoneE164,
      );
    } catch (error) {
      return {
        status: 'FAILED',
        errorMessage:
          error instanceof SmsPayloadError
            ? "Africa's Talking request payload is invalid"
            : isAbortError(error)
              ? "Africa's Talking request timed out; verify provider history before retry"
              : "Africa's Talking outcome is unknown; verify provider history before retry",
        failureCategory: 'terminal',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeArkeselRecipient(phoneE164: string): string | null {
  if (!/^\+[1-9]\d{7,14}$/.test(phoneE164)) return null;
  return phoneE164.slice(1);
}

function mapArkeselSmsResponse(
  body: unknown,
  recipient: string,
): SmsSendResult {
  if (readResponseString(body, 'status')?.toLowerCase() !== 'success') {
    return {
      status: 'FAILED',
      errorMessage: 'Arkesel returned an unsuccessful response',
      failureCategory: 'terminal',
    };
  }

  const reports = readResponseArray(body, 'data').filter(
    (value): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value),
  );
  const matchingReport = reports.find(
    (report) =>
      normalizeResponseRecipient(readResponseString(report, 'recipient')) ===
      recipient,
  );
  const singleReportWithoutRecipient =
    reports.length === 1 && !readResponseString(reports[0], 'recipient')
      ? reports[0]
      : undefined;
  const recipientReport = matchingReport ?? singleReportWithoutRecipient;
  const providerMessageId = readResponseString(recipientReport, 'id');
  if (!providerMessageId) {
    return {
      status: 'FAILED',
      errorMessage:
        'Arkesel accepted the send without a trackable message ID; verify provider history before retry',
      failureCategory: 'terminal',
    };
  }

  return { status: 'SENT', providerMessageId };
}

function mapArkeselDeliveryReport(
  body: unknown,
  requestedMessageId: string,
): SmsDeliveryReport | null {
  const data = readResponseObject(body, 'data');
  const report = data?.[requestedMessageId];
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return null;
  }

  const reportId = readResponseString(report, 'id');
  if (reportId && reportId !== requestedMessageId) return null;
  const status = readResponseString(report, 'status')?.toUpperCase();
  const normalizedStatus =
    status === 'DELIVERED'
      ? 'DELIVERED'
      : status === 'SUBMITTED' || status === 'QUEUED'
        ? 'SENT'
        : status === 'NOT_DELIVERED' ||
            status === 'PROHIBITED' ||
            status === 'EXPIRED'
          ? 'FAILED'
          : null;
  if (!normalizedStatus) return null;

  return {
    status: normalizedStatus,
    providerMessageId: requestedMessageId,
  };
}

function mapAfricaTalkingSmsResponse(
  body: unknown,
  recipient: string,
): SmsSendResult {
  const messageData = readResponseObject(body, 'SMSMessageData');
  const expectedRecipient = normalizeResponseRecipient(recipient);
  const matchingRecipient = readResponseArray(messageData, 'Recipients').find(
    (value): value is Record<string, unknown> =>
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      normalizeResponseRecipient(readResponseString(value, 'number')) ===
        expectedRecipient,
  );
  const statusCode = readResponseNumber(matchingRecipient, 'statusCode');
  if (statusCode === undefined) {
    return invalidAfricaTalkingResponse();
  }

  if (statusCode === 100 || statusCode === 101 || statusCode === 102) {
    const providerMessageId = readResponseString(
      matchingRecipient,
      'messageId',
    );
    return {
      status: 'SENT',
      ...(providerMessageId ? { providerMessageId } : {}),
    };
  }

  return {
    status: 'FAILED',
    errorMessage: `Africa's Talking rejected SMS with status ${statusCode}`,
    failureCategory: 'terminal',
  };
}

function invalidAfricaTalkingResponse(): SmsSendResult {
  return {
    status: 'FAILED',
    errorMessage: "Africa's Talking returned an invalid response payload",
    failureCategory: 'terminal',
  };
}

function normalizeResponseRecipient(value: string | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/^\+/, '');
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

function readResponseArray(value: unknown, key: string): unknown[] {
  if (!value || typeof value !== 'object') return [];
  const field = (value as Record<string, unknown>)[key];
  return Array.isArray(field) ? field : [];
}

function readResponseObject(
  value: unknown,
  key: string,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const field = (value as Record<string, unknown>)[key];
  return field && typeof field === 'object' && !Array.isArray(field)
    ? (field as Record<string, unknown>)
    : undefined;
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

function deriveDeliveryReportUrl(sendUrl: string): string {
  const url = new URL(sendUrl);
  return `${url.origin}/getdlr.xml`;
}

function parseEbulkDeliveryReport(
  body: string,
  fallbackMessageId: string,
): SmsDeliveryReport | null {
  const status = readXmlTag(body, 'status')?.toUpperCase();
  if (!status) return null;
  const providerMessageId =
    readXmlTag(body, 'uniqueid') ??
    readXmlTag(body, 'msgid') ??
    fallbackMessageId;
  const normalizedStatus =
    status === 'DELIVERED' || status === 'SUCCESS'
      ? 'DELIVERED'
      : status === 'FAILED' || status === 'DROPPED' || status === 'EXPIRED'
        ? 'FAILED'
        : status === 'SENT'
          ? 'SENT'
          : null;
  if (!normalizedStatus) return null;
  const timestamp =
    readXmlTag(body, 'deliverytime') ?? readXmlTag(body, 'sendtime');
  const occurredAt = timestamp ? new Date(timestamp) : undefined;
  return {
    status: normalizedStatus,
    providerMessageId,
    ...(occurredAt && !Number.isNaN(occurredAt.getTime())
      ? { occurredAt }
      : {}),
  };
}

function readXmlTag(body: string, tag: string): string | undefined {
  const match =
    tag === 'uniqueid'
      ? body.match(/<uniqueid\b[^>]*>([^<]*)<\/uniqueid>/i)
      : tag === 'status'
        ? body.match(/<status\b[^>]*>([^<]*)<\/status>/i)
        : tag === 'deliverytime'
          ? body.match(/<deliverytime\b[^>]*>([^<]*)<\/deliverytime>/i)
          : tag === 'sendtime'
            ? body.match(/<sendtime\b[^>]*>([^<]*)<\/sendtime>/i)
            : null;
  const value = match?.[1]?.trim();
  return value || undefined;
}

function readResponseNumber(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const field = (value as Record<string, unknown>)[key];
  if (typeof field === 'number' && Number.isInteger(field)) return field;
  if (typeof field === 'string' && /^\\d{3}$/.test(field)) {
    return Number(field);
  }
  return undefined;
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
