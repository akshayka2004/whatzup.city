// ============================================================
// Gate check-in. One ticket can be admitted once: the status flip is a single conditional UPDATE,
// so two gates scanning the same ticket at the same moment cannot both succeed. Arrival time is the
// database clock at that moment, never the phone's.
// ============================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { BOOKING_LIMITS, checkInWindow, type ScanResult } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { normalizePublicCode } from '../../common/utils/public-code';
import { parseTicketQr } from '../../common/utils/ticket-signing';
import { CrewContext } from './event-crew.service';

export interface ScanOutcome {
  result: ScanResult;
  message: string;
  manual?: boolean;
  ticket?: {
    id: string;
    holderName: string;
    code: string;
    isGuest: boolean;
    registrant?: string;
    checkedInAt?: Date | string | null;
    checkedInBy?: string | null;
  };
}

type EventInfo = {
  id: string;
  title: string;
  status: string;
  startDate: Date;
  endDate: Date;
  checkInOpensAt: Date | null;
  checkInClosesAt: Date | null;
  venueCapacity: number | null;
};

const ACTIVE = ['ISSUED', 'CHECKED_IN'];

@Injectable()
export class EventScanService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  // ── scanning ────────────────────────────────────────────────────────────

  /** A scanned QR. */
  async scanQr(ctx: CrewContext, qr: string): Promise<ScanOutcome> {
    const ticketId = parseTicketQr(qr);
    if (!ticketId) {
      await this.log(ctx, null, 'INVALID');
      return { result: 'INVALID', message: 'This is not a valid ticket for any event.' };
    }
    return this.admit(ctx, ticketId, false);
  }

  /** The short code printed under the QR, typed in when the camera cannot read it. */
  async byCode(ctx: CrewContext, rawCode: string): Promise<ScanOutcome> {
    const code = normalizePublicCode(rawCode);
    const ticket = code
      ? await this.db.eventTicket.findFirst({
          where: { eventId: ctx.eventId, code },
          select: { id: true },
        })
      : null;
    if (!ticket) {
      await this.log(ctx, null, 'INVALID');
      return { result: 'INVALID', message: 'No ticket with that code for this event.' };
    }
    return this.admit(ctx, ticket.id, true);
  }

  /** Check in from the list (name search). Desk passes only. */
  async manual(ctx: CrewContext, ticketId: string): Promise<ScanOutcome> {
    this.requireDesk(ctx);
    return this.admit(ctx, ticketId, true);
  }

  /** Admits the ticket if it can be admitted, and says exactly why if not. */
  private async admit(ctx: CrewContext, ticketId: string, manual: boolean): Promise<ScanOutcome> {
    const event = await this.eventInfo(ctx.eventId);
    if (!event || event.status !== 'ACTIVE') {
      await this.log(ctx, ticketId, 'CANCELLED');
      return { result: 'CANCELLED', message: 'This event has been cancelled.' };
    }
    const win = checkInWindow(event);
    const now = Date.now();
    if (now < win.opens || now > win.closes) {
      await this.log(ctx, ticketId, 'OUTSIDE_WINDOW');
      return {
        result: 'OUTSIDE_WINDOW',
        message:
          now < win.opens
            ? `Check-in opens at ${new Date(win.opens).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`
            : 'Check-in for this event has closed.',
      };
    }

    const admitted = await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        {
          id: string;
          holder_name: string;
          code: string;
          is_guest: boolean;
          checked_in_at: Date;
          user_id: string;
        }[]
      >`
        UPDATE event_tickets
        SET status = 'CHECKED_IN',
            checked_in_at = (now() AT TIME ZONE 'UTC'),
            checked_in_pass_id = ${ctx.passId}::uuid
        WHERE id = ${ticketId}::uuid AND event_id = ${ctx.eventId}::uuid AND status = 'ISSUED'
        RETURNING id, holder_name, code, is_guest, checked_in_at, user_id`;
      if (rows.length === 0) return null;
      await tx.$executeRaw`UPDATE events SET checked_in_count = checked_in_count + 1 WHERE id = ${ctx.eventId}::uuid`;
      await tx.eventScan.create({
        data: {
          tenantId: ctx.tenantId,
          eventId: ctx.eventId,
          ticketId,
          passId: ctx.passId,
          result: manual ? 'MANUAL' : 'VALID',
        },
      });
      return rows[0];
    });

    if (admitted) {
      await this.redis.del(`crew:stats:${ctx.eventId}`);
      return {
        result: 'VALID',
        manual,
        message: 'Welcome in.',
        ticket: {
          id: admitted.id,
          holderName: admitted.holder_name,
          code: admitted.code,
          isGuest: admitted.is_guest,
          checkedInAt: admitted.checked_in_at,
        },
      };
    }

    // Not admitted: find out why, so the crew can act.
    const t = await this.db.eventTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { name: true } } },
    });
    if (!t) {
      await this.log(ctx, null, 'INVALID');
      return { result: 'INVALID', message: 'This ticket does not exist.' };
    }
    if (t.eventId !== ctx.eventId) {
      await this.log(ctx, null, 'WRONG_EVENT');
      return { result: 'WRONG_EVENT', message: 'This ticket is for a different event.' };
    }
    const base = {
      id: t.id,
      holderName: t.holderName,
      code: t.code,
      isGuest: t.isGuest,
      registrant: t.user.name,
    };
    if (t.status === 'CANCELLED') {
      await this.log(ctx, t.id, 'CANCELLED');
      return { result: 'CANCELLED', message: 'This ticket was cancelled.', ticket: base };
    }
    // Already used: say when and at which gate.
    const gate = t.checkedInPassId
      ? await this.db.eventCrewPass.findUnique({
          where: { id: t.checkedInPassId },
          select: { label: true },
        })
      : null;
    await this.log(ctx, t.id, 'DUPLICATE');
    return {
      result: 'DUPLICATE',
      message: 'Already checked in.',
      ticket: { ...base, checkedInAt: t.checkedInAt, checkedInBy: gate?.label ?? null },
    };
  }

  /** Reverses a check-in made by this pass in the last minute (a mis-tap). */
  async undo(ctx: CrewContext, ticketId: string): Promise<{ undone: boolean; message: string }> {
    const undone = await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        UPDATE event_tickets
        SET status = 'ISSUED', checked_in_at = NULL, checked_in_pass_id = NULL
        WHERE id = ${ticketId}::uuid AND event_id = ${ctx.eventId}::uuid
          AND status = 'CHECKED_IN' AND checked_in_pass_id = ${ctx.passId}::uuid
          AND checked_in_at > ((now() AT TIME ZONE 'UTC') - make_interval(secs => ${BOOKING_LIMITS.undoSeconds}::double precision))
        RETURNING id`;
      if (rows.length === 0) return false;
      await tx.$executeRaw`UPDATE events SET checked_in_count = GREATEST(checked_in_count - 1, 0) WHERE id = ${ctx.eventId}::uuid`;
      await tx.eventScan.create({
        data: {
          tenantId: ctx.tenantId,
          eventId: ctx.eventId,
          ticketId,
          passId: ctx.passId,
          result: 'UNDO',
        },
      });
      return true;
    });
    if (undone) await this.redis.del(`crew:stats:${ctx.eventId}`);
    return {
      undone,
      message: undone
        ? 'Check-in undone.'
        : `Only a check-in made on this phone in the last ${BOOKING_LIMITS.undoSeconds} seconds can be undone.`,
    };
  }

  // ── looking people up ───────────────────────────────────────────────────

  /** Name or code search. Desk passes only; shows no contact details. */
  async search(ctx: CrewContext, q: string) {
    this.requireDesk(ctx);
    const term = (q ?? '').trim();
    if (term.length < 2) return { data: [] };
    const rows = await this.db.eventTicket.findMany({
      where: {
        eventId: ctx.eventId,
        status: { in: ACTIVE },
        OR: [
          { holderName: { contains: term, mode: 'insensitive' } },
          { code: term.toUpperCase() },
          { user: { name: { contains: term, mode: 'insensitive' } } },
        ],
      },
      orderBy: { holderName: 'asc' },
      take: 15,
      include: { user: { select: { name: true } } },
    });
    return {
      data: rows.map((t) => ({
        id: t.id,
        holderName: t.holderName,
        code: t.code,
        isGuest: t.isGuest,
        registrant: t.user.name,
        status: t.status,
        checkedInAt: t.checkedInAt,
      })),
    };
  }

  /** Numbers for the scanner's header. Cached for a few seconds per event. */
  async stats(ctx: CrewContext) {
    const key = `crew:stats:${ctx.eventId}`;
    let shared = await this.redis.get<any>(key);
    if (!shared) {
      const event = await this.eventInfo(ctx.eventId);
      const [expected, checkedIn, recent, lastMinute] = await Promise.all([
        this.db.eventTicket.count({ where: { eventId: ctx.eventId, status: { in: ACTIVE } } }),
        this.db.eventTicket.count({ where: { eventId: ctx.eventId, status: 'CHECKED_IN' } }),
        this.db.eventTicket.findMany({
          where: { eventId: ctx.eventId, status: 'CHECKED_IN' },
          orderBy: { checkedInAt: 'desc' },
          take: 8,
          select: { id: true, holderName: true, checkedInAt: true },
        }),
        this.db.eventTicket.count({
          where: {
            eventId: ctx.eventId,
            status: 'CHECKED_IN',
            checkedInAt: { gt: new Date(Date.now() - 60_000) },
          },
        }),
      ]);
      shared = {
        expected,
        checkedIn,
        remaining: Math.max(0, expected - checkedIn),
        venueCapacity: event?.venueCapacity ?? null,
        overVenueCapacity: event?.venueCapacity != null && checkedIn > event.venueCapacity,
        perMinute: lastMinute,
        recent,
      };
      await this.redis.set(key, shared, 3);
    }
    const mine = await this.db.eventTicket.count({
      where: { eventId: ctx.eventId, checkedInPassId: ctx.passId, status: 'CHECKED_IN' },
    });
    return { ...shared, mine, pass: { label: ctx.label, level: ctx.level } };
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private requireDesk(ctx: CrewContext) {
    if (ctx.level !== 'DESK') {
      throw new ForbiddenException({
        code: 'CREW_DESK_ONLY',
        message: 'This pass can scan but not search. Ask the organiser for a desk pass.',
      });
    }
  }

  private async eventInfo(eventId: string): Promise<EventInfo | null> {
    const key = `crew:event:${eventId}`;
    const cached = await this.redis.get<any>(key);
    if (cached) {
      return {
        ...cached,
        startDate: new Date(cached.startDate),
        endDate: new Date(cached.endDate),
        checkInOpensAt: cached.checkInOpensAt ? new Date(cached.checkInOpensAt) : null,
        checkInClosesAt: cached.checkInClosesAt ? new Date(cached.checkInClosesAt) : null,
      };
    }
    const e = await this.db.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        checkInOpensAt: true,
        checkInClosesAt: true,
        venueCapacity: true,
      },
    });
    if (e) await this.redis.set(key, e, 10);
    return e;
  }

  /** Every attempt is logged: it is what the arrival and duplicate analytics are built from. */
  private async log(ctx: CrewContext, ticketId: string | null, result: ScanResult) {
    await this.db.eventScan
      .create({
        data: {
          tenantId: ctx.tenantId,
          eventId: ctx.eventId,
          ticketId,
          passId: ctx.passId,
          result,
        },
      })
      .catch(() => undefined);
  }
}
