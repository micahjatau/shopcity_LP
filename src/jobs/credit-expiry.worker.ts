import { Logger } from '@nestjs/common';
import { envValidationSchema } from '../config/env.validation';
import { CreditExpiryService } from '../modules/credit-expiry/credit-expiry.service';
import { ExpiryReminderService } from '../modules/credit-expiry/expiry-reminder.service';

export interface CreditExpiryWorkerConfig {
  expirySweepIntervalMs: number;
  expiryBatchSize: number;
  reminderDays: number;
  reminderBatchSize: number;
}

export function loadCreditExpiryWorkerConfig(
  env = process.env,
): CreditExpiryWorkerConfig {
  const result = envValidationSchema.validate(env, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (result.error) {
    throw new Error(`Invalid worker environment: ${result.error.message}`);
  }

  const values = result.value as Record<string, unknown>;
  return {
    expirySweepIntervalMs: Number(values.CREDIT_EXPIRY_SWEEP_INTERVAL_MS),
    expiryBatchSize: Number(values.CREDIT_EXPIRY_BATCH_SIZE),
    reminderDays: Number(values.CREDIT_EXPIRY_REMINDER_DAYS),
    reminderBatchSize: Number(values.CREDIT_EXPIRY_REMINDER_BATCH_SIZE),
  };
}

export class CreditExpiryWorkerRuntime {
  private readonly logger = new Logger(CreditExpiryWorkerRuntime.name);
  private timer?: NodeJS.Timeout;
  private activeSweep?: Promise<void>;
  private started = false;
  private stopping = false;

  constructor(
    private readonly creditExpiryService: CreditExpiryService,
    private readonly expiryReminderService: ExpiryReminderService,
    private readonly config: CreditExpiryWorkerConfig,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    const initialSweep = this.runSweep();
    this.activeSweep = initialSweep;

    await initialSweep.finally(() => {
      if (this.activeSweep === initialSweep) {
        this.activeSweep = undefined;
      }
    });

    this.timer = setInterval(() => {
      this.scheduleSweep();
    }, this.config.expirySweepIntervalMs);
    this.timer.unref?.();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    await this.activeSweep?.catch(() => undefined);
    this.activeSweep = undefined;
    this.started = false;
    this.stopping = false;
  }

  private scheduleSweep(): void {
    if (this.stopping || this.activeSweep) {
      return;
    }

    const sweep = this.runSweep();
    this.activeSweep = sweep;

    void sweep
      .catch((error) => {
        if (this.stopping) {
          return;
        }

        this.logger.error(
          'Credit expiry sweep failed',
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        if (this.activeSweep === sweep) {
          this.activeSweep = undefined;
        }
      });
  }

  private async runSweep(): Promise<void> {
    if (this.stopping) {
      return;
    }

    const now = this.clock();
    await this.creditExpiryService.expireDueCredit({
      now,
      batchSize: this.config.expiryBatchSize,
    });
    await this.expiryReminderService.enqueueDueReminders({
      now,
      reminderDays: this.config.reminderDays,
      batchSize: this.config.reminderBatchSize,
    });
  }
}
