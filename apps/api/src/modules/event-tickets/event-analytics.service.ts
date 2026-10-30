// ============================================================
// Event analytics for the host: RSVPs, who actually came, and when. All times are IST.
// Arrival time is the scan time recorded by the server (event_tickets.checked_in_at).
// ============================================================

import { Injectable } from '@nestjs/common';
import { checkInWindow } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventActor, assertEventHost } from './event-access';

const BUCKET_MINUTES = 15;

@Injectable()
export class EventAnalyticsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async forEvent(actor: EventActor, eventId: string) {
    const event = await assertEventHost(this.db, eventId, actor);

    // Several people refreshing the dashboard share one answer for a few seconds.
    const key = `event-analytics:${eventId}`;
    const cached = await this.redis.get<any>(key);
    if (cached) return cached;

    const id = eventId;
    const [
      statusRows,
      registrants,
      perDay,
      arrivals,
      gates,
      scans,
      bySource,
      firstTimers,
      waitlist,
      timing,
    ] = await Promise.all([
      this.db.eventTicket.groupBy({ by: ['status'], where: { eventId: id }, _count: true }),
      this.db.$queryRaw<{ n: number }[]>`
          SELECT count(DISTINCT user_id)::int AS n FROM event_tickets
          WHERE event_id = ${id}::uuid AND status <> 'CANCELLED'`,
      this.db.$queryRaw<{ day: string; rsvps: number; cancelled: number }[]>`
          SELECT to_char((issued_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
                 count(*)::int AS rsvps,
                 (count(*) FILTER (WHERE status = 'CANCELLED'))::int AS cancelled
          FROM event_tickets WHERE event_id = ${id}::uuid GROUP BY 1 ORDER BY 1`,
      this.db.$queryRaw<{ slot: string; n: number }[]>`
          SELECT to_char(
                   date_bin(make_interval(mins => ${BUCKET_MINUTES}::int),
                            (checked_in_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata',
                            TIMESTAMP '2000-01-01'),
                   'YYYY-MM-DD"T"HH24:MI') AS slot,
                 count(*)::int AS n
          FROM event_tickets WHERE event_id = ${id}::uuid AND checked_in_at IS NOT NULL
          GROUP BY 1 ORDER BY 1`,
      this.db.$queryRaw<
        {
          id: string;
          label: string;
          level: string;
          checked_in: number;
          first: Date | null;
          last: Date | null;
        }[]
      >`
          SELECT p.id, p.label, p.level, count(t.id)::int AS checked_in,
                 min(t.checked_in_at) AS first, max(t.checked_in_at) AS last
          FROM event_crew_passes p
          LEFT JOIN event_tickets t ON t.checked_in_pass_id = p.id
          WHERE p.event_id = ${id}::uuid
          GROUP BY p.id, p.label, p.level ORDER BY checked_in DESC, p.label`,
      this.db.eventScan.groupBy({ by: ['result'], where: { eventId: id }, _count: true }),
      this.db.eventTicket.groupBy({
        by: ['source'],
        where: { eventId: id, status: { not: 'CANCELLED' } },
        _count: true,
      }),
      this.db.$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM (
            SELECT DISTINCT user_id FROM event_tickets WHERE event_id = ${id}::uuid AND status <> 'CANCELLED'
          ) u
          WHERE NOT EXISTS (
            SELECT 1 FROM event_tickets o WHERE o.user_id = u.user_id AND o.event_id <> ${id}::uuid
          )`,
      this.db.eventWaitlist.count({ where: { eventId: id, promotedAt: null } }),
      // Minutes before the start that people arrived (negative = after it started).
      this.db.$queryRaw<
        { median: number | null; earliest: number | null; latest: number | null }[]
      >`
          SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY m) AS median,
                 max(m) AS earliest, min(m) AS latest
          FROM (
            SELECT extract(epoch FROM (${event.startDate}::timestamp - checked_in_at)) / 60 AS m
            FROM event_tickets WHERE event_id = ${id}::uuid AND checked_in_at IS NOT NULL
          ) x`,
    ]);

    const count = (s: string) => statusRows.find((r) => r.status === s)?._count ?? 0;
    const issued = count('ISSUED');
    const attended = count('CHECKED_IN');
    const cancelled = count('CANCELLED');
    const confirmed = issued + attended;
    const ended = Date.now() > event.endDate.getTime();
    const win = checkInWindow(event);
    const scanCount = (r: string) => scans.find((s) => s.result === r)?._count ?? 0;

    const peak = arrivals.reduce<{ slot: string; n: number } | null>(
      (best, a) => (!best || a.n > best.n ? a : best),
      null,
    );
    // Seats still unused after the event closed are no-shows.
    const noShows = ended ? issued : null;

    const body = {
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        capacity: event.capacity,
        venueCapacity: event.venueCapacity,
        ended,
        checkInOpensAt: new Date(win.opens),
        checkInClosesAt: new Date(win.closes),
      },
      totals: {
        seatsConfirmed: confirmed,
        registrants: registrants[0]?.n ?? 0,
        cancelled,
        attended,
        stillExpected: ended ? 0 : issued,
        noShows,
        showRate: confirmed > 0 ? Math.round((attended / confirmed) * 1000) / 10 : null,
        fillRate: event.capacity ? Math.round((confirmed / event.capacity) * 1000) / 10 : null,
        waitlist,
        firstTimeOnPlatformEvents: firstTimers[0]?.n ?? 0,
      },
      rsvpByDay: perDay,
      arrivals: {
        bucketMinutes: BUCKET_MINUTES,
        curve: arrivals,
        peak,
        medianMinutesBeforeStart: timing[0]?.median != null ? Math.round(timing[0].median) : null,
        firstArrivalMinutesBeforeStart:
          timing[0]?.earliest != null ? Math.round(timing[0].earliest) : null,
        lastArrivalMinutesBeforeStart:
          timing[0]?.latest != null ? Math.round(timing[0].latest) : null,
      },
      gates: gates.map((g) => ({
        id: g.id,
        label: g.label,
        level: g.level,
        checkedIn: g.checked_in,
        first: g.first,
        last: g.last,
      })),
      scans: {
        valid: scanCount('VALID') + scanCount('MANUAL'),
        manual: scanCount('MANUAL'),
        duplicates: scanCount('DUPLICATE'),
        invalid: scanCount('INVALID') + scanCount('WRONG_EVENT'),
        cancelledTickets: scanCount('CANCELLED'),
        outsideWindow: scanCount('OUTSIDE_WINDOW'),
        undone: scanCount('UNDO'),
      },
      sources: bySource
        .map((s) => ({ source: s.source ?? 'direct', seats: s._count }))
        .sort((a, b) => b.seats - a.seats),
      generatedAt: new Date().toISOString(),
    };
    await this.redis.set(key, body, 5);
    return body;
  }
}
