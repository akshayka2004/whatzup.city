import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { DAY_MS, istDateKey, istDayStart } from '../../common/utils/ist';

/** Expired or revoked credentials are kept this long for incident lookups, then deleted. */
export const TOKEN_GRACE_DAYS = 30;

/** Optional, env-driven windows (days). Unset = keep forever. */
function envDays(name: string): number | null {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export interface RetentionResult {
  refreshTokens: number;
  sessions: number;
  analyticsEvents: number;
  auditLogs: number;
}

/**
 * Nightly cleanup of personal data we no longer need (DPDP: keep only as long as
 * necessary). Refresh tokens and sessions always; raw analytics events and audit
 * logs only when ANALYTICS_RETENTION_DAYS / AUDIT_RETENTION_DAYS are set, since
 * reports fall back to raw events for days the rollups don't cover.
 */
@Injectable()
export class RetentionService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.DATA_RETENTION === 'off' || process.env.NODE_ENV === 'test') return;
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  /** Next 03:15 IST, after the analytics rollups. */
  private scheduleNext() {
    const now = Date.now();
    let next = istDayStart(istDateKey(new Date(now))).getTime() + (3 * 60 + 15) * 60 * 1000;
    if (next <= now) next += DAY_MS;
    this.timer = setTimeout(() => {
      this.runNightly()
        .catch((e) => this.logger.error(`Retention run failed: ${e?.message}`))
        .finally(() => this.scheduleNext());
    }, next - now);
    this.timer.unref?.();
  }

  /** Once per IST day across instances. */
  async runNightly(): Promise<RetentionResult | null> {
    const lock = `retention:lock:${istDateKey(new Date())}`;
    if ((await this.redis.incr(lock)) !== 1) return null;
    await this.redis.expire(lock, 20 * 3600);
    const result = await this.purge(new Date());
    this.logger.log(`Retention: ${JSON.stringify(result)}`);
    return result;
  }

  async purge(now: Date): Promise<RetentionResult> {
    const graceCutoff = new Date(now.getTime() - TOKEN_GRACE_DAYS * DAY_MS);

    const refreshTokens = await this.db.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: graceCutoff } },
          { isRevoked: true, createdAt: { lt: graceCutoff } },
        ],
      },
    });
    const sessions = await this.db.session.deleteMany({
      where: { expiresAt: { lt: graceCutoff } },
    });

    let analyticsEvents = 0;
    const analyticsDays = envDays('ANALYTICS_RETENTION_DAYS');
    if (analyticsDays) {
      const r = await this.db.analyticsEvent.deleteMany({
        where: { createdAt: { lt: new Date(now.getTime() - analyticsDays * DAY_MS) } },
      });
      analyticsEvents = r.count;
    }

    let auditLogs = 0;
    const auditDays = envDays('AUDIT_RETENTION_DAYS');
    if (auditDays) {
      const r = await this.db.auditLog.deleteMany({
        where: { createdAt: { lt: new Date(now.getTime() - auditDays * DAY_MS) } },
      });
      auditLogs = r.count;
    }

    return {
      refreshTokens: refreshTokens.count,
      sessions: sessions.count,
      analyticsEvents,
      auditLogs,
    };
  }
}
