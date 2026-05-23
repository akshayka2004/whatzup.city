// ============================================================
// Redis Service — Abstraction over ioredis with typed methods
// and in-memory fallback for offline resiliency
// ============================================================

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface FallbackEntry {
  value: any;
  expiresAt?: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly fallbackStore = new Map<string, FallbackEntry>();

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    
    // Set maxRetriesPerRequest to 1 or 2 so it fails fast and triggers fallback when down
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => {
      // Log as debug/warn rather than error to avoid flooding stdout in dev
      this.logger.debug('Redis offline or connecting: ' + err.message);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  private async execute<T>(
    opName: string,
    redisCall: () => Promise<T>,
    fallbackCall: () => Promise<T> | T,
  ): Promise<T> {
    if (this.client.status !== 'ready') {
      return Promise.resolve(fallbackCall());
    }

    try {
      return await redisCall();
    } catch (error: any) {
      this.logger.warn(`Redis operation "${opName}" failed: ${error.message}. Using in-memory fallback.`);
      return Promise.resolve(fallbackCall());
    }
  }

  async get<T>(key: string): Promise<T | null> {
    return this.execute(
      'get',
      async () => {
        const value = await this.client.get(key);
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      },
      () => {
        const entry = this.fallbackStore.get(key);
        if (!entry) return null;
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          this.fallbackStore.delete(key);
          return null;
        }
        return entry.value as T;
      }
    );
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.fallbackStore.set(key, { value, expiresAt });

    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.execute(
      'set',
      async () => {
        if (ttlSeconds) {
          await this.client.setex(key, ttlSeconds, serialized);
        } else {
          await this.client.set(key, serialized);
        }
      },
      () => {}
    );
  }

  async del(key: string): Promise<void> {
    this.fallbackStore.delete(key);
    await this.execute(
      'del',
      async () => {
        await this.client.del(key);
      },
      () => {}
    );
  }

  async delPattern(pattern: string): Promise<void> {
    await this.execute(
      'delPattern',
      async () => {
        // Use SCAN instead of KEYS — non-blocking on large keysets
        let cursor = '0';
        const collected: string[] = [];
        do {
          const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys.length) collected.push(...keys);
        } while (cursor !== '0');
        if (collected.length > 0) {
          await this.client.del(...collected);
        }
      },
      () => {
        const regexStr = '^' + pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, (ch) => (ch === '*' ? '.*' : ch === '?' ? '.' : '\\' + ch)) + '$';
        const regex = new RegExp(regexStr);
        for (const key of this.fallbackStore.keys()) {
          if (regex.test(key)) {
            this.fallbackStore.delete(key);
          }
        }
      }
    );
  }

  async exists(key: string): Promise<boolean> {
    return this.execute(
      'exists',
      async () => {
        const result = await this.client.exists(key);
        return result === 1;
      },
      () => {
        const entry = this.fallbackStore.get(key);
        if (!entry) return false;
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          this.fallbackStore.delete(key);
          return false;
        }
        return true;
      }
    );
  }

  async incr(key: string): Promise<number> {
    let fallbackVal = 1;
    const entry = this.fallbackStore.get(key);
    if (entry && (!entry.expiresAt || entry.expiresAt >= Date.now())) {
      fallbackVal = (Number(entry.value) || 0) + 1;
    }
    this.fallbackStore.set(key, { value: fallbackVal, expiresAt: entry?.expiresAt });

    return this.execute(
      'incr',
      async () => {
        return this.client.incr(key);
      },
      () => fallbackVal
    );
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.fallbackStore.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
    }
    await this.execute(
      'expire',
      async () => {
        await this.client.expire(key, ttlSeconds);
      },
      () => {}
    );
  }

  getClient(): Redis {
    return this.client;
  }
}
