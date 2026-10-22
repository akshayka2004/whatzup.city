import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { DatabaseService } from '../database/database.service';

export type AccessUser = { id: string; role?: string | null };

const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'MASTER_ADMIN']);

/**
 * Accepts a business id or its entity id (some dashboards still pass the entity id).
 * Who may read a business's private data (analytics, customers, bills):
 * platform admins, the owner, active team members, or the owner of the brand the
 * outlet belongs to. Throws 404 for unknown ids and 403 otherwise.
 */
export async function assertBusinessAccess(
  db: DatabaseService,
  businessId: string,
  user: AccessUser,
) {
  const business = await db.business.findFirst({
    where: { deletedAt: null, OR: [{ id: businessId }, { entityId: businessId }] },
    select: {
      id: true,
      tenantId: true,
      ownerId: true,
      brand: { select: { ownerId: true } },
      staff: { where: { userId: user.id, isActive: true, deletedAt: null }, select: { id: true } },
    },
  });
  if (!business) throw new NotFoundException('Business not found');
  if (user.role && PLATFORM_ROLES.has(user.role)) return business;
  if (business.ownerId === user.id) return business;
  if (business.brand?.ownerId === user.id) return business;
  if (business.staff.length > 0) return business;
  throw new ForbiddenException('You do not have access to this business');
}

type OwnedKind = 'offer' | 'product' | 'event';

/**
 * For routes that take an offer/product/event id: finds the business the record
 * belongs to and applies assertBusinessAccess. Tenant scoping alone is not
 * enough, since anyone who lands in a business's tenant would pass it.
 */
export async function assertResourceAccess(
  db: DatabaseService,
  kind: OwnedKind,
  id: string,
  user: AccessUser,
) {
  const where = { id, deletedAt: null };
  const select = { businessId: true };
  const row =
    kind === 'offer'
      ? await db.offer.findFirst({ where, select })
      : kind === 'product'
        ? await db.product.findFirst({ where, select })
        : await db.event.findFirst({ where, select });
  if (!row?.businessId)
    throw new NotFoundException(`${kind[0].toUpperCase()}${kind.slice(1)} not found`);
  return assertBusinessAccess(db, row.businessId, user);
}
