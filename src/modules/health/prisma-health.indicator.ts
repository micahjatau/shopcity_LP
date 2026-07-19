import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    await this.prismaService.$queryRaw<{ one: number }[]>`SELECT 1::int AS one`;

    return this.getStatus(key, true, {
      database: 'postgresql',
    });
  }
}
