import { Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export const PILOT_OPERATIONS_HISTORY_INTERVAL_MS = 60 * 60 * 1_000;
export const PILOT_OPERATIONS_HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const DEFAULT_TENANT_BATCH_SIZE = 10;

export interface PilotOperationsSnapshotRecorder {
  recordPilotOperationsSnapshot(
    tenantId: string,
    capturedAt: Date,
  ): Promise<void>;
}

export interface PilotOperationsHistorySweepResult {
  sampledAt: string;
  tenantCount: number;
  capturedCount: number;
  failureCount: number;
  deletedCount: number;
  durationMs: number;
}

export class PilotOperationsHistoryWorkerRuntime {
  private readonly logger = new Logger(
    PilotOperationsHistoryWorkerRuntime.name,
  );
  private timer?: NodeJS.Timeout;
  private activeRun?: Promise<PilotOperationsHistorySweepResult>;
  private started = false;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly recorder: PilotOperationsSnapshotRecorder,
    private readonly intervalMs = PILOT_OPERATIONS_HISTORY_INTERVAL_MS,
  ) {}

  start(): void {
    if (this.started) return;

    this.started = true;
    this.scheduleRun();
    this.timer = setInterval(() => this.scheduleRun(), this.intervalMs);
    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.stopping) return;

    this.stopping = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.activeRun?.catch(() => undefined);
    this.activeRun = undefined;
    this.started = false;
    this.stopping = false;
  }

  runOnce(): Promise<PilotOperationsHistorySweepResult> {
    return runPilotOperationsHistorySweep(this.prisma, this.recorder);
  }

  private scheduleRun(): void {
    if (this.stopping || this.activeRun) return;

    const run = this.runOnce();
    this.activeRun = run;
    void run
      .then((result) => {
        this.logger.log(
          `Pilot operations history sweep completed tenants=${result.tenantCount} captured=${result.capturedCount} failed=${result.failureCount} pruned=${result.deletedCount} durationMs=${result.durationMs}`,
        );
      })
      .catch((error: unknown) => {
        if (!this.stopping) {
          this.logger.error(
            'Pilot operations history sweep failed',
            error instanceof Error ? error.stack : String(error),
          );
        }
      })
      .finally(() => {
        if (this.activeRun === run) this.activeRun = undefined;
      });
  }
}

export async function runPilotOperationsHistorySweep(
  prisma: PrismaService,
  recorder: PilotOperationsSnapshotRecorder,
  batchSize = DEFAULT_TENANT_BATCH_SIZE,
  sampledAt = new Date(),
): Promise<PilotOperationsHistorySweepResult> {
  const startedAt = Date.now();
  let cursor: string | undefined;
  let tenantCount = 0;
  let capturedCount = 0;
  let failureCount = 0;

  while (true) {
    const tenants = await prisma.tenant.findMany({
      ...(cursor ? { where: { id: { gt: cursor } } } : {}),
      orderBy: { id: 'asc' },
      take: batchSize,
      select: { id: true },
    });
    if (tenants.length === 0) break;

    tenantCount += tenants.length;
    for (const tenant of tenants) {
      try {
        await recorder.recordPilotOperationsSnapshot(tenant.id, sampledAt);
        capturedCount += 1;
      } catch {
        failureCount += 1;
      }
    }

    cursor = tenants.at(-1)?.id;
    if (!cursor || tenants.length < batchSize) break;
  }

  const { count: deletedCount } =
    await prisma.pilotOperationsSnapshot.deleteMany({
      where: {
        capturedAt: {
          lt: new Date(
            sampledAt.getTime() - PILOT_OPERATIONS_HISTORY_RETENTION_MS,
          ),
        },
      },
    });

  return {
    sampledAt: sampledAt.toISOString(),
    tenantCount,
    capturedCount,
    failureCount,
    deletedCount,
    durationMs: Date.now() - startedAt,
  };
}
