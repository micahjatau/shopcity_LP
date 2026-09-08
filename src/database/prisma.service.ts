import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    super(
      databaseUrl && process.env.VERCEL === '1'
        ? {
            datasources: {
              db: { url: withConnectionLimit(databaseUrl, 1) },
            },
          }
        : undefined,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

function withConnectionLimit(databaseUrl: string, limit: number): string {
  const url = new URL(databaseUrl);
  url.searchParams.set('connection_limit', String(limit));
  return url.toString();
}
