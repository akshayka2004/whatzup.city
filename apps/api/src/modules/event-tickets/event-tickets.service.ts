// ============================================================
// Event RSVP and tickets — the attendee side and the host's settings.
//
// Seats are only ever changed by one conditional UPDATE (see reserveSeats / releaseSeats), so two
// people can never take the last seat, and a database CHECK keeps the count inside 0..capacity
// even if this code is wrong. Scanning lives in event-scan.service.ts.
// ============================================================

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  BOOKING_LIMITS,
  BOOKING_STATE_LABEL,
  RSVP_SOURCES,
  bookingState,
  cancelDeadline,
  seatsLeft,
  type BookingState,
} from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { generatePublicCode } from '../../common/utils/public-code';
import { ticketQr } from '../../common/utils/ticket-signing';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingSettingsDto, RsvpDto } from './dto/event-tickets.dto';
import { EventActor, assertEventHost, canManagePlatformEvents, hit } from './event-access';

const BOOKING_CACHE_SECONDS = 5;
const ACTIVE = ['ISSUED', 'CHECKED_IN'];

const EVENT_FOR_BOOKING = {
  id: true,
  tenantId: true,
  title: true,
  status: true,
  businessId: true,
  bookingMode: true,
  bookingApproval: true,
  capacity: true,
  seatsTaken: true,
  rsvpOpensAt: true,
  rsvpClosesAt: true,
  startDate: true,
  endDate: true,
  maxPerUser: true,
  cancelCutoffHours: true,
} as const;

const STATE_MESSAGE: Record<BookingState, string> = {
  NONE: 'This event does not take RSVPs on the platform.',
  PENDING_APPROVAL: BOOKING_STATE_LABEL.PENDING_APPROVAL,
  REJECTED: BOOKING_STATE_LABEL.REJECTED,
  NOT_OPEN: BOOKING_STATE_LABEL.NOT_OPEN,
  OPEN: '',
  FULL: 'This event is fully booked.',
  CLOSED: BOOKING_STATE_LABEL.CLOSED,
  ENDED: BOOKING_STATE_LABEL.ENDED,
  CANCELLED: BOOKING_STATE_LABEL.CANCELLED,
};

function stateError(state: BookingState) {
  return new ConflictException({
    statusCode: 409,
    code: state === 'FULL' ? 'EVENT_FULL' : `RSVP_${state}`,
    message: STATE_MESSAGE[state],
  });
}

type Tx = Prisma.TransactionClient;
type IssueOptions = { guests: string[]; source: string; idempotencyKey?: string };

@Injectable()
export class EventTicketsService {
  private readonly logger = new Logger(EventTicketsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  // ── what the public event page needs ─────────────────────────────────────

  /** Live availability. Cached for a few seconds; the RSVP itself always re-checks the database. */
  async getBooking(eventId: string) {
    const key = `event-booking:${eventId}`;
    const cached = await this.redis.get<any>(key);
    if (cached) return cached;

    const e = await this.db.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { ...EVENT_FOR_BOOKING, minAge: true, bookingNote: true },
    });
    if (!e) throw new NotFoundException('Event not found');

