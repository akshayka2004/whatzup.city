// ============================================================
// Booking by day: the host's side. A multi-day event can sell each day on its own, with its own
// seats, price, hours and booking window. This file turns that on and off and edits the days; the
// attendee side (booking, cancelling, waiting) lives in event-tickets.service.ts.
//
// Turning it on is only allowed before the first booking, so a ticket never has to be moved from
// "the whole event" to "one day". Turning it off is only allowed once no day ticket exists.
// ============================================================

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  MAX_EVENT_DAYS,
  dayState,
  eventDays,
  istDay,
  isPaidEvent,
  parseTiers,
  type BookingState,
} from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { DayInputDto, DaysSettingsDto } from './dto/event-tickets.dto';
import { EventActor, assertEventHost } from './event-access';
import { EventTicketsService } from './event-tickets.service';

const HELD = ['ISSUED', 'CHECKED_IN', 'PENDING'];

const money = (v: unknown): number | null =>
  v === null || v === undefined ? null : Math.round(Number(v) * 100) / 100;

@Injectable()
export class EventDaysService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly tickets: EventTicketsService,
  ) {}

  /** The day setup the host sees: current days with their counts, and whether it can be turned on. */
  async get(actor: EventActor, eventId: string) {
    const e = await assertEventHost(this.db, eventId, actor);
    const [days, heldAll, waiting] = await Promise.all([
      this.db.eventDay.findMany({
        where: { eventId },
        orderBy: [{ sortOrder: 'asc' }, { startsAt: 'asc' }],
      }),
      this.db.eventTicket.count({ where: { eventId, status: { in: HELD } } }),
      this.db.eventWaitlist.count({ where: { eventId, promotedAt: null } }),
    ]);
    const perDay = await this.db.eventTicket.groupBy({
      by: ['dayId', 'status'],
      where: { eventId, dayId: { not: null }, status: { in: HELD } },
      _count: { _all: true },
    });
    const waitPerDay = await this.db.eventWaitlist.groupBy({
      by: ['dayId'],
      where: { eventId, dayId: { not: null }, promotedAt: null },
      _count: { _all: true },
    });
    const suggested = eventDays(e.startDate, e.endDate).map((d) => ({
      dayDate: d.dayDate,
      label: d.label,
      startsAt: d.startsAt.toISOString(),
      endsAt: d.endsAt.toISOString(),
    }));

    let cannotEnable: string | null = null;
    if (!e.dayBooking) {
      if (e.bookingMode !== 'RSVP') cannotEnable = 'Turn on RSVP first.';
      else if (suggested.length < 2)
        cannotEnable = 'Booking by day is for events that run on more than one day.';
      else if (parseTiers(e.ticketTiers).length > 0)
        cannotEnable = 'Ticket types cannot be combined with booking by day. Remove them first.';
      else if (heldAll > 0 || waiting > 0)
        cannotEnable =
          'People have already booked this event, so it can no longer be split by day. Turn it on before the first booking.';
    }

    return {
      eventId,
      dayBooking: e.dayBooking,
      allDaysPrice: money(e.allDaysPrice),
      isPaidEvent: isPaidEvent(e),
      ticketPrice: money(e.ticketPrice),
      canEnable: cannotEnable === null,
      cannotEnableReason: cannotEnable,
      suggested,
      days: days.map((d) => {
        const held = perDay.filter((p) => p.dayId === d.id).reduce((n, p) => n + p._count._all, 0);
        const state: BookingState = dayState(
          { ...e, capacity: null, seatsTaken: 0 },
          {
            ...d,
            price: d.price == null ? null : Number(d.price),
          },
        );
        return {
          id: d.id,
          dayDate: d.dayDate,
          label: d.label,
          startsAt: d.startsAt,
          endsAt: d.endsAt,
          capacity: d.capacity,
          seatsTaken: d.seatsTaken,
          checkedInCount: d.checkedInCount,
          price: money(d.price),
          isOpen: d.isOpen,
          rsvpOpensAt: d.rsvpOpensAt,
          rsvpClosesAt: d.rsvpClosesAt,
          tickets: held,
          waiting: waitPerDay.find((w) => w.dayId === d.id)?._count._all ?? 0,
          state,
        };
      }),
    };
  }

  /**
   * Saves the day setup. Send the whole list of days: ones with an `id` are updated, ones without
   * are created, and ones left out are removed (only when nobody holds a ticket for them).
   */
  async save(actor: EventActor, eventId: string, dto: DaysSettingsDto) {
    const e = await assertEventHost(this.db, eventId, actor);
    const wasOn = e.dayBooking;
    const turnOn = dto.dayBooking === true && !wasOn;
    const turnOff = dto.dayBooking === false && wasOn;

    if (dto.dayBooking === false && !wasOn) return this.get(actor, eventId);

    const current = await this.get(actor, eventId);
    if (turnOn && !current.canEnable) {
      throw new ConflictException({
        statusCode: 409,
        code: 'DAYS_CANNOT_ENABLE',
        message: current.cannotEnableReason,
      });
    }

    if (turnOff) {
      const dayTickets = await this.db.eventTicket.count({
        where: { eventId, dayId: { not: null }, status: { in: HELD } },
      });
      if (dayTickets > 0) {
        throw new ConflictException({
          statusCode: 409,
          code: 'DAYS_HAVE_TICKETS',
          message:
            'People already hold tickets for individual days, so booking by day cannot be turned off.',
        });
      }
      await this.db.$transaction(async (tx) => {
        await tx.eventDay.deleteMany({ where: { eventId } });
        await tx.event.update({
          where: { id: eventId },
          data: { dayBooking: false, allDaysPrice: null },
        });
      });
      await this.afterChange(e, actor.id, 'EVENT_DAY_BOOKING_OFF');
      return this.get(actor, eventId);
    }

    const on = wasOn || turnOn;
    if (!on) {
      throw new BadRequestException('Turn on booking by day first.');
    }

    await this.db.$transaction(
      async (tx) => {
        if (turnOn) {
          // Seats are counted per day from now on, so the event-wide limit must not get in the way.
          await tx.event.update({
            where: { id: eventId },
            data: { dayBooking: true, capacity: null },
          });
        }

        const existing = await tx.eventDay.findMany({ where: { eventId } });
        const inputs: DayInputDto[] =
          dto.days && dto.days.length
            ? dto.days
            : existing.length
              ? existing.map((d) => ({ id: d.id }) as DayInputDto)
              : eventDays(e.startDate, e.endDate).map((d) => ({
                  label: d.label,
                  startsAt: d.startsAt.toISOString(),
                  endsAt: d.endsAt.toISOString(),
                  capacity: e.capacity ?? undefined,
                }));
        if (inputs.length === 0) throw new BadRequestException('The event needs at least one day.');
        if (inputs.length > MAX_EVENT_DAYS) {
          throw new BadRequestException(`An event can have at most ${MAX_EVENT_DAYS} days.`);
        }

        const first = istDay(e.startDate);
        const last = istDay(e.endDate);
        const keep = new Set<string>();
        const seenDates = new Set<string>();

        for (let i = 0; i < inputs.length; i++) {
          const inp = inputs[i];
          const prev = inp.id ? existing.find((d) => d.id === inp.id) : undefined;
          if (inp.id && !prev)
            throw new BadRequestException('One of the days does not belong to this event.');

          const startsAt = inp.startsAt ? new Date(inp.startsAt) : prev?.startsAt;
          const endsAt = inp.endsAt ? new Date(inp.endsAt) : prev?.endsAt;
          if (!startsAt || !endsAt || Number.isNaN(+startsAt) || Number.isNaN(+endsAt)) {
            throw new BadRequestException('Give every day a start and an end time.');
          }
          if (endsAt <= startsAt) throw new BadRequestException('A day must end after it starts.');
          const dayDate = istDay(startsAt);
          if (istDay(endsAt) !== dayDate) {
            throw new BadRequestException(
              'A day must start and end on the same date. Add another day for the next date.',
            );
          }
          if (dayDate < first || dayDate > last) {
            throw new BadRequestException(
              'Every day must fall between the start and end dates of the event.',
            );
          }
          if (seenDates.has(dayDate))
            throw new BadRequestException('Two days are on the same date.');
          seenDates.add(dayDate);

          const label = (inp.label ?? prev?.label ?? '').trim();
          if (!label) throw new BadRequestException('Give every day a name.');

          const capacity = inp.capacity === undefined ? (prev?.capacity ?? null) : inp.capacity;
          if (capacity !== null && capacity < (prev?.seatsTaken ?? 0)) {
            throw new BadRequestException(
              `${label}: seats cannot be lower than the ${prev?.seatsTaken} already taken.`,
            );
          }
          const price = inp.price === undefined ? money(prev?.price) : inp.price;
          if (price !== null && (price < 0 || price > 100_000)) {
            throw new BadRequestException(`${label}: enter a price between 0 and 100000.`);
          }
          const opens =
            inp.rsvpOpensAt === undefined
              ? (prev?.rsvpOpensAt ?? null)
              : inp.rsvpOpensAt
                ? new Date(inp.rsvpOpensAt)
                : null;
          const closes =
            inp.rsvpClosesAt === undefined
              ? (prev?.rsvpClosesAt ?? null)
              : inp.rsvpClosesAt
                ? new Date(inp.rsvpClosesAt)
                : null;
          if (opens && closes && opens >= closes) {
            throw new BadRequestException(`${label}: booking must open before it closes.`);
          }
          if (closes && closes > endsAt) {
            throw new BadRequestException(
              `${label}: booking cannot stay open past the end of that day.`,
            );
          }

          const data = {
            label: label.slice(0, 80),
            dayDate,
            startsAt,
            endsAt,
            capacity,
            price,
            isOpen: inp.isOpen === undefined ? (prev?.isOpen ?? true) : inp.isOpen,
            rsvpOpensAt: opens,
            rsvpClosesAt: closes,
            sortOrder: i,
          };
          if (prev) {
            await tx.eventDay.update({ where: { id: prev.id }, data });
            keep.add(prev.id);
          } else {
            const made = await tx.eventDay.create({
              data: { ...data, tenantId: e.tenantId, eventId },
            });
            keep.add(made.id);
          }
        }

        for (const d of existing) {
          if (keep.has(d.id)) continue;
          const held = await tx.eventTicket.count({ where: { dayId: d.id, status: { in: HELD } } });
          if (held > 0) {
            throw new ConflictException({
              statusCode: 409,
              code: 'DAY_HAS_TICKETS',
              message: `${d.label} has ${held} ticket${held === 1 ? '' : 's'}, so it cannot be removed. Close it instead.`,
            });
          }
          await tx.eventDay.delete({ where: { id: d.id } });
        }

        if (dto.allDaysPrice !== undefined) {
          const p = dto.allDaysPrice;
          if (p !== null && (p < 0 || p > 1_000_000)) {
            throw new BadRequestException('Enter an all-days price between 0 and 1000000.');
          }
          await tx.event.update({ where: { id: eventId }, data: { allDaysPrice: p } });
        }
      },
      { timeout: 20_000 },
    );

    await this.afterChange(e, actor.id, turnOn ? 'EVENT_DAY_BOOKING_ON' : 'EVENT_DAYS_UPDATED');
    // Seats may have been added or a day reopened: let anyone waiting in.
    void this.tickets.promoteWaitlist(eventId).catch(() => undefined);
    return this.get(actor, eventId);
  }

  private async afterChange(e: { id: string; tenantId: string }, userId: string, action: string) {
    await this.redis.del(`event-booking:${e.id}`);
    this.audit.log({
      tenantId: e.tenantId,
      userId,
      action,
      resource: 'EVENT',
      resourceId: e.id,
    });
  }
}
