import { Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const DEFAULT_REPORT_MATERIALIZATION_BATCH_SIZE = 10;
const DEFAULT_REPORT_MATERIALIZATION_INTERVAL_MS = 5 * 60_000;

type TenantRow = {
  id: string;
};

export interface ReportMaterializationWorkerConfig {
  batchSize: number;
  intervalMs: number;
}

export interface ReportMaterializationSweepResult {
  tenantCount: number;
  watermarkBefore: string | null;
  watermarkAfter: string | null;
  durationMs: number;
}

export interface ReportMaterializerLike {
  rebuildTenant(
    tenantId: string,
    options?: {
      materializedAt?: Date;
      asOf?: Date;
    },
  ): Promise<void>;
}

export function loadReportMaterializationWorkerConfig(
  env = process.env,
): ReportMaterializationWorkerConfig {
  return {
    batchSize: parsePositiveInteger(
      env.REPORT_MATERIALIZATION_BATCH_SIZE,
      DEFAULT_REPORT_MATERIALIZATION_BATCH_SIZE,
    ),
    intervalMs: parsePositiveInteger(
      env.REPORT_MATERIALIZATION_INTERVAL_MS,
      DEFAULT_REPORT_MATERIALIZATION_INTERVAL_MS,
    ),
  };
}

export class ReportMaterializationWorkerRuntime {
  private readonly logger = new Logger(ReportMaterializationWorkerRuntime.name);
  private timer?: NodeJS.Timeout;
  private activeRun?: Promise<void>;
  private started = false;
  private stopping = false;
  private cursor?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportMaterializer: ReportMaterializerLike,
    private readonly config: ReportMaterializationWorkerConfig,
  ) {}

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    const initialRun = this.executeCycle();
    this.activeRun = initialRun;

    await initialRun.finally(() => {
      if (this.activeRun === initialRun) {
        this.activeRun = undefined;
      }
    });

    this.timer = setInterval(() => {
      this.scheduleRun();
    }, this.config.intervalMs);
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

    await this.activeRun?.catch(() => undefined);
    this.activeRun = undefined;
    this.started = false;
    this.stopping = false;
  }

  async runOnce(): Promise<ReportMaterializationSweepResult> {
    return this.runSweep();
  }

  private scheduleRun(): void {
    if (this.stopping || this.activeRun) {
      return;
    }

    const run = this.executeCycle();
    this.activeRun = run;

    void run
      .catch((error) => {
        if (this.stopping) {
          return;
        }

        this.logger.error(
          'Report materialization sweep failed',
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        if (this.activeRun === run) {
          this.activeRun = undefined;
        }
      });
  }

  private async executeCycle(): Promise<void> {
    if (this.stopping) {
      return;
    }

    const result = await this.runSweep();
    this.cursor = result.watermarkAfter ?? undefined;

    this.logger.log(
      `Report materialization sweep completed tenants=${result.tenantCount} watermark=${result.watermarkBefore ?? '<start>'}->${result.watermarkAfter ?? '<end>'} durationMs=${result.durationMs}`,
    );
  }

  private async runSweep(): Promise<ReportMaterializationSweepResult> {
    const result = await runReportMaterializationSweep(
      this.prisma,
      this.reportMaterializer,
      this.config.batchSize,
      this.cursor,
    );

    return result;
  }
}

export async function runReportMaterializationSweep(
  prisma: PrismaService,
  reportMaterializer: ReportMaterializerLike,
  batchSize = DEFAULT_REPORT_MATERIALIZATION_BATCH_SIZE,
  cursor?: string,
): Promise<ReportMaterializationSweepResult> {
  const startedAt = Date.now();
  const watermarkBefore = cursor ?? null;
  const watermarkAt = new Date();
  let tenants = await loadTenantBatch(prisma, cursor, batchSize);

  if (tenants.length === 0 && cursor) {
    tenants = await loadTenantBatch(prisma, undefined, batchSize);
  }

  for (const tenant of tenants) {
    await reportMaterializer.rebuildTenant(tenant.id, {
      materializedAt: watermarkAt,
      asOf: watermarkAt,
    });
  }

  return {
    tenantCount: tenants.length,
    watermarkBefore,
    watermarkAfter: tenants.at(-1)?.id ?? null,
    durationMs: Date.now() - startedAt,
  };
}

async function loadTenantBatch(
  prisma: PrismaService,
  cursor: string | undefined,
  batchSize: number,
): Promise<TenantRow[]> {
  return prisma.tenant.findMany({
    ...(cursor ? { where: { id: { gt: cursor } } } : {}),
    orderBy: { id: 'asc' },
    take: batchSize,
    select: { id: true },
  });
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
