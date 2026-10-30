import { ForbiddenException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { effectiveGrants, grantAllows } from '@saas/types';
import type { DatabaseService } from '../../common/database/database.service';
import type { RedisService } from '../../common/redis/redis.service';
import { assertBusinessAccess, type AccessUser } from '../../common/utils/business-access';

export type EventActor = AccessUser & { grants?: Record<string, string> | null; tenantId?: string };

const PLATFORM = new Set(['SUPER_ADMIN', 'MASTER_ADMIN', 'PLATFORM_STAFF']);

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
