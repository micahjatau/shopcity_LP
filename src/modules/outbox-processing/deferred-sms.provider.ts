import { createSmsProvider } from '../../jobs/sms.provider.factory';
import type {
  SmsDeliveryReport,
  SmsProvider,
  SmsSendInput,
  SmsSendResult,
} from '../../jobs/sms.provider';

export class DeferredSmsProvider implements SmsProvider {
  private provider?: SmsProvider;

  get supportsDeliveryReports(): boolean {
    return this.resolve().getDeliveryReport !== undefined;
  }

  get requiresLocalSubmissionReservation(): boolean | undefined {
    return this.resolve().requiresLocalSubmissionReservation;
  }

  get submissionReservationWindowMs(): number | undefined {
    return this.resolve().submissionReservationWindowMs;
  }

  send(input: SmsSendInput): Promise<SmsSendResult> {
    return this.resolve().send(input);
  }

  async getDeliveryReport(
    providerMessageId: string,
  ): Promise<SmsDeliveryReport | null> {
    const provider = this.resolve();
    return provider.getDeliveryReport
      ? provider.getDeliveryReport(providerMessageId)
      : null;
  }

  private resolve(): SmsProvider {
    this.provider ??= createSmsProvider();
    return this.provider;
  }
}
