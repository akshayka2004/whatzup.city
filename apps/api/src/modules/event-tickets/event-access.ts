import { ForbiddenException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { effectiveGrants, grantAllows } from '@saas/types';
import type { DatabaseService } from '../../common/database/database.service';
import type { RedisService } from '../../common/redis/redis.service';
import { assertBusinessAccess, type AccessUser } from '../../common/utils/business-access';

export type EventActor = AccessUser & { grants?: Record<string, string> | null; tenantId?: string };

const PLATFORM = new Set(['SUPER_ADMIN', 'MASTER_ADMIN', 'PLATFORM_STAFF']);

/**
 * Hosts see who is coming as a name, a profession and a place, nothing else. Only the super admin
 * gets contact details (email, phone) as well.
 */
export function canSeeContacts(user: Pick<EventActor, 'role'>): boolean {
  return user.role === 'SUPER_ADMIN';
}

export interface AttendeeProfile {
  profession: string | null;
  place: string | null;
}

/** Profession (from the account) and place (from the customer profile) for a set of people. */
export async function attendeeProfiles(
  db: DatabaseService,
  userIds: string[],
): Promise<Map<string, AttendeeProfile>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const out = new Map<string, AttendeeProfile>();
  if (!ids.length) return out;
  const [users, customers] = await Promise.all([
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, profession: true } }),
    // tenant-scope-ok: looked up by the user ids of one event's own attendees
    db.customer.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, city: true, district: true },
    }),
  ]);
  for (const u of users) out.set(u.id, { profession: u.profession?.trim() || null, place: null });
  for (const c of customers) {
    const cur = out.get(c.userId) ?? { profession: null, place: null };
    cur.place = c.city?.trim() || c.district?.trim() || null;
    out.set(c.userId, cur);
  }
  return out;
}

/** Platform admins and staff who were given manage access to Events. */
export function canManagePlatformEvents(user: EventActor): boolean {
  if (!user.role || !PLATFORM.has(user.role)) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return grantAllows(user.grants ?? effectiveGrants(user.role, null), 'events', 'manage');
}

/**
 * Who may run an event's tickets: the hosting business's owner or team, or (for events the platform
 * itself hosts, which have no business) platform staff with Events access.
 * Returns the event so callers do not read it twice.
 */
export async function assertEventHost(db: DatabaseService, eventId: string, user: EventActor) {
  const event = await db.event.findFirst({ where: { id: eventId, deletedAt: null } });
  if (!event) throw new NotFoundException('Event not found');
  if (event.businessId) {
    if (user.role && PLATFORM.has(user.role) && canManagePlatformEvents(user)) return event;
    await assertBusinessAccess(db, event.businessId, user);
    return event;
  }
  if (!canManagePlatformEvents(user)) throw new ForbiddenException('You cannot manage this event');
  return event;
}

/** Fixed-window limiter on Redis. Throws 429 past `limit` hits in `windowSec`. */
export async function hit(
  redis: RedisService,
  key: string,
  limit: number,
  windowSec: number,
  message = 'Too many requests. Please slow down.',
): Promise<void> {
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  if (n > limit) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
}
