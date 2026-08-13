import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prismaService.$queryRaw<
        { one: number }[]
      >`SELECT 1::int AS one`;

      return this.getStatus(key, true, {
        database: 'postgresql',
      });
    } catch (error) {
      return this.getStatus(key, false, {
        database: 'postgresql',
        message: 'Postgres is unavailable',
        error: this.describeError(error),
      });
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return '[diagnostic unavailable]';
  }
}