    const state = bookingState(e);
    const body = {
      eventId: e.id,
      mode: e.bookingMode,
      state,
      stateLabel: BOOKING_STATE_LABEL[state],
      capacity: e.capacity,
      seatsLeft: seatsLeft(e),
      opensAt: e.rsvpOpensAt,
      closesAt: e.rsvpClosesAt ?? e.startDate,
      maxPerUser: Math.min(e.maxPerUser, BOOKING_LIMITS.maxPerUserCap),
      cancelDeadline: new Date(cancelDeadline(e)).toISOString(),
      minAge: e.minAge,
      note: e.bookingNote,
      waitlistOpen: state === 'FULL',
    };
    await this.redis.set(key, body, BOOKING_CACHE_SECONDS);
    return body;
  }

  /** The caller's tickets and waitlist place for one event. */
  async myBooking(userId: string, eventId: string) {
    const [tickets, waiting] = await Promise.all([
      this.db.eventTicket.findMany({
        where: { eventId, userId, status: { in: ACTIVE } },
        orderBy: [{ isGuest: 'asc' }, { issuedAt: 'asc' }],
        select: {
          id: true,
          code: true,
          holderName: true,
          isGuest: true,
          status: true,
          checkedInAt: true,
        },
      }),
      this.db.eventWaitlist.findFirst({ where: { eventId, userId, promotedAt: null } }),
    ]);
    let position: number | null = null;
    if (waiting) {
      position =
        1 +
        (await this.db.eventWaitlist.count({
          where: { eventId, promotedAt: null, createdAt: { lt: waiting.createdAt } },
        }));
    }
    return { tickets, waitlist: waiting ? { seats: waiting.seats, position } : null };
  }

  // ── RSVP ────────────────────────────────────────────────────────────────

  async rsvp(userId: string, eventId: string, dto: RsvpDto) {
    await hit(this.redis, `rl:rsvp:${userId}`, 15, 60, 'Too many attempts. Try again in a minute.');

    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      select: { id: true, name: true, tenantId: true },
    });
    if (!user) throw new NotFoundException('Account not found');

    const guests = this.cleanNames(dto.guests);
    const source = this.cleanSource(dto.source);

    let result: { tickets: any[]; already: boolean; event: any } | null = null;
    for (let attempt = 0; attempt < 3 && !result; attempt++) {
      try {
        result = await this.db.$transaction(
          (tx) =>
            this.issue(tx, eventId, user, { guests, source, idempotencyKey: dto.idempotencyKey }),
          { timeout: 10_000 },
        );
      } catch (err: any) {
        // A ticket code clashed (rare); the whole attempt rolled back, so try again with new codes.
        if (err?.code === 'P2002' && attempt < 2) continue;
        throw err;
      }
    }
    if (!result) throw new ConflictException('Could not complete your RSVP. Please try again.');

    if (!result.already) {
      await this.redis.del(`event-booking:${eventId}`);
      void this.notify(user, {
        title: `You're registered: ${result.event.title}`,
        body: `${result.tickets.length === 1 ? 'Your ticket is' : 'Your tickets are'} ready under My tickets. Show the QR at the gate.`,
        type: 'EVENT_TICKET',
        metadata: { eventId },
      });
    }
    return {
      already: result.already,
      tickets: result.tickets.map(this.publicTicket),
    };
  }

  /** Issues tickets inside a transaction. Used by RSVP and by waitlist promotion. */
  private async issue(
    tx: Tx,
    eventId: string,
    user: { id: string; name: string },
    opts: IssueOptions,
  ) {
    // One person's RSVPs for one event run one after another, so limits and retries cannot race.
    // Selected as a column of its own: Prisma cannot read the `void` the lock function returns
    // and fails the whole query with P2010.
    await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtextextended(${`${eventId}:${user.id}`}, 0))) AS l`;

    const event = await tx.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: EVENT_FOR_BOOKING,
    });
    if (!event) throw new NotFoundException('Event not found');

    const state = bookingState(event);
    if (state !== 'OPEN') throw stateError(state);

    const existing = await tx.eventTicket.findMany({
      where: { eventId, userId: user.id, status: { in: ACTIVE } },
      orderBy: { issuedAt: 'asc' },
    });

    if (opts.idempotencyKey) {
      const same = existing.filter((t) => t.idempotencyKey === opts.idempotencyKey);
      if (same.length) return { tickets: same, already: true, event };
    }

    const hasPrimary = existing.some((t) => !t.isGuest);
    if (hasPrimary && opts.guests.length === 0) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_REGISTERED',
        message: 'You are already registered for this event.',
      });
    }
    const seats = (hasPrimary ? 0 : 1) + opts.guests.length;
    const perUser = Math.min(event.maxPerUser, BOOKING_LIMITS.maxPerUserCap);
    if (existing.length + seats > perUser) {
      throw new ConflictException({
        statusCode: 409,
        code: 'SEAT_LIMIT',
        message:
          perUser === 1
            ? 'This event allows one ticket per account.'
            : `This event allows up to ${perUser} tickets per account. You already have ${existing.length}.`,
      });
    }

    if (!(await this.reserveSeats(tx, eventId, seats))) throw stateError('FULL');

    const groupId = randomUUID();
    const names: { name: string; guest: boolean }[] = [
      ...(hasPrimary ? [] : [{ name: (user.name || 'Guest').trim().slice(0, 120), guest: false }]),
      ...opts.guests.map((name) => ({ name, guest: true })),
    ];
    const tickets = [];
    for (const n of names) {
      tickets.push(
        await tx.eventTicket.create({
          data: {
            tenantId: event.tenantId,
            eventId,
            userId: user.id,
            groupId,
            holderName: n.name,
            isGuest: n.guest,
            code: generatePublicCode(),
            source: opts.source,
            idempotencyKey: opts.idempotencyKey ?? null,
          },
        }),
      );
    }
    return { tickets, already: false, event };
  }

  /** Takes `seats` only if they fit. The one place a seat is ever added. */
  private async reserveSeats(tx: Tx, eventId: string, seats: number): Promise<boolean> {
    const changed = await tx.$executeRaw`
      UPDATE events SET seats_taken = seats_taken + ${seats}
      WHERE id = ${eventId}::uuid AND (capacity IS NULL OR seats_taken + ${seats} <= capacity)`;
    return changed === 1;
  }

  private async releaseSeats(tx: Tx, eventId: string, seats: number) {
    await tx.$executeRaw`
      UPDATE events SET seats_taken = GREATEST(seats_taken - ${seats}, 0) WHERE id = ${eventId}::uuid`;
  }

  // ── cancelling and the waitlist ─────────────────────────────────────────

  async cancel(userId: string, eventId: string, ticketIds?: string[]) {
    const event = await this.db.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: EVENT_FOR_BOOKING,
    });
    if (!event) throw new NotFoundException('Event not found');
    if (Date.now() > cancelDeadline(event)) {
      throw new ConflictException({
        statusCode: 409,
        code: 'CANCEL_TOO_LATE',
        message: 'The cancellation window for this event has closed.',
      });
    }

    const cancelled = await this.db.$transaction(async (tx) => {
      const mine = await tx.eventTicket.findMany({
        where: {
          eventId,
          userId,
          status: 'ISSUED',
          ...(ticketIds?.length ? { id: { in: ticketIds } } : {}),
        },
        select: { id: true },
      });
      if (mine.length === 0) {
        throw new NotFoundException(
          'There is nothing to cancel. Tickets already used cannot be cancelled.',
        );
      }
      const res = await tx.eventTicket.updateMany({
        where: { id: { in: mine.map((t) => t.id) }, status: 'ISSUED' },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await this.releaseSeats(tx, eventId, res.count);
      return res.count;
    });

    await this.redis.del(`event-booking:${eventId}`);
    await this.promoteWaitlist(eventId).catch((err) =>
      this.logger.error(`Waitlist promotion failed for ${eventId}: ${err.message}`),
    );
    return { cancelled };
  }

  async joinWaitlist(userId: string, eventId: string, seats = 1) {
    await hit(this.redis, `rl:waitlist:${userId}`, 10, 60);
    const e = await this.db.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: EVENT_FOR_BOOKING,
    });
    if (!e) throw new NotFoundException('Event not found');
    const state = bookingState(e);
    if (state !== 'FULL') {
      throw new ConflictException({
        statusCode: 409,
        code: 'WAITLIST_NOT_NEEDED',
        message:
          state === 'OPEN' ? 'There are seats available. Register directly.' : STATE_MESSAGE[state],
      });
    }
    const held = await this.db.eventTicket.count({
      where: { eventId, userId, status: { in: ACTIVE } },
    });
    const perUser = Math.min(e.maxPerUser, BOOKING_LIMITS.maxPerUserCap);
    const want = Math.max(1, Math.min(seats, perUser - held));
    if (held >= perUser) {
      throw new ConflictException({
        statusCode: 409,
        code: 'SEAT_LIMIT',
        message: 'You already hold the most tickets this event allows.',
      });
    }
    const entry = await this.db.eventWaitlist.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { tenantId: e.tenantId, eventId, userId, seats: want },
      update: { seats: want, promotedAt: null },
    });
    return this.myBooking(userId, entry.eventId);
  }

  async leaveWaitlist(userId: string, eventId: string) {
    await this.db.eventWaitlist.deleteMany({ where: { eventId, userId, promotedAt: null } });
    return { left: true };
  }

  /** Gives freed seats to the people waiting, in the order they joined. */
  async promoteWaitlist(eventId: string) {
    for (let guard = 0; guard < 50; guard++) {
      const event = await this.db.event.findFirst({
        where: { id: eventId, deletedAt: null },
        select: EVENT_FOR_BOOKING,
      });
      if (!event) return;
      const state = bookingState(event);
      if (state !== 'OPEN') return;
      const free = seatsLeft(event) ?? Infinity;
      if (free <= 0) return;

      const next = await this.db.eventWaitlist.findMany({
        where: { eventId, promotedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: { user: { select: { id: true, name: true, tenantId: true } } },
      });
      const fit = next.find((w) => w.seats <= free);
      if (!fit) return;

      try {
        const guests = Array.from(
          { length: Math.max(0, fit.seats - 1) },
          (_, i) => `Guest ${i + 1}`,
        );
        await this.db.$transaction(
          async (tx) => {
            await this.issue(tx, eventId, fit.user, { guests, source: 'waitlist' });
            await tx.eventWaitlist.update({
              where: { id: fit.id },
              data: { promotedAt: new Date() },
            });
          },
          { timeout: 10_000 },
        );
        await this.redis.del(`event-booking:${eventId}`);
        void this.notify(fit.user, {
          title: `A seat opened up: ${event.title}`,
          body: 'You are in. Your ticket is under My tickets.',
          type: 'EVENT_TICKET',
          metadata: { eventId },
        });
      } catch (err: any) {
        // Someone on the list cannot be placed (limit, closed). Drop them so the rest can move up.
        this.logger.warn(`Waitlist entry ${fit.id} skipped: ${err.message}`);
        await this.db.eventWaitlist.delete({ where: { id: fit.id } }).catch(() => undefined);
      }
    }
  }

  // ── my tickets ──────────────────────────────────────────────────────────

  async mine(userId: string) {
    const [tickets, waiting] = await Promise.all([
      this.db.eventTicket.findMany({
        where: { userId, status: { in: ACTIVE }, event: { deletedAt: null } },
        include: { event: { select: this.eventCard() } },
        orderBy: { event: { startDate: 'asc' } },
        take: 200,
      }),
      this.db.eventWaitlist.findMany({
        where: { userId, promotedAt: null, event: { deletedAt: null } },
        include: { event: { select: this.eventCard() } },
        take: 50,
      }),
    ]);

    const byEvent = new Map<string, any>();
    for (const t of tickets) {
      const row = byEvent.get(t.eventId) ?? {
        event: t.event,
        cancelDeadline: new Date(cancelDeadline(t.event)).toISOString(),
        tickets: [],
      };
      row.tickets.push(this.publicTicket(t));
      byEvent.set(t.eventId, row);
    }
    return {
      items: [...byEvent.values()],
      waitlist: waiting.map((w) => ({ event: w.event, seats: w.seats })),
    };
  }

  async getTicket(userId: string, ticketId: string) {
    const t = await this.db.eventTicket.findFirst({
      where: { id: ticketId, userId },
      include: { event: { select: { ...this.eventCard(), bookingNote: true, minAge: true } } },
    });
    if (!t) throw new NotFoundException('Ticket not found');
    return {
      ...this.publicTicket(t),
      qr: t.status === 'CANCELLED' ? null : ticketQr(t.id),
      event: t.event,
      cancelDeadline: new Date(cancelDeadline(t.event)).toISOString(),
    };
  }

  // ── host: settings ──────────────────────────────────────────────────────

  async hostSummary(actor: EventActor, eventId: string) {
    const e = await assertEventHost(this.db, eventId, actor);
    const state = bookingState(e);
    return {
      id: e.id,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      venue: e.venue,
      status: e.status,
      bookingMode: e.bookingMode,
      bookingApproval: e.bookingApproval,
      state,
      stateLabel: BOOKING_STATE_LABEL[state],
      capacity: e.capacity,
      seatsTaken: e.seatsTaken,
      checkedInCount: e.checkedInCount,
      rsvpOpensAt: e.rsvpOpensAt,
      rsvpClosesAt: e.rsvpClosesAt,
      maxPerUser: e.maxPerUser,
      cancelCutoffHours: e.cancelCutoffHours,
      venueCapacity: e.venueCapacity,
      minAge: e.minAge,
      bookingNote: e.bookingNote,
      checkInOpensAt: e.checkInOpensAt,
      checkInClosesAt: e.checkInClosesAt,
      isPlatformEvent: !e.businessId,
    };
  }

  async updateBooking(actor: EventActor, eventId: string, dto: BookingSettingsDto) {
    const event = await assertEventHost(this.db, eventId, actor);
    const data: Prisma.EventUpdateInput = {};
    const has = (k: keyof BookingSettingsDto) => dto[k] !== undefined;

    const mode = dto.bookingMode ?? event.bookingMode;
    if (mode === 'NONE' && event.bookingMode === 'RSVP') {
      const active = await this.db.eventTicket.count({
        where: { eventId, status: { in: ACTIVE } },
      });
      if (active > 0) {
        throw new ConflictException({
          statusCode: 409,
          code: 'HAS_TICKETS',
          message: 'People already hold tickets. Cancel the event instead of turning RSVP off.',
        });
      }
    }
    if (has('bookingMode')) data.bookingMode = mode;

    if (has('capacity')) {
      if (dto.capacity != null && dto.capacity < event.seatsTaken) {
        throw new BadRequestException(
          `Capacity cannot be lower than the ${event.seatsTaken} seats already taken.`,
        );
      }
      data.capacity = dto.capacity ?? null;
    }
    const capacity = has('capacity') ? (dto.capacity ?? null) : event.capacity;
    if (has('venueCapacity')) {
      data.venueCapacity = dto.venueCapacity ?? null;
    }
    const venueCap = has('venueCapacity') ? (dto.venueCapacity ?? null) : event.venueCapacity;
    if (capacity != null && venueCap != null && capacity > venueCap) {
      throw new BadRequestException(
        'Capacity is more than the venue can hold. Check both numbers.',
      );
    }

    const opens = has('rsvpOpensAt') ? this.date(dto.rsvpOpensAt) : event.rsvpOpensAt;
    const closes = has('rsvpClosesAt') ? this.date(dto.rsvpClosesAt) : event.rsvpClosesAt;
    if (opens && closes && opens >= closes) {
      throw new BadRequestException('RSVP must open before it closes.');
    }
    if (closes && closes > event.endDate) {
      throw new BadRequestException('RSVP cannot stay open past the end of the event.');
    }
    if (has('rsvpOpensAt')) data.rsvpOpensAt = opens;
    if (has('rsvpClosesAt')) data.rsvpClosesAt = closes;

    const ciOpens = has('checkInOpensAt') ? this.date(dto.checkInOpensAt) : event.checkInOpensAt;
    const ciCloses = has('checkInClosesAt')
      ? this.date(dto.checkInClosesAt)
      : event.checkInClosesAt;
    if (ciOpens && ciCloses && ciOpens >= ciCloses) {
      throw new BadRequestException('Check-in must open before it closes.');
    }
    if (has('checkInOpensAt')) data.checkInOpensAt = ciOpens;
    if (has('checkInClosesAt')) data.checkInClosesAt = ciCloses;

    if (has('maxPerUser')) data.maxPerUser = dto.maxPerUser;
    if (has('cancelCutoffHours')) data.cancelCutoffHours = dto.cancelCutoffHours;
    if (has('minAge')) data.minAge = dto.minAge ?? null;
    if (has('bookingNote')) data.bookingNote = dto.bookingNote?.trim() || null;

    // Moderation: a business turning RSVP on waits for approval. Platform events and platform
    // staff skip it, and EVENT_RSVP_AUTO_APPROVE=true switches the queue off.
    if (mode === 'RSVP' && event.bookingMode !== 'RSVP') {
      const skip =
        !event.businessId ||
        canManagePlatformEvents(actor) ||
        process.env.EVENT_RSVP_AUTO_APPROVE === 'true';
      data.bookingApproval = skip ? 'APPROVED' : 'PENDING';
    }

    const updated = await this.db.event.update({ where: { id: eventId }, data });
    await this.redis.del(`event-booking:${eventId}`);
    this.audit.log({
      tenantId: event.tenantId,
      userId: actor.id,
      action: 'EVENT_BOOKING_SETTINGS',
      resource: 'EVENT',
      resourceId: eventId,
    });
    // Anyone waiting must be placed if seats were added.
    if (updated.bookingMode === 'RSVP' && (updated.capacity ?? Infinity) > event.seatsTaken) {
      void this.promoteWaitlist(eventId).catch(() => undefined);
    }
    return this.hostSummary(actor, eventId);
  }

  // ── moderation ──────────────────────────────────────────────────────────

  async pendingApprovals(page = 1) {
    const take = 30;
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    const where = {
      deletedAt: null,
      bookingMode: 'RSVP',
      bookingApproval: 'PENDING',
    };
    const [data, total] = await Promise.all([
      this.db.event.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        include: {
          business: {
            select: { id: true, name: true, city: true, ownerId: true, isVerified: true },
          },
        },
      }),
      this.db.event.count({ where }),
    ]);
    return { data, meta: { total, page: Math.max(1, Number(page) || 1), limit: take } };
  }

  async decide(adminId: string, eventId: string, approve: boolean, reason?: string) {
    const event = await this.db.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: { business: { select: { ownerId: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.bookingMode !== 'RSVP')
      throw new BadRequestException('This event is not taking RSVPs.');

    await this.db.event.update({
      where: { id: eventId },
      data: { bookingApproval: approve ? 'APPROVED' : 'REJECTED' },
    });
    await this.redis.del(`event-booking:${eventId}`);
    this.audit.log({
      tenantId: event.tenantId,
      userId: adminId,
      action: approve ? 'EVENT_RSVP_APPROVED' : 'EVENT_RSVP_REJECTED',
      resource: 'EVENT',
      resourceId: eventId,
    });

    const ownerId = event.business?.ownerId;
    if (ownerId) {
      const owner = await this.db.user.findUnique({
        where: { id: ownerId },
        select: { id: true, tenantId: true },
      });
      if (owner) {
        void this.notify(owner, {
          title: approve ? `RSVP approved: ${event.title}` : `RSVP not approved: ${event.title}`,
          body: approve
            ? 'People can now register for your event and receive tickets.'
            : `Your event cannot take RSVPs yet.${reason ? ` ${reason}` : ''}`,
          type: 'EVENT_APPROVAL',
          metadata: { eventId },
        });
      }
    }
    return { approved: approve };
  }

  // ── host: people ────────────────────────────────────────────────────────

  async attendees(
    actor: EventActor,
    eventId: string,
    q: { status?: string; search?: string; page?: number; limit?: number },
  ) {
    await assertEventHost(this.db, eventId, actor);
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
    const status = ['ISSUED', 'CHECKED_IN', 'CANCELLED'].includes(q.status ?? '')
      ? q.status
      : undefined;
    const search = q.search?.trim();
    const where: Prisma.EventTicketWhereInput = {
      eventId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { holderName: { contains: search, mode: 'insensitive' } },
              { code: { equals: search.toUpperCase() } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.eventTicket.findMany({
        where,
        orderBy: [{ issuedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { name: true, email: true, phone: true } } },
      }),
      this.db.eventTicket.count({ where }),
    ]);
    return {
      data: rows.map((t) => ({
        id: t.id,
        code: t.code,
        holderName: t.holderName,
        isGuest: t.isGuest,
        status: t.status,
        source: t.source,
        issuedAt: t.issuedAt,
        checkedInAt: t.checkedInAt,
        registrant: { name: t.user.name, email: t.user.email, phone: t.user.phone },
      })),
      meta: { total, page, limit },
    };
  }

  /** CSV of every ticket. Logged, because it carries contact details. */
  async attendeesCsv(actor: EventActor, eventId: string): Promise<string> {
    const event = await assertEventHost(this.db, eventId, actor);
    const rows = await this.db.eventTicket.findMany({
      where: { eventId },
      orderBy: { issuedAt: 'asc' },
      include: { user: { select: { name: true, email: true, phone: true } } },
      take: 20_000,
    });
    this.audit.log({
      tenantId: event.tenantId,
      userId: actor.id,
      action: 'EVENT_ATTENDEES_EXPORT',
      resource: 'EVENT',
      resourceId: eventId,
    });

    // A cell starting with = + - @ would run as a formula in Excel; a leading quote stops that.
    const cell = (v: unknown) => {
      let s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const head = [
      'Ticket code',
      'Name',
      'Guest',
      'Status',
      'Registered by',
      'Email',
      'Phone',
      'Source',
      'RSVP time',
      'Check-in time',
    ];
    const lines = rows.map((t) =>
      [
        t.code,
        t.holderName,
        t.isGuest ? 'Yes' : 'No',
        t.status,
        t.user.name,
        t.user.email,
        t.user.phone,
        t.source,
        t.issuedAt,
        t.checkedInAt,
      ]
        .map(cell)
        .join(','),
    );
    return [head.map(cell).join(','), ...lines].join('\r\n');
  }

  async message(actor: EventActor, eventId: string, title: string, body: string) {
    const event = await assertEventHost(this.db, eventId, actor);
    await hit(
      this.redis,
      `rl:event-message:${eventId}`,
      3,
      24 * 3600,
      'You can send up to 3 messages a day for one event.',
    );
    const holders = await this.db.eventTicket.findMany({
      where: { eventId, status: { in: ACTIVE } },
      distinct: ['userId'],
      select: { user: { select: { id: true, tenantId: true } } },
    });
    for (const h of holders) {
      void this.notify(h.user, {
        title: `${event.title}: ${title}`.slice(0, 120),
        body,
        type: 'EVENT_UPDATE',
        metadata: { eventId },
      });
    }
    this.audit.log({
      tenantId: event.tenantId,
      userId: actor.id,
      action: 'EVENT_MESSAGE_ATTENDEES',
      resource: 'EVENT',
      resourceId: eventId,
    });
    return { sentTo: holders.length };
  }

  // ── hooks for the events module ─────────────────────────────────────────

  /** Date, venue or status changed on an event people hold tickets for: tell them. */
  async onEventChanged(
    before: { startDate: Date; endDate: Date; venue: string | null; status: string },
    after: {
      id: string;
      title: string;
      startDate: Date;
      endDate: Date;
      venue: string | null;
      status: string;
      bookingMode: string;
    },
  ) {
    if (after.bookingMode !== 'RSVP') return;
    const changes: string[] = [];
    if (after.status !== 'ACTIVE' && before.status === 'ACTIVE')
      changes.push('The event has been cancelled.');
    if (+before.startDate !== +after.startDate || +before.endDate !== +after.endDate) {
      changes.push(
        `New time: ${after.startDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
      );
    }
    if ((before.venue ?? '') !== (after.venue ?? ''))
      changes.push(`New venue: ${after.venue ?? 'to be announced'}.`);
    if (!changes.length) return;

    await this.redis.del(`event-booking:${after.id}`);
    const holders = await this.db.eventTicket.findMany({
      where: { eventId: after.id, status: { in: ACTIVE } },
      distinct: ['userId'],
      select: { user: { select: { id: true, tenantId: true } } },
    });
    for (const h of holders) {
      void this.notify(h.user, {
        title: `Update: ${after.title}`,
        body: `${changes.join(' ')} Your ticket stays valid.`,
        type: 'EVENT_UPDATE',
        metadata: { eventId: after.id },
      });
    }
  }

  /** The event was deleted: tickets are void, so say so. */
  async onEventRemoved(eventId: string, title: string) {
    await this.redis.del(`event-booking:${eventId}`);
    const holders = await this.db.eventTicket.findMany({
      where: { eventId, status: { in: ACTIVE } },
      distinct: ['userId'],
      select: { user: { select: { id: true, tenantId: true } } },
    });
    for (const h of holders) {
      void this.notify(h.user, {
        title: `Cancelled: ${title}`,
        body: 'This event has been removed, so your ticket is no longer valid.',
        type: 'EVENT_UPDATE',
        metadata: { eventId },
      });
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private eventCard() {
    return {
      id: true,
      title: true,
      posterImage: true,
      venue: true,
      city: true,
      startDate: true,
      endDate: true,
      status: true,
      cancelCutoffHours: true,
    } as const;
  }

  private publicTicket = (t: any) => ({
    id: t.id,
    code: t.code,
    holderName: t.holderName,
    isGuest: t.isGuest,
    status: t.status,
    checkedInAt: t.checkedInAt ?? null,
    eventId: t.eventId,
  });

  private cleanNames(input?: string[]): string[] {
    const out = (input ?? [])
      .map((n) => (typeof n === 'string' ? n.replace(/\s+/g, ' ').trim() : ''))
      .filter(Boolean);
    if (out.some((n) => n.length > BOOKING_LIMITS.nameMax)) {
      throw new BadRequestException('A guest name is too long.');
    }
    return out.slice(0, BOOKING_LIMITS.maxPerUserCap - 1);
  }

  private cleanSource(input?: string): string {
    return (RSVP_SOURCES as readonly string[]).includes(input ?? '') ? (input as string) : 'direct';
  }

  private date(v: string | null | undefined): Date | null {
    if (v == null) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('That date is not valid.');
    return d;
  }

  /** In-app notice. A failure here must never undo an RSVP, so it is only logged. */
  private async notify(
    user: { id: string; tenantId: string },
    n: { title: string; body: string; type: string; metadata?: unknown },
  ) {
    try {
      await this.notifications.send({
        tenantId: user.tenantId,
        userId: user.id,
        title: n.title,
        body: n.body,
        type: n.type,
        metadata: n.metadata,
      });
    } catch (err: any) {
      this.logger.warn(`Notification failed for ${user.id}: ${err.message}`);
    }
  }
}
