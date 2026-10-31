import { Injectable, Logger } from '@nestjs/common';
import { effectiveGrants, grantAllows, type AccessAreaKey } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { NotificationPriority, NotificationsService } from './notifications.service';

export interface Recipient {
  id: string;
  /** The recipient's own tenant: the feed only shows rows from the tenant the person signs in to. */
  tenantId: string;
}

export interface AudienceMessage {
  title: string;
  body: string;
  type: string;
  /** A same-site path the notice opens. Pick the page this audience is allowed to see. */
  url?: string;
  channel?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
}

const PLATFORM_ROLES = ['SUPER_ADMIN', 'MASTER_ADMIN', 'PLATFORM_STAFF'] as const;
type BusinessRole = 'OWNER' | 'MODERATOR' | 'STAFF';

/**
 * Works out who should hear about something, from the same rights that decide who may see the
 * screen. A notice about a support ticket goes to staff who can open the support inbox, a bill to
 * the people who moderate bills for that business, and so on, so nobody is told about a page they
 * cannot open. Sending never throws: a failed notice must not fail the action that caused it.
 */
@Injectable()
export class NotificationAudienceService {
  private readonly logger = new Logger(NotificationAudienceService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Platform accounts that may open `area`: super admins always, master admins and platform staff
   * when their access grants include it (at `level`).
   */
  async platformStaff(
    area: AccessAreaKey,
    level: 'view' | 'manage' = 'view',
  ): Promise<Recipient[]> {
    // tenant-scope-ok: platform staff live in their own tenant; this is the cross-tenant admin list
    const users = await this.db.user.findMany({
      where: { role: { in: [...PLATFORM_ROLES] }, isActive: true, deletedAt: null },
      select: { id: true, tenantId: true, role: true, grants: true },
      take: 200,
    });
    return users
      .filter((u) => grantAllows(effectiveGrants(u.role, u.grants), area, level))
      .map((u) => ({ id: u.id, tenantId: u.tenantId }));
  }

  /**
   * A business's owner plus active team members in `roles`. Owners and moderators by default,
   * the two who can act on bills, reviews and payments.
   */
  async businessTeam(
    businessId: string,
    roles: BusinessRole[] = ['OWNER', 'MODERATOR'],
  ): Promise<Recipient[]> {
    const business = await this.db.business.findFirst({
      where: { id: businessId },
      select: {
        ownerId: true,
        staff: {
          where: { isActive: true, role: { in: roles } },
          select: { userId: true },
        },
      },
    });
    if (!business) return [];
    const ids = new Set<string>(business.staff.map((s) => s.userId));
    if (business.ownerId && roles.includes('OWNER')) ids.add(business.ownerId);
    return this.byIds([...ids]);
  }

  /** Recipients for known user ids (looks up each person's own tenant). */
  async byIds(ids: string[]): Promise<Recipient[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return [];
    // tenant-scope-ok: resolving the tenant of people we were already told to notify
    const users = await this.db.user.findMany({
      where: { id: { in: unique }, isActive: true, deletedAt: null },
      select: { id: true, tenantId: true },
    });
    return users.map((u) => ({ id: u.id, tenantId: u.tenantId }));
  }

  /**
   * Sends one notice to each recipient once. `except` leaves out the person who did the thing, so
   * nobody is notified about their own action. Returns how many were sent.
   */
  async tell(
    recipients: Recipient[],
    message: AudienceMessage,
    opts: { except?: (string | null | undefined)[] } = {},
  ): Promise<number> {
    const skip = new Set((opts.except ?? []).filter(Boolean) as string[]);
    const seen = new Set<string>();
    const targets = recipients.filter((r) => {
      if (!r.id || skip.has(r.id) || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    let sent = 0;
    await Promise.all(
      targets.slice(0, 200).map(async (r) => {
        try {
          await this.notifications.send({
            tenantId: r.tenantId,
            userId: r.id,
            title: message.title,
            body: message.body,
            type: message.type,
            channel: message.channel,
            priority: message.priority,
            metadata: { ...message.metadata, ...(message.url ? { url: message.url } : {}) },
          });
          sent += 1;
        } catch (e: any) {
          this.logger.warn(`Notice "${message.title}" to ${r.id} failed: ${e?.message}`);
        }
      }),
    );
    return sent;
  }

  /** Convenience: resolve the audience and send in one step, swallowing every failure. */
  async tellStaff(
    area: AccessAreaKey,
    message: AudienceMessage,
    opts: { except?: (string | null | undefined)[]; level?: 'view' | 'manage' } = {},
  ): Promise<void> {
    try {
      await this.tell(await this.platformStaff(area, opts.level ?? 'view'), message, opts);
    } catch (e: any) {
      this.logger.warn(`Staff notice "${message.title}" failed: ${e?.message}`);
    }
  }

  async tellTeam(
    businessId: string,
    message: AudienceMessage,
    opts: { except?: (string | null | undefined)[]; roles?: BusinessRole[] } = {},
  ): Promise<void> {
    try {
      await this.tell(await this.businessTeam(businessId, opts.roles), message, opts);
    } catch (e: any) {
      this.logger.warn(`Team notice "${message.title}" failed: ${e?.message}`);
    }
  }

  async tellUser(
    userId: string | null | undefined,
    message: AudienceMessage,
    opts: { except?: (string | null | undefined)[] } = {},
  ): Promise<void> {
    if (!userId) return;
    try {
      await this.tell(await this.byIds([userId]), message, opts);
    } catch (e: any) {
      this.logger.warn(`Notice "${message.title}" to ${userId} failed: ${e?.message}`);
    }
  }
}
