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
  Optional,
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
  isPaidEvent,
  parseTiers,
  rupees,
  unitPriceFor,
  IN_MOBILE_PATTERN,
  UPI_ID_PATTERN,
  normalizeMobile,
  type BookingState,
} from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { generatePublicCode } from '../../common/utils/public-code';
import { ticketQr } from '../../common/utils/ticket-signing';
import { AuditService } from '../audit/audit.service';
import { NotificationAudienceService } from '../notifications/notification-audience.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingSettingsDto, RsvpDto } from './dto/event-tickets.dto';
import {
  EventActor,
  assertEventHost,
  attendeeProfiles,
  canManagePlatformEvents,
  canSeeContacts,
  hit,
} from './event-access';
import { logPayment } from './event-payment-util';

const BOOKING_CACHE_SECONDS = 5;
/** Tickets that admit someone. */
const ACTIVE = ['ISSUED', 'CHECKED_IN'];
/** Tickets that count against a person's limit: admitted ones plus seats held while they pay. */
const HELD = ['ISSUED', 'CHECKED_IN', 'PENDING'];

const EVENT_FOR_BOOKING = {
  id: true,
  tenantId: true,
  title: true,
  status: true,
  businessId: true,
  bookingMode: true,
  bookingApproval: true,
  bookingRejectReason: true,
  bookingReviewedAt: true,
  bookingResubmitCount: true,
  capacity: true,
  seatsTaken: true,
  rsvpOpensAt: true,
  rsvpClosesAt: true,
  startDate: true,
  endDate: true,
  maxPerUser: true,
  cancelCutoffHours: true,
  ticketType: true,
  ticketPrice: true,
  ticketTiers: true,
  payEnabled: true,
  payWindowHours: true,
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
type IssueOptions = { guests: string[]; source: string; idempotencyKey?: string; tier?: string };

@Injectable()
export class EventTicketsService {
  private readonly logger = new Logger(EventTicketsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() private readonly audience?: NotificationAudienceService,
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
      payment: this.publicPayment(e),
    };
    await this.redis.set(key, body, BOOKING_CACHE_SECONDS);
    return body;
  }

  /** What an attendee needs to know about price before they RSVP. No payee details here: those are public-cached. */
  private publicPayment(e: {
    payEnabled: boolean;
    ticketType: string;
    ticketPrice: unknown;
    ticketTiers: unknown;
    payWindowHours: number;
  }) {
    if (!e.payEnabled || !isPaidEvent(e)) return { required: false };
    const tiers = parseTiers(e.ticketTiers);
    return {
      required: true,
      price: tiers.length ? null : Number(e.ticketPrice),
      tiers,
      windowHours: e.payWindowHours,
    };
  }

  /** The caller's tickets, any payment they still owe, and waitlist place for one event. */
  async myBooking(userId: string, eventId: string) {
    const [tickets, waiting, payments] = await Promise.all([
      this.db.eventTicket.findMany({
        where: { eventId, userId, status: { in: HELD } },
        orderBy: [{ isGuest: 'asc' }, { issuedAt: 'asc' }],
        select: {
          id: true,
          code: true,
          holderName: true,
          isGuest: true,
          status: true,
          checkedInAt: true,
          paymentId: true,
        },
      }),
      this.db.eventWaitlist.findFirst({ where: { eventId, userId, promotedAt: null } }),
      this.db.eventPayment.findMany({
        where: { eventId, userId, status: { in: ['PENDING', 'SUBMITTED'] } },
        orderBy: { createdAt: 'desc' },
        select: this.paymentCard,
      }),
    ]);
    let position: number | null = null;
    if (waiting) {
      position =
        1 +
        (await this.db.eventWaitlist.count({
          where: { eventId, promotedAt: null, createdAt: { lt: waiting.createdAt } },
        }));
    }
    return {
      tickets,
      payments: payments.map(this.publicPaymentCard),
      waitlist: waiting ? { seats: waiting.seats, position } : null,
    };
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

    let result: { tickets: any[]; already: boolean; event: any; payment?: any } | null = null;
    for (let attempt = 0; attempt < 3 && !result; attempt++) {
      try {
        result = await this.db.$transaction(
          (tx) =>
            this.issue(tx, eventId, user, {
              guests,
              source,
              idempotencyKey: dto.idempotencyKey,
              tier: dto.tier,
            }),
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
      const p = result.payment;
      void this.notify(
        user,
        p
          ? {
              title: `Seat held: ${result.event.title}`,
              body: `Pay ${rupees(p.amount)} by UPI and send the reference number within ${result.event.payWindowHours} hours, or the seat goes back.`,
              type: 'EVENT_PAYMENT',
              metadata: { eventId, paymentId: p.id, url: `/tickets/pay/${p.id}` },
            }
          : {
              title: `You're registered: ${result.event.title}`,
              body: `${result.tickets.length === 1 ? 'Your ticket is' : 'Your tickets are'} ready under My tickets. Show the QR at the gate.`,
              type: 'EVENT_TICKET',
              metadata: { eventId, url: '/tickets' },
            },
      );
    }
    const payment =
      result.payment ??
      (result.tickets[0]?.paymentId
        ? await this.db.eventPayment.findUnique({
            where: { id: result.tickets[0].paymentId },
            select: this.paymentCard,
          })
        : null);
    return {
      already: result.already,
      tickets: result.tickets.map(this.publicTicket),
      payment: payment ? this.publicPaymentCard(payment) : null,
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
      where: { eventId, userId: user.id, status: { in: HELD } },
      orderBy: { issuedAt: 'asc' },
    });

    if (opts.idempotencyKey) {
      const same = existing.filter((t) => t.idempotencyKey === opts.idempotencyKey);
      if (same.length) return { tickets: same, already: true, event, payment: null };
    }

    if (existing.some((t) => t.status === 'PENDING')) {
      throw new ConflictException({
        statusCode: 409,
        code: 'PAYMENT_PENDING',
        message: 'You have a seat waiting for payment. Finish or cancel that payment first.',
      });
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

    // Paid events: the ticket type fixes the price. A price of zero (a free tier) skips payment.
    let unit: number | null = null;
    if (event.payEnabled && isPaidEvent(event)) {
      const tiers = parseTiers(event.ticketTiers);
      if (tiers.length && !opts.tier?.trim()) {
        throw new BadRequestException('Choose a ticket type.');
      }
      unit = unitPriceFor(event, opts.tier);
      if (unit === null) throw new BadRequestException('That ticket type is not available.');
    }
    const priced = unit !== null && unit > 0;

    if (!(await this.reserveSeats(tx, eventId, seats))) throw stateError('FULL');

    const groupId = randomUUID();
    const names: { name: string; guest: boolean }[] = [
      ...(hasPrimary ? [] : [{ name: (user.name || 'Guest').trim().slice(0, 120), guest: false }]),
      ...opts.guests.map((name) => ({ name, guest: true })),
    ];

    let payment: Awaited<ReturnType<Tx['eventPayment']['create']>> | null = null;
    if (priced) {
      const tier = parseTiers(event.ticketTiers).find(
        (t) => t.name.toLowerCase() === (opts.tier ?? '').trim().toLowerCase(),
      );
      payment = await tx.eventPayment.create({
        data: {
          tenantId: event.tenantId,
          eventId,
          userId: user.id,
          groupId,
          seats: names.length,
          tierName: tier?.name ?? null,
          unitPrice: unit!,
          amount: Math.round(unit! * names.length * 100) / 100,
          expiresAt: new Date(Date.now() + event.payWindowHours * 3_600_000),
        },
      });
      await logPayment(tx, {
        tenantId: event.tenantId,
        paymentId: payment.id,
        eventId,
        actorId: user.id,
        actorRole: 'ATTENDEE',
        action: 'CREATED',
        detail: {
          seats: names.length,
          amount: Number(payment.amount),
          tier: tier?.name ?? null,
          source: opts.source,
        },
      });
    }

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
            status: payment ? 'PENDING' : 'ISSUED',
            paymentId: payment?.id ?? null,
          },
        }),
      );
    }
    return { tickets, already: false, event, payment };
  }

  /** Takes `seats` only if they fit. The one place a seat is ever added. */
  private async reserveSeats(tx: Tx, eventId: string, seats: number): Promise<boolean> {
    const changed = await tx.$executeRaw`
      UPDATE events SET seats_taken = seats_taken + ${seats}
      WHERE id = ${eventId}::uuid AND (capacity IS NULL OR seats_taken + ${seats} <= capacity)`;
    return changed === 1;
  }

  async releaseSeats(tx: Tx, eventId: string, seats: number) {
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
        select: { id: true, paymentId: true },
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
      return { count: res.count, paid: mine.filter((t) => t.paymentId) };
    });

    await this.redis.del(`event-booking:${eventId}`);
    if (cancelled.paid.length) {
      await this.refundDue(event, userId, cancelled.paid).catch((err) =>
        this.logger.error(`Refund notice failed for ${eventId}: ${err.message}`),
      );
    }
    await this.promoteWaitlist(eventId).catch((err) =>
      this.logger.error(`Waitlist promotion failed for ${eventId}: ${err.message}`),
    );
    return { cancelled: cancelled.count };
  }

  /**
   * An attendee cancelled tickets the host had already been paid for. The platform holds no money,
   * so any refund is between them; this records it and tells the host how much may be owed.
   */
  private async refundDue(
    event: { id: string; tenantId: string; title: string; businessId: string | null },
    userId: string,
    paid: { id: string; paymentId: string | null }[],
  ) {
    const byPayment = new Map<string, number>();
    for (const t of paid) {
      if (t.paymentId) byPayment.set(t.paymentId, (byPayment.get(t.paymentId) ?? 0) + 1);
    }
    let owed = 0;
    for (const [paymentId, n] of byPayment) {
      const p = await this.db.eventPayment.findUnique({ where: { id: paymentId } });
      if (!p) continue;
      const amount = Number(p.unitPrice) * n;
      owed += amount;
      await logPayment(this.db, {
        tenantId: event.tenantId,
        paymentId,
        eventId: event.id,
        actorId: userId,
        actorRole: 'ATTENDEE',
        action: 'REFUND_DUE',
        detail: { tickets: n, amount },
      });
    }
    if (owed <= 0) return;
    this.audit.log({
      tenantId: event.tenantId,
      userId,
      action: 'EVENT_PAYMENT_REFUND_DUE',
      resource: 'EVENT',
      resourceId: event.id,
      metadata: { amount: owed },
    });
    void this.notifyHost(event, {
      title: `Ticket cancelled after payment: ${event.title}`,
      body: `An attendee cancelled paid tickets. About ${rupees(owed)} may need to be refunded by you directly.`,
      type: 'EVENT_PAYMENT',
      tab: 'payments',
    });
  }

  /**
   * Who runs an event's tickets: a business's owner and moderators (the people who can verify
   * payments), or, for events the platform hosts, platform staff who manage Events.
   */
  async hostRecipients(businessId: string | null) {
    if (this.audience) {
      return businessId
        ? this.audience.businessTeam(businessId, ['OWNER', 'MODERATOR'])
        : this.audience.platformStaff('events', 'manage');
    }
    const owner = await this.hostOwner(businessId);
    return owner ? [owner] : [];
  }

  /** The page where a host handles this event: the business dashboard, or the platform hub. */
  hostUrl(event: { id: string; businessId: string | null }, tab: string) {
    return event.businessId
      ? `/dashboard/events/${event.id}?tab=${tab}`
      : `/super-admin/events/${event.id}?tab=${tab}`;
  }

  /** Tell everyone who runs the event, with a link to the right page for them. */
  async notifyHost(
    event: { id: string; businessId: string | null },
    n: {
      title: string;
      body: string;
      type: string;
      tab: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    try {
      const recipients = await this.hostRecipients(event.businessId);
      for (const r of recipients) {
        void this.notify(r, {
          title: n.title,
          body: n.body,
          type: n.type,
          metadata: { eventId: event.id, ...n.metadata, url: this.hostUrl(event, n.tab) },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Host notification failed: ${err.message}`);
    }
  }

  /** The business owner to notify about an event, or null for platform-hosted events. */
  async hostOwner(businessId: string | null) {
    if (!businessId) return null;
    const b = await this.db.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });
    if (!b?.ownerId) return null;
    return this.db.user.findUnique({
      where: { id: b.ownerId },
      select: { id: true, tenantId: true },
    });
  }

  async joinWaitlist(userId: string, eventId: string, seats = 1, tier?: string) {
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
      where: { eventId, userId, status: { in: HELD } },
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
    // On a paid, tiered event the person says which ticket they want, so the price is known when
    // a seat opens.
    let tierName: string | null = null;
    if (e.payEnabled && isPaidEvent(e) && parseTiers(e.ticketTiers).length) {
      const tiers = parseTiers(e.ticketTiers);
      const chosen = tiers.find((t) => t.name.toLowerCase() === (tier ?? '').trim().toLowerCase());
      if (!chosen) throw new BadRequestException('Choose a ticket type.');
      tierName = chosen.name;
    }
    const entry = await this.db.eventWaitlist.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { tenantId: e.tenantId, eventId, userId, seats: want, tierName },
      update: { seats: want, promotedAt: null, tierName },
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
        const issued = await this.db.$transaction(
          async (tx) => {
            const r = await this.issue(tx, eventId, fit.user, {
              guests,
              source: 'waitlist',
              tier: fit.tierName ?? undefined,
            });
            await tx.eventWaitlist.update({
              where: { id: fit.id },
              data: { promotedAt: new Date() },
            });
            return r;
          },
          { timeout: 10_000 },
        );
        await this.redis.del(`event-booking:${eventId}`);
        void this.notify(
          fit.user,
          issued.payment
            ? {
                title: `A seat opened up: ${event.title}`,
                body: `It is held for you. Pay ${rupees(Number(issued.payment.amount))} by UPI and send the reference within ${event.payWindowHours} hours to keep it.`,
                type: 'EVENT_PAYMENT',
                metadata: {
                  eventId,
                  paymentId: issued.payment.id,
                  url: `/tickets/pay/${issued.payment.id}`,
                },
              }
            : {
                title: `A seat opened up: ${event.title}`,
                body: 'You are in. Your ticket is under My tickets.',
                type: 'EVENT_TICKET',
                metadata: { eventId, url: '/tickets' },
              },
        );
      } catch (err: any) {
        // Someone on the list cannot be placed (limit, closed). Drop them so the rest can move up.
        this.logger.warn(`Waitlist entry ${fit.id} skipped: ${err.message}`);
        await this.db.eventWaitlist.delete({ where: { id: fit.id } }).catch(() => undefined);
      }
    }
  }

  // ── my tickets ──────────────────────────────────────────────────────────

  /**
   * Everything the person has booked: upcoming tickets, seats held while they pay, and the history
   * of events already over (attended, missed or cancelled). The page splits upcoming from past by date.
   */
  async mine(userId: string) {
    const [tickets, waiting, payments] = await Promise.all([
      this.db.eventTicket.findMany({
        where: {
          userId,
          status: { in: [...HELD, 'CANCELLED'] },
          event: { deletedAt: null },
        },
        include: { event: { select: this.eventCard() } },
        orderBy: { event: { startDate: 'asc' } },
        take: 300,
      }),
      this.db.eventWaitlist.findMany({
        where: { userId, promotedAt: null, event: { deletedAt: null } },
        include: { event: { select: this.eventCard() } },
        take: 50,
      }),
      this.db.eventPayment.findMany({
        where: { userId, event: { deletedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: this.paymentCard,
      }),
    ]);

    const latestPayment = new Map<string, any>();
    for (const p of payments) {
      // Payments come newest first; a live one beats a finished one for the same event.
      const cur = latestPayment.get(p.eventId);
      const live = p.status === 'PENDING' || p.status === 'SUBMITTED';
      if (!cur || (live && !['PENDING', 'SUBMITTED'].includes(cur.status))) {
        latestPayment.set(p.eventId, p);
      }
    }

    const byEvent = new Map<string, any>();
    for (const t of tickets) {
      const row = byEvent.get(t.eventId) ?? {
        event: t.event,
        cancelDeadline: new Date(cancelDeadline(t.event)).toISOString(),
        tickets: [],
        payment: null,
      };
      row.tickets.push(this.publicTicket(t));
      byEvent.set(t.eventId, row);
    }
    for (const [eventId, row] of byEvent) {
      const p = latestPayment.get(eventId);
      row.payment = p ? this.publicPaymentCard(p) : null;
      const states = row.tickets.map((t: any) => t.status);
      // What happened for this person, so past events read as a history.
      row.outcome = states.includes('CHECKED_IN')
        ? 'ATTENDED'
        : states.some((s: string) => s === 'ISSUED' || s === 'PENDING')
          ? new Date(row.event.endDate).getTime() < Date.now()
            ? 'MISSED'
            : 'UPCOMING'
          : 'CANCELLED';
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
    const payment = t.paymentId
      ? await this.db.eventPayment.findUnique({
          where: { id: t.paymentId },
          select: this.paymentCard,
        })
      : null;
    return {
      ...this.publicTicket(t),
      // A seat still waiting for payment has no QR: it cannot be scanned until the host approves.
      qr: t.status === 'CANCELLED' || t.status === 'PENDING' ? null : ticketQr(t.id),
      event: t.event,
      cancelDeadline: new Date(cancelDeadline(t.event)).toISOString(),
      payment: payment ? this.publicPaymentCard(payment) : null,
    };
  }

  // ── host: settings ──────────────────────────────────────────────────────

  async hostSummary(actor: EventActor, eventId: string) {
    const e = await assertEventHost(this.db, eventId, actor);
    const state = bookingState(e);
    const awaiting = await this.db.eventPayment.groupBy({
      by: ['status'],
      where: { eventId, status: { in: ['PENDING', 'SUBMITTED'] } },
      _count: { _all: true },
    });
    const count = (s: string) => awaiting.find((a) => a.status === s)?._count._all ?? 0;
    return {
      ticketType: e.ticketType,
      ticketPrice: e.ticketPrice == null ? null : Number(e.ticketPrice),
      ticketTiers: parseTiers(e.ticketTiers),
      isPaidEvent: isPaidEvent(e),
      payEnabled: e.payEnabled,
      payConfirmedAt: e.payConfirmedAt,
      payUpiId: e.payUpiId,
      payPhone: e.payPhone,
      payeeName: e.payeeName,
      payQrImage: e.payQrImage,
      payWindowHours: e.payWindowHours,
      paymentsToVerify: count('SUBMITTED'),
      paymentsWaiting: count('PENDING'),
      id: e.id,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      venue: e.venue,
      status: e.status,
      bookingMode: e.bookingMode,
      bookingApproval: e.bookingApproval,
      bookingRejectReason: e.bookingRejectReason,
      bookingReviewedAt: e.bookingReviewedAt,
      bookingResubmitCount: e.bookingResubmitCount,
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
        where: { eventId, status: { in: HELD } },
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
      throw new BadRequestException('Ticket sales must open before they close.');
    }
    if (closes && closes > event.endDate) {
      throw new BadRequestException('Ticket sales cannot stay open past the end of the event.');
    }
    // Required when RSVP is switched on or the dates are touched; other saves (payment details) pass.
    const datesInPlay = event.bookingMode !== 'RSVP' || has('rsvpOpensAt') || has('rsvpClosesAt');
    if (mode === 'RSVP' && datesInPlay && (!opens || !closes)) {
      throw new BadRequestException('Say when ticket sales open and when they close.');
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

    const payFields = await this.paymentSettings(actor, event, mode, dto);
    Object.assign(data, payFields.data);

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
      if (!skip) this.askModerators(event, 'RSVP approval requested');
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
    if (payFields.audit) {
      this.audit.log({
        tenantId: event.tenantId,
        userId: actor.id,
        action: payFields.audit.action,
        resource: 'EVENT',
        resourceId: eventId,
        oldData: payFields.audit.before,
        newData: payFields.audit.after,
      });
    }
    // Anyone waiting must be placed if seats were added.
    if (updated.bookingMode === 'RSVP' && (updated.capacity ?? Infinity) > event.seatsTaken) {
      void this.promoteWaitlist(eventId).catch(() => undefined);
    }
    return this.hostSummary(actor, eventId);
  }

  // ── moderation ──────────────────────────────────────────────────────────

  /**
   * Events that asked for RSVP, for the moderators. Pending by default; ALL, APPROVED and REJECTED
   * show the history too, and `when` narrows to events that are over or still to come. A moderator
   * can open any of them (before approval and after the event ends) in the full event hub.
   */
  async pendingApprovals(page = 1, q: { status?: string; when?: string } = {}) {
    const take = 30;
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    const status = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(q.status ?? '')
      ? (q.status as string)
      : 'PENDING';
    const now = new Date();
    const where: Prisma.EventWhereInput = {
      deletedAt: null,
      bookingMode: 'RSVP',
      ...(status === 'ALL' ? {} : { bookingApproval: status }),
      ...(q.when === 'PAST' ? { endDate: { lt: now } } : {}),
      ...(q.when === 'UPCOMING' ? { endDate: { gte: now } } : {}),
    };
    const [data, total] = await Promise.all([
      this.db.event.findMany({
        where,
        orderBy: status === 'PENDING' ? { createdAt: 'asc' } : { startDate: 'desc' },
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
    const why = reason?.trim() ?? '';
    if (!approve && why.length < 5) {
      throw new BadRequestException(
        'Say why this event is not approved (at least a few words). The host sees it and can fix it.',
      );
    }

    await this.db.event.update({
      where: { id: eventId },
      data: {
        bookingApproval: approve ? 'APPROVED' : 'REJECTED',
        bookingRejectReason: approve ? null : why.slice(0, 300),
        bookingReviewedAt: new Date(),
      },
    });
    await this.redis.del(`event-booking:${eventId}`);
    this.audit.log({
      tenantId: event.tenantId,
      userId: adminId,
      action: approve ? 'EVENT_RSVP_APPROVED' : 'EVENT_RSVP_REJECTED',
      resource: 'EVENT',
      resourceId: eventId,
      ...(approve ? {} : { newData: { reason: why } }),
    });

    void this.notifyHost(event, {
      title: approve ? `RSVP approved: ${event.title}` : `RSVP not approved: ${event.title}`,
      body: approve
        ? 'People can now register for your event and receive tickets.'
        : `Your event cannot take RSVPs yet. Reason: ${why}. Fix it and send it for approval again.`,
      type: 'EVENT_APPROVAL',
      tab: 'settings',
    });
    return { approved: approve };
  }

  /** Tell the staff who approve events that one is waiting. */
  private askModerators(event: { id: string; title: string }, title: string) {
    void this.audience?.tellStaff('events', {
      title: `${title}: ${event.title}`,
      body: 'A host wants to take RSVPs. Open the approvals to review it and approve or say what to fix.',
      type: 'EVENT_APPROVAL_REQUEST',
      url: '/admin/event-approvals',
      metadata: { eventId: event.id },
    });
  }

  /** A host fixed what was wrong and sends the event for approval again. */
  async resubmit(actor: EventActor, eventId: string) {
    const event = await assertEventHost(this.db, eventId, actor);
    if (event.bookingMode !== 'RSVP' || event.bookingApproval !== 'REJECTED') {
      throw new BadRequestException('Only an event that was not approved can be sent again.');
    }
    if (event.bookingResubmitCount >= 5) {
      throw new BadRequestException(
        'This event has been sent for approval 5 times. Contact support to continue.',
      );
    }
    await this.db.event.update({
      where: { id: eventId },
      data: {
        bookingApproval: 'PENDING',
        bookingResubmitCount: { increment: 1 },
      },
    });
    await this.redis.del(`event-booking:${eventId}`);
    this.askModerators(event, 'RSVP sent for approval again');
    this.audit.log({
      tenantId: event.tenantId,
      userId: actor.id,
      action: 'EVENT_RSVP_RESUBMITTED',
      resource: 'EVENT',
      resourceId: eventId,
      oldData: { reason: event.bookingRejectReason },
    });
    return this.hostSummary(actor, eventId);
  }

  // ── host: people ────────────────────────────────────────────────────────

  async attendees(
    actor: EventActor,
    eventId: string,
    q: { status?: string; search?: string; page?: number; limit?: number },
  ) {
    await assertEventHost(this.db, eventId, actor);
    const contacts = canSeeContacts(actor);
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
    const status = ['ISSUED', 'CHECKED_IN', 'CANCELLED', 'PENDING'].includes(q.status ?? '')
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
              ...(contacts
                ? [{ user: { email: { contains: search, mode: 'insensitive' as const } } }]
                : []),
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
    const profiles = await attendeeProfiles(
      this.db,
      rows.map((t) => t.userId),
    );
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
        // A guest is a different person, so the registrant's own profession and place are not theirs.
        profession: t.isGuest ? null : (profiles.get(t.userId)?.profession ?? null),
        place: t.isGuest ? null : (profiles.get(t.userId)?.place ?? null),
        registrant: {
          name: t.user.name,
          ...(contacts ? { email: t.user.email, phone: t.user.phone } : {}),
        },
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
    // Hosts get name, profession and place; contact details are for the super admin only.
    const contacts = canSeeContacts(actor);
    const profiles = await attendeeProfiles(
      this.db,
      rows.map((t) => t.userId),
    );
    const head = [
      'Ticket code',
      'Name',
      'Profession',
      'Place',
      'Guest',
      'Status',
      'Registered by',
      ...(contacts ? ['Email', 'Phone'] : []),
      'Source',
      'RSVP time',
      'Check-in time',
    ];
    const lines = rows.map((t) =>
      [
        t.code,
        t.holderName,
        t.isGuest ? '' : profiles.get(t.userId)?.profession,
        t.isGuest ? '' : profiles.get(t.userId)?.place,
        t.isGuest ? 'Yes' : 'No',
        t.status,
        t.user.name,
        ...(contacts ? [t.user.email, t.user.phone] : []),
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
      where: { eventId: after.id, status: { in: HELD } },
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
    if (after.status !== 'ACTIVE' && before.status === 'ACTIVE') {
      await this.settlePayments(after.id, after.title).catch((err) =>
        this.logger.error(`Payment cleanup failed for ${after.id}: ${err.message}`),
      );
    }
  }

  /** The event was deleted: tickets are void, so say so. */
  async onEventRemoved(eventId: string, title: string) {
    await this.redis.del(`event-booking:${eventId}`);
    const holders = await this.db.eventTicket.findMany({
      where: { eventId, status: { in: HELD } },
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
    await this.settlePayments(eventId, title).catch((err) =>
      this.logger.error(`Payment cleanup failed for ${eventId}: ${err.message}`),
    );
  }

  /**
   * The event was cancelled or removed. Payments still being sorted out are closed and their seats
   * dropped; payments the host had already verified are flagged so the host knows who may need a
   * refund (the platform never holds the money).
   */
  private async settlePayments(eventId: string, title: string) {
    const e = await this.db.event.findUnique({
      where: { id: eventId },
      select: { id: true, tenantId: true, businessId: true },
    });
    if (!e) return;
    const open = await this.db.eventPayment.findMany({
      where: { eventId, status: { in: ['PENDING', 'SUBMITTED'] } },
      include: { user: { select: { id: true, tenantId: true } } },
    });
    for (const p of open) {
      await this.db.$transaction(async (tx) => {
        await tx.eventPayment.updateMany({
          where: { id: p.id, status: { in: ['PENDING', 'SUBMITTED'] } },
          data: { status: 'CANCELLED', decidedAt: new Date() },
        });
        await tx.eventTicket.updateMany({
          where: { paymentId: p.id, status: 'PENDING' },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        await logPayment(tx, {
          tenantId: e.tenantId,
          paymentId: p.id,
          eventId,
          actorRole: 'SYSTEM',
          action: 'CANCELLED',
          detail: { reason: 'event cancelled', hadProof: p.status === 'SUBMITTED' },
        });
      });
      void this.notify(p.user, {
        title: `Cancelled: ${title}`,
        body:
          p.status === 'SUBMITTED'
            ? 'The event was cancelled. If you already paid, ask the host for a refund.'
            : 'The event was cancelled, so your held seat was released.',
        type: 'EVENT_PAYMENT',
        metadata: { eventId, paymentId: p.id, url: `/tickets/pay/${p.id}` },
      });
    }
    const paid = await this.db.eventPayment.findMany({
      where: { eventId, status: 'APPROVED' },
      select: { id: true, amount: true },
    });
    for (const p of paid) {
      await logPayment(this.db, {
        tenantId: e.tenantId,
        paymentId: p.id,
        eventId,
        actorRole: 'SYSTEM',
        action: 'REFUND_DUE',
        detail: { reason: 'event cancelled', amount: Number(p.amount) },
      });
    }
    const owed = paid.reduce((s, p) => s + Number(p.amount), 0);
    if (owed > 0) {
      void this.notifyHost(
        { id: eventId, businessId: e.businessId },
        {
          title: `Refunds may be due: ${title}`,
          body: `The event was cancelled. ${paid.length} verified payment${paid.length === 1 ? '' : 's'} (${rupees(owed)}) may need to be refunded to attendees directly.`,
          type: 'EVENT_PAYMENT',
          tab: 'payments',
        },
      );
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  /** Columns the attendee-facing payment summary is built from. */
  private readonly paymentCard = {
    id: true,
    eventId: true,
    status: true,
    amount: true,
    seats: true,
    tierName: true,
    expiresAt: true,
    submittedAt: true,
    decisionNote: true,
  } as const;

  private publicPaymentCard = (p: any) => ({
    id: p.id,
    eventId: p.eventId,
    status: p.status,
    amount: Number(p.amount),
    seats: p.seats,
    tier: p.tierName ?? null,
    expiresAt: p.expiresAt,
    submittedAt: p.submittedAt ?? null,
    note: p.decisionNote ?? null,
  });

  /**
   * Checks and prepares the host's payment details. The QR photo is only accepted once the host has
   * confirmed they take payments, and details cannot change while people are mid-payment, so nobody
   * pays an account the host then swaps.
   */
  private async paymentSettings(
    actor: EventActor,
    event: {
      id: string;
      ticketType: string;
      ticketPrice: unknown;
      ticketTiers: unknown;
      payEnabled: boolean;
      payUpiId: string | null;
      payPhone: string | null;
      payeeName: string | null;
      payQrImage: string | null;
      payWindowHours: number;
    },
    mode: string,
    dto: BookingSettingsDto,
  ): Promise<{
    data: Prisma.EventUpdateInput;
    audit?: { action: string; before: unknown; after: unknown };
  }> {
    const keys = [
      'payEnabled',
      'payUpiId',
      'payPhone',
      'payeeName',
      'payQrImage',
      'payWindowHours',
    ] as const;
    if (!keys.some((k) => dto[k] !== undefined)) return { data: {} };
    const has = (k: (typeof keys)[number]) => dto[k] !== undefined;

    const enabled = has('payEnabled') ? !!dto.payEnabled : event.payEnabled;
    const upi = has('payUpiId') ? dto.payUpiId?.trim() || null : event.payUpiId;
    const phoneIn = has('payPhone') ? dto.payPhone?.trim() || null : event.payPhone;
    const phone = phoneIn ? normalizeMobile(phoneIn) : null;
    const payee = has('payeeName') ? dto.payeeName?.trim() || null : event.payeeName;
    const qr = has('payQrImage') ? dto.payQrImage?.trim() || null : event.payQrImage;

    if (upi && !UPI_ID_PATTERN.test(upi)) {
      throw new BadRequestException(
        'That UPI ID does not look right. It should be like name@bank.',
      );
    }
    if (phone && !IN_MOBILE_PATTERN.test(phone)) {
      throw new BadRequestException('Enter a 10-digit mobile number.');
    }
    if (qr && !/^https:\/\/\S+$/.test(qr)) {
      throw new BadRequestException('The QR photo link is not valid. Upload the photo again.');
    }
    if (enabled) {
      if (mode !== 'RSVP') throw new BadRequestException('Turn on RSVP before taking payments.');
      if (!isPaidEvent(event)) {
        throw new BadRequestException(
          'Set a paid ticket price on the event first, then turn on payments.',
        );
      }
      if (!upi) throw new BadRequestException('Enter the UPI ID that receives the payments.');
      if (!payee) throw new BadRequestException('Enter the name shown on your UPI account.');
      if (!phone) throw new BadRequestException('Enter a phone number attendees can call.');
    }
    if (qr && !enabled) {
      throw new BadRequestException(
        'Confirm that you accept payments first. The QR photo is added after that.',
      );
    }

    const changed =
      upi !== event.payUpiId ||
      phone !== event.payPhone ||
      payee !== event.payeeName ||
      qr !== event.payQrImage;
    if (changed || (event.payEnabled && !enabled)) {
      const live = await this.db.eventPayment.count({
        where: { eventId: event.id, status: { in: ['PENDING', 'SUBMITTED'] } },
      });
      if (live > 0) {
        throw new ConflictException({
          statusCode: 409,
          code: 'PAYMENTS_IN_PROGRESS',
          message: `${live} ${live === 1 ? 'person is' : 'people are'} part-way through paying. Verify or wait for them before changing payment details.`,
        });
      }
    }
    if (event.payEnabled && !enabled) {
      const taken = await this.db.eventPayment.count({
        where: { eventId: event.id, status: 'APPROVED' },
      });
      if (taken > 0) {
        throw new ConflictException({
          statusCode: 409,
          code: 'HAS_PAYMENTS',
          message:
            'Payments have already been verified for this event, so they cannot be turned off.',
        });
      }
    }

    const data: Prisma.EventUpdateInput = {};
    if (has('payEnabled')) {
      data.payEnabled = enabled;
      if (enabled && !event.payEnabled) data.payConfirmedAt = new Date();
      if (!enabled) data.payConfirmedAt = null;
    }
    if (has('payUpiId')) data.payUpiId = upi;
    if (has('payPhone')) data.payPhone = phone;
    if (has('payeeName')) data.payeeName = payee;
    if (has('payQrImage')) data.payQrImage = qr;
    if (has('payWindowHours')) data.payWindowHours = dto.payWindowHours;

    const mask = (p: string | null) => (p ? `${p.slice(0, 2)}******${p.slice(-2)}` : null);
    const snap = (
      on: boolean,
      u: string | null,
      p: string | null,
      n: string | null,
      q: unknown,
    ) => ({
      payEnabled: on,
      upiId: u,
      phone: mask(p),
      payeeName: n,
      hasQrPhoto: !!q,
    });
    return {
      data,
      audit: {
        action:
          enabled && !event.payEnabled
            ? 'EVENT_PAYMENTS_ENABLED'
            : !enabled && event.payEnabled
              ? 'EVENT_PAYMENTS_DISABLED'
              : 'EVENT_PAYMENT_DETAILS_CHANGED',
        before: snap(
          event.payEnabled,
          event.payUpiId,
          event.payPhone,
          event.payeeName,
          event.payQrImage,
        ),
        after: snap(enabled, upi, phone, payee, qr),
      },
    };
  }

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
    paymentId: t.paymentId ?? null,
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
  async notify(
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
