import {
  Controller,
  Get,
  Headers,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { PublicRoute } from '../../common/auth/public-route.decorator';
import { PrismaService } from '../../database/prisma.service';
import { runReportMaterializationSweep } from '../../jobs/report-materialization.worker';
import { ReportMaterializerService } from './report-materializer.service';

@Controller({ path: 'cron/report-materialization', version: '1' })
export class ReportMaterializationCronController {
  private readonly logger = new Logger(
    ReportMaterializationCronController.name,
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reportMaterializer: ReportMaterializerService,
  ) {}

  @PublicRoute()
  @Get()
  @ApiExcludeEndpoint()
  async run(@Headers('authorization') authorization?: string) {
    const expectedSecret = this.configService.get<string>('CRON_SECRET');
    if (!expectedSecret?.trim()) {
      throw new ServiceUnavailableException(
        'Report materialization schedule is not configured.',
      );
    }
    if (!hasValidBearerSecret(authorization, expectedSecret)) {
      throw new UnauthorizedException('Invalid cron authorization.');
    }

    try {
      const result = await runReportMaterializationSweep(
        this.prisma,
        this.reportMaterializer,
      );
      this.logger.log(
        `Report materialization completed tenants=${result.tenantCount} durationMs=${result.durationMs}`,
      );
      return {
        success: true,
        tenantCount: result.tenantCount,
        durationMs: result.durationMs,
      };
    } catch (error) {
      this.logger.error(
        `Report materialization failed (${safeErrorName(error)}).`,
      );
      throw new InternalServerErrorException('Report materialization failed.');
    }
  }
}

function hasValidBearerSecret(
  authorization: string | undefined,
  expectedSecret: string,
): boolean {
  if (!authorization?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice('Bearer '.length));
  const expected = Buffer.from(expectedSecret);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
