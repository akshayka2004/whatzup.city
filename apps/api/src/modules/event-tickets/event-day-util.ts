// Keeps the days of a day-booked event in line with the event's dates.

import { eventDays } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';

const HELD = ['ISSUED', 'CHECKED_IN', 'PENDING'];

/**
 * After an event's dates change, line the days up with them: add the days that are new, drop the
 * empty ones that fell outside, and leave any day people already hold tickets for. Called by the
 * events service when a host edits the dates.
 */
export async function syncDaysWithEventDates(db: DatabaseService, eventId: string): Promise<void> {
  const e = await db.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      dayBooking: true,
      startDate: true,
      endDate: true,
      capacity: true,
    },
  });
  if (!e?.dayBooking) return;
  const wanted = eventDays(e.startDate, e.endDate);
  const have = await db.eventDay.findMany({ where: { eventId } });
  const haveDates = new Set(have.map((d) => d.dayDate));
  const wantedDates = new Set(wanted.map((d) => d.dayDate));

  for (const d of wanted) {
    if (haveDates.has(d.dayDate)) continue;
    await db.eventDay.create({
      data: {
        tenantId: e.tenantId,
        eventId,
        dayDate: d.dayDate,
        label: d.label,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        sortOrder: have.length + wanted.indexOf(d),
      },
    });
  }
  for (const d of have) {
    if (wantedDates.has(d.dayDate)) continue;
    const held = await db.eventTicket.count({ where: { dayId: d.id, status: { in: HELD } } });
    if (held === 0) await db.eventDay.delete({ where: { id: d.id } });
  }
}
