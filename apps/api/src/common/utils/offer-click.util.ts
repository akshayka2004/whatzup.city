import { DatabaseService } from '../database/database.service';

export type OfferKind = 'BUSINESS' | 'PLATFORM';

/**
 * Records a detail-view click, deduped per (offer, visitor, day) via the
 * OfferClick unique constraint. Returns whether the click counted (false
 * means this visitor already clicked this offer today).
 */
export async function recordOfferClick(
  db: DatabaseService,
  params: { tenantId: string; offerKind: OfferKind; offerId: string; actorKey: string },
): Promise<boolean> {
  const clickDate = new Date();
  clickDate.setUTCHours(0, 0, 0, 0);

  try {
    await db.offerClick.create({
      data: {
        tenantId: params.tenantId,
        offerKind: params.offerKind,
        offerId: params.offerId,
        actorKey: params.actorKey,
        clickDate,
      },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') return false; // already clicked today
    throw err;
  }

  try {
    if (params.offerKind === 'BUSINESS') {
      await db.offer.update({ where: { id: params.offerId }, data: { clickCount: { increment: 1 } } });
    } else {
      await db.platformOffer.update({ where: { id: params.offerId }, data: { clickCount: { increment: 1 } } });
    }
  } catch (err: any) {
    if (err?.code !== 'P2025') throw err; // offer doesn't exist — ignore, dedupe row already written
  }
  return true;
}
