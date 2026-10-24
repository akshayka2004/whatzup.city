import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export type SecurityAlertKind =
  | 'PRIVILEGED_ROLE_GRANTED'
  | 'PRIVILEGED_ACCOUNT_LOCKED'
  | 'LOGIN_FAILURE_SPIKE'
  | 'SERVER_ERROR_SPIKE'
  | 'TWO_FACTOR_DISABLED';

/** Roles whose creation or grant always raises an alert. */
export const PRIVILEGED_ROLES = new Set(['SUPER_ADMIN', 'MASTER_ADMIN', 'PLATFORM_STAFF']);

const HOUR = 3600;

/**
 * Operator alerts for security-relevant events. Always logged; also posted to
 * SECURITY_ALERT_WEBHOOK_URL (Slack/Discord/Google Chat compatible JSON) when set.
 * Never throws: alerting must not break the request that triggered it.
 */
@Injectable()
export class SecurityAlertService {
  private readonly logger = new Logger('SecurityAlert');

  constructor(private readonly redis: RedisService) {}

  async alert(
    kind: SecurityAlertKind,
    summary: string,
    details: Record<string, unknown> = {},
    dedupeKey?: string,
  ): Promise<void> {
    try {
      if (dedupeKey) {
        const key = `security-alert:${kind}:${dedupeKey}`;
        if ((await this.redis.incr(key)) !== 1) return;
        await this.redis.expire(key, HOUR);
      }
      this.logger.warn(`[${kind}] ${summary} ${JSON.stringify(details)}`);
      await this.post(kind, summary, details);
    } catch (e: any) {
      this.logger.error(`Alert delivery failed (${kind}): ${e?.message}`);
    }
  }

  /**
   * Counts an occurrence in a fixed window; alerts once when the count reaches the
   * threshold, so a sustained attack produces one message per window, not thousands.
   */
  async countAndAlert(
    kind: SecurityAlertKind,
    threshold: number,
    windowSeconds: number,
    summary: (count: number) => string,
  ): Promise<void> {
    try {
      const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
      const key = `security-count:${kind}:${bucket}`;
      const n = await this.redis.incr(key);
      if (n === 1) await this.redis.expire(key, windowSeconds * 2);
      if (n === threshold) {
        await this.alert(kind, summary(n), { windowSeconds, threshold });
      }
    } catch (e: any) {
      this.logger.error(`Alert counter failed (${kind}): ${e?.message}`);
    }
  }

  private async post(kind: string, summary: string, details: Record<string, unknown>) {
    const url = process.env.SECURITY_ALERT_WEBHOOK_URL;
    if (!url) return;
    const lines = Object.entries(details).map(([k, v]) => `• ${k}: ${String(v)}`);
    const text = [`[whtzup.city] ${kind}`, summary, ...lines].join('\n');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, content: text }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
  }
}
