// ============================================================
// Database Service — Prisma Client Lifecycle & Logging
// ============================================================

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@saas/database';

@Injectable()
export class DatabaseService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

    // Production: warn + error only (cuts log volume ~95%, lowers I/O pressure)
    // Development: full query trace
    super({
      log: isDev
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]
        : [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ],
      errorFormat: isDev ? 'pretty' : 'minimal',
    });

    if (isDev) {
      this.$on('query' as never, (e: Prisma.QueryEvent) => {
        // Log only slow queries (>200ms) to surface N+1 / missing indexes
        if (e.duration > 200) {
          this.logger.warn(`SLOW QUERY (${e.duration}ms): ${e.query}`);
        }
      });

      this.$on('info' as never, (e: Prisma.LogEvent) => this.logger.log(e.message));
    }

    this.$on('warn' as never, (e: Prisma.LogEvent) => this.logger.warn(e.message));
    this.$on('error' as never, (e: Prisma.LogEvent) => this.logger.error(e.message));
  }

  async onModuleInit() {
    let retries = 5;
    const delay = 3000;

    while (retries > 0) {
      try {
        this.logger.log('Initializing database connection...');
        await this.$connect();
        this.logger.log('Database connection established.');
        return;
      } catch (err: any) {
        retries--;
        this.logger.error(
          `Database connection attempt failed: ${err.message || err}. Retries remaining: ${retries}`,
        );
        if (retries === 0) {
          throw new Error(
            `Could not connect to database after maximum retries: ${err.message || err}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('Closing database connection...');
    await this.$disconnect();
  }

  excludeDeleted() {
    return { deletedAt: null };
  }
}
