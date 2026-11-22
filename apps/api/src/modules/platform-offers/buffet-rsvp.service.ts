// ============================================================
// Buffet RSVPs. A signed-in person asks for a table at a buffet; the admins see the request and the
// hotel (which may have no account) is reached by phone. No payment is taken.
// ============================================================

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { istDay } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';

export const RSVP_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export const RSVP_LIMITS = { maxGuests: 50, aheadDays: 90, activePerPerson: 10, pageSize: 25 };
export const RSVP_THANKS =
  'Thank you! Your RSVP is with our team. The hotel will confirm by phone, so please keep your phone handy.';

export type RsvpUser = { id: string; tenantId?: string | null };

const DAY_MS = 86_400_000;
const clean = (v: unknown, max: number) =>
  String(v ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** "2026-12-24" → a Date at UTC midnight of that day (what a DATE column stores). */
const dayDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
/** The stored DATE comes back as UTC midnight; this reads it as the same calendar day. */
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class BuffetRsvpService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(
    user: RsvpUser,
    offerId: string,
    dto: { name: string; phone: string; visitDate: string; guests: number; note?: string },
  ) {
    if (!user.tenantId) throw new BadRequestException('Could not find your account.');
    const name = clean(dto.name, 120);
    if (name.length < 2) throw new BadRequestException('Enter your name.');
    const phone = String(dto.phone ?? '').replace(/[^\d+]/g, '');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      throw new BadRequestException('Enter a phone number the hotel can call.');
    }
    const guests = Math.floor(Number(dto.guests));
    if (!Number.isFinite(guests) || guests < 1 || guests > RSVP_LIMITS.maxGuests) {
      throw new BadRequestException(`Guests must be between 1 and ${RSVP_LIMITS.maxGuests}.`);
    }
    const day = String(dto.visitDate ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(dayDate(day).getTime())) {
      throw new BadRequestException('Pick the day you want to come.');
    }
    const today = istDay(Date.now());
    if (day < today) throw new BadRequestException('Pick today or a day ahead.');
    const last = istDay(Date.now() + RSVP_LIMITS.aheadDays * DAY_MS);
    if (day > last) {
      throw new BadRequestException(`You can RSVP up to ${RSVP_LIMITS.aheadDays} days ahead.`);
    }

    const offer = await this.db.platformOffer.findFirst({
      // tenant-scope-ok: public listing; the offer id is the key and the row carries its tenant
      where: { id: offerId, category: 'BUFFET', status: 'PUBLISHED', deletedAt: null },
    });
    if (!offer) throw new NotFoundException('This buffet is not available.');
    if (offer.endsAt && istDay(offer.endsAt.getTime()) < day) {
      throw new BadRequestException('This buffet is not running on that day.');
    }
    if ((offer.details as any)?.rsvpOpen === false) {
      throw new BadRequestException('RSVPs are closed for this buffet. Please call the hotel.');
    }

    const same = await this.db.buffetRsvp.findFirst({
      where: {
        offerId,
        userId: user.id,
        visitDate: dayDate(day),
        status: { not: 'CANCELLED' },
      },
      select: { id: true },
    });
    if (same) throw new ConflictException('You already sent an RSVP for that day.');

    const active = await this.db.buffetRsvp.count({
      where: {
        userId: user.id,
        status: { not: 'CANCELLED' },
        visitDate: { gte: dayDate(today) },
      },
    });
    if (active >= RSVP_LIMITS.activePerPerson) {
      throw new BadRequestException('You have many open RSVPs. Cancel one before adding another.');
    }

    const row = await this.db.buffetRsvp.create({
      data: {
        tenantId: offer.tenantId,
        offerId,
        userId: user.id,
        name,
        phone,
        visitDate: dayDate(day),
        guests,
        note: clean(dto.note, 500) || null,
      },
      select: { id: true },
    });
    return { id: row.id, thanks: RSVP_THANKS };
  }

  /** The person's own RSVPs, latest day first. */
  async mine(user: RsvpUser) {
    const rows = await this.db.buffetRsvp.findMany({
      where: { userId: user.id },
      orderBy: { visitDate: 'desc' },
      take: 50,
      include: { offer: { select: { id: true, title: true, city: true, phone: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      visitDate: dayOf(r.visitDate),
      guests: r.guests,
      status: r.status,
      note: r.note,
      buffet: r.offer,
    }));
  }

  async cancelMine(user: RsvpUser, id: string) {
    const row = await this.db.buffetRsvp.findFirst({ where: { id, userId: user.id } });
    if (!row) throw new NotFoundException('RSVP not found.');
    if (row.status === 'CANCELLED') return { id, status: 'CANCELLED' };
    await this.db.buffetRsvp.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { id, status: 'CANCELLED' };
  }

  async adminList(q: { offerId?: string; status?: string; upcoming?: string; page?: number }) {
    const page = Math.max(1, Math.floor(Number(q.page)) || 1);
    const where: Record<string, any> = {};
    if (q.offerId) where.offerId = q.offerId;
    if ((RSVP_STATUSES as readonly string[]).includes(q.status ?? '')) where.status = q.status;
    if (q.upcoming === 'true') where.visitDate = { gte: dayDate(istDay(Date.now())) };
    // tenant-scope-ok: admin queue over platform buffets; role-guarded in the controller
    const [rows, total, pending] = await Promise.all([
      this.db.buffetRsvp.findMany({
        where,
        orderBy: [{ visitDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * RSVP_LIMITS.pageSize,
        take: RSVP_LIMITS.pageSize,
        include: {
          offer: { select: { id: true, title: true, city: true, phone: true } },
          user: { select: { id: true, email: true } },
        },
      }),
      this.db.buffetRsvp.count({ where }),
      this.db.buffetRsvp.count({ where: { status: 'PENDING' } }), // tenant-scope-ok: admin queue
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        email: r.user?.email ?? null,
        visitDate: dayOf(r.visitDate),
        guests: r.guests,
        note: r.note,
        status: r.status,
        adminNote: r.adminNote,
        createdAt: r.createdAt,
        buffet: r.offer,
      })),
      meta: { total, page, limit: RSVP_LIMITS.pageSize },
      pending,
    };
  }

  async review(
    actor: { id: string; tenantId?: string | null },
    id: string,
    dto: { status?: string; adminNote?: string },
  ) {
    const row = await this.db.buffetRsvp.findFirst({ where: { id } }); // tenant-scope-ok: admin queue
    if (!row) throw new NotFoundException('RSVP not found.');
    const data: Record<string, any> = {};
    if (dto.status !== undefined) {
      if (!(RSVP_STATUSES as readonly string[]).includes(dto.status)) {
        throw new BadRequestException('Unknown status.');
      }
      if (dto.status !== row.status) data.status = dto.status;
    }
    if (dto.adminNote !== undefined) {
      const note = clean(dto.adminNote, 500) || null;
      if (note !== row.adminNote) data.adminNote = note;
    }
    if (!Object.keys(data).length) return { id, status: row.status, adminNote: row.adminNote };
    const updated = await this.db.buffetRsvp.update({ where: { id }, data });
    await this.audit.log({
      tenantId: row.tenantId,
      userId: actor.id,
      action: 'BUFFET_RSVP_REVIEWED',
      resource: 'BUFFET_RSVP',
      resourceId: id,
      oldData: { status: row.status, adminNote: row.adminNote },
      newData: { status: updated.status, adminNote: updated.adminNote },
    });
    return { id, status: updated.status, adminNote: updated.adminNote };
  }
}
