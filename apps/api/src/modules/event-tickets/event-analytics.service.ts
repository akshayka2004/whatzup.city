// ============================================================
// Event analytics for the host: RSVPs, who actually came, and when. All times are IST.
// Arrival time is the scan time recorded by the server (event_tickets.checked_in_at).
// ============================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { checkInWindow } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { assertBusinessAccess } from '../../common/utils/business-access';
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
      payGroups,
    ] = await Promise.all([
      // A seat held for payment that never got verified (still waiting, expired, rejected) is not an
      // RSVP: it is reported as UNPAID/PENDING so it cannot inflate or deflate the real numbers.
      this.db.$queryRaw<{ status: string; n: number }[]>`
          SELECT CASE WHEN t.status = 'CANCELLED' AND t.payment_id IS NOT NULL AND p.status <> 'APPROVED'
                      THEN 'UNPAID' ELSE t.status END AS status,
                 count(*)::int AS n
          FROM event_tickets t LEFT JOIN event_payments p ON p.id = t.payment_id
          WHERE t.event_id = ${id}::uuid GROUP BY 1`,
      this.db.$queryRaw<{ n: number }[]>`
          SELECT count(DISTINCT user_id)::int AS n FROM event_tickets
          WHERE event_id = ${id}::uuid AND status IN ('ISSUED', 'CHECKED_IN')`,
      this.db.$queryRaw<{ day: string; rsvps: number; cancelled: number }[]>`
          SELECT to_char((t.issued_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
                 count(*)::int AS rsvps,
                 (count(*) FILTER (WHERE t.status = 'CANCELLED'))::int AS cancelled
          FROM event_tickets t LEFT JOIN event_payments p ON p.id = t.payment_id
          WHERE t.event_id = ${id}::uuid
            AND t.status <> 'PENDING'
            AND NOT (t.status = 'CANCELLED' AND t.payment_id IS NOT NULL AND p.status <> 'APPROVED')
          GROUP BY 1 ORDER BY 1`,
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
        where: { eventId: id, status: { in: ['ISSUED', 'CHECKED_IN'] } },
        _count: true,
      }),
      this.db.$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM (
            SELECT DISTINCT user_id FROM event_tickets WHERE event_id = ${id}::uuid AND status IN ('ISSUED', 'CHECKED_IN')
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
      this.db.eventPayment.groupBy({
        by: ['status'],
        where: { eventId: id },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    const count = (s: string) => statusRows.find((r) => r.status === s)?.n ?? 0;
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
      // Money the host has been paid (verified) against what is still being checked or held.
      revenue: {
        paidEvent: event.ticketType === 'PAID',
        verified: payGroups.find((g) => g.status === 'APPROVED')?._sum.amount ?? 0,
        verifiedCount: payGroups.find((g) => g.status === 'APPROVED')?._count._all ?? 0,
        awaitingVerification: payGroups.find((g) => g.status === 'SUBMITTED')?._sum.amount ?? 0,
        held: payGroups.find((g) => g.status === 'PENDING')?._sum.amount ?? 0,
        unpaidSeats: count('UNPAID'),
        expired: payGroups.find((g) => g.status === 'EXPIRED')?._count._all ?? 0,
      },
      generatedAt: new Date().toISOString(),
    };
    await this.redis.set(key, body, 5);
    return body;
  }

  /**
   * A business's events over time: what each one drew, who came, what was paid. Powers the History
   * and Analytics views in the Events section. Reads only; one query per figure, not per event.
   */
  async forBusiness(actor: EventActor, businessId: string) {
    if (!businessId) throw new BadRequestException('businessId is required');
    await assertBusinessAccess(this.db, businessId, actor);

    const key = `event-overview:${businessId}`;
    const cached = await this.redis.get<any>(key);
    if (cached) return cached;

    const events = await this.db.event.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { startDate: 'desc' },
      take: 500,
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        status: true,
        city: true,
        posterImage: true,
        bookingMode: true,
        ticketType: true,
        capacity: true,
        checkedInCount: true,
      },
    });
    const ids = events.map((e) => e.id);
    const [byStatus, unpaid, pay, bySource] = ids.length
      ? await Promise.all([
          this.db.eventTicket.groupBy({
            by: ['eventId', 'status'],
            where: { eventId: { in: ids } },
            _count: true,
          }),
          this.db.$queryRaw<{ event_id: string; n: number }[]>`
              SELECT t.event_id, count(*)::int AS n
              FROM event_tickets t JOIN event_payments p ON p.id = t.payment_id
              WHERE t.status = 'CANCELLED' AND p.status <> 'APPROVED'
                AND t.event_id IN (SELECT id FROM events WHERE business_id = ${businessId}::uuid)
              GROUP BY t.event_id`,
          this.db.eventPayment.groupBy({
            by: ['eventId', 'status'],
            where: { eventId: { in: ids } },
            _count: { _all: true },
            _sum: { amount: true },
          }),
          this.db.eventTicket.groupBy({
            by: ['source'],
            where: { eventId: { in: ids }, status: { in: ['ISSUED', 'CHECKED_IN'] } },
            _count: true,
          }),
        ])
      : [[], [], [], []];

    const now = Date.now();
    const rows = events.map((e) => {
      const n = (s: string) =>
        (byStatus as any[]).find((r) => r.eventId === e.id && r.status === s)?._count ?? 0;
      const u = (unpaid as any[]).find((r) => r.event_id === e.id)?.n ?? 0;
      const sum = (s: string) =>
        Number((pay as any[]).find((r) => r.eventId === e.id && r.status === s)?._sum.amount ?? 0);
      const attended = n('CHECKED_IN');
      const confirmed = n('ISSUED') + attended;
      const ended = e.endDate.getTime() < now;
      return {
        id: e.id,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        status: e.status,
        city: e.city,
        posterImage: e.posterImage,
        isPaid: e.ticketType === 'PAID',
        takesRsvp: e.bookingMode === 'RSVP',
        ended,
        capacity: e.capacity,
        confirmed,
        attended,
        // Tickets cancelled after being confirmed; seats never paid for do not count.
        cancelled: Math.max(0, n('CANCELLED') - u),
        noShows: ended ? n('ISSUED') : null,
        showRate: confirmed > 0 ? Math.round((attended / confirmed) * 1000) / 10 : null,
        fillRate: e.capacity ? Math.round((confirmed / e.capacity) * 1000) / 10 : null,
        revenue: sum('APPROVED'),
        awaiting: sum('SUBMITTED'),
        toVerify:
          (pay as any[]).find((r) => r.eventId === e.id && r.status === 'SUBMITTED')?._count._all ??
          0,
      };
    });

    const held = rows.filter((r) => r.ended && r.status === 'ACTIVE' && r.takesRsvp);
    const sum = <K extends 'confirmed' | 'attended' | 'cancelled' | 'revenue' | 'awaiting'>(
      list: typeof rows,
      k: K,
    ) => list.reduce((s, r) => s + (r[k] as number), 0);
    const fills = held.filter((r) => r.fillRate != null);
    const body = {
      totals: {
        events: rows.length,
        upcoming: rows.filter((r) => !r.ended && r.status === 'ACTIVE').length,
        held: held.length,
        rsvps: sum(rows, 'confirmed'),
        attended: sum(rows, 'attended'),
        cancelled: sum(rows, 'cancelled'),
        showRate:
          sum(held, 'confirmed') > 0
            ? Math.round((sum(held, 'attended') / sum(held, 'confirmed')) * 1000) / 10
            : null,
        avgFillRate: fills.length
          ? Math.round((fills.reduce((s, r) => s + (r.fillRate ?? 0), 0) / fills.length) * 10) / 10
          : null,
        verifiedRevenue: sum(rows, 'revenue'),
        awaitingRevenue: sum(rows, 'awaiting'),
        paidEvents: rows.filter((r) => r.isPaid).length,
        toVerify: rows.reduce((s, r) => s + r.toVerify, 0),
      },
      events: rows,
      sources: (bySource as any[])
        .map((s) => ({ source: s.source ?? 'direct', seats: s._count as number }))
        .sort((a, b) => b.seats - a.seats),
      generatedAt: new Date().toISOString(),
    };
    await this.redis.set(key, body, 30);
    return body;
  }
}
