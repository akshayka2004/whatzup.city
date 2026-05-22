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
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
      errorFormat: 'pretty',
    });

    this.$on('query', (e: Prisma.QueryEvent) => {
      if (isDev) {
        this.logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
      }
    });

    this.$on('info', (e: Prisma.LogEvent) => {
      this.logger.log(e.message);
    });

    this.$on('warn', (e: Prisma.LogEvent) => {
      this.logger.warn(e.message);
    });

    this.$on('error', (e: Prisma.LogEvent) => {
      this.logger.error(e.message);
    });
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
