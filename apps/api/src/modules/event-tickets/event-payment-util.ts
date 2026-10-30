import type { Prisma } from '@prisma/client';
import type { PaymentAction } from '@saas/types';
import type { DatabaseService } from '../../common/database/database.service';
import type { EventActor } from './event-access';

type Db = DatabaseService | Prisma.TransactionClient;

export type PaymentActorRole = 'ATTENDEE' | 'HOST' | 'ADMIN' | 'SYSTEM';

const PLATFORM = new Set(['SUPER_ADMIN', 'MASTER_ADMIN', 'PLATFORM_STAFF']);

/** Platform staff acting on a payment are logged as ADMIN, the event's own team as HOST. */
export function actorRoleOf(actor: EventActor): PaymentActorRole {
  return actor.role && PLATFORM.has(actor.role) ? 'ADMIN' : 'HOST';
}

/**
 * One line of a payment's trail. Append-only: nothing in the app edits or deletes these, so the
 * host and both admins always see the same history.
 */
export async function logPayment(
  db: Db,
  e: {
    tenantId: string;
    paymentId: string;
    eventId: string;
    actorId?: string | null;
    actorRole: PaymentActorRole;
    action: PaymentAction;
    detail?: Prisma.InputJsonValue;
  },
) {
  await db.eventPaymentLog.create({
    data: {
      tenantId: e.tenantId,
      paymentId: e.paymentId,
      eventId: e.eventId,
      actorId: e.actorId ?? null,
      actorRole: e.actorRole,
      action: e.action,
      detail: e.detail,
    },
  });
}
