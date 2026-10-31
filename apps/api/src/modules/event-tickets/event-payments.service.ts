// ============================================================
// Paid event tickets: what happens after an attendee holds a seat on a paid event.
//
// Attendees pay the host's UPI directly. The platform never touches the money; it records a payment
// for every held seat, takes the attendee's proof (UPI reference + optional screenshot), lets the
// host verify it against their own bank app, and keeps an append-only trail the host and both
// admins can read. Seats are held while the attendee pays and released when the time runs out.
// ============================================================

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PAYMENT_LIMITS, UTR_PATTERN, normalizeUtr, rupees } from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { StorageService } from '../../common/storage/storage.service';
import { AuditService } from '../audit/audit.service';
import {
  AttendeeProfile,
  EventActor,
  assertEventHost,
  attendeeProfiles,
  canSeeContacts,
  hit,
} from './event-access';
import { actorRoleOf, logPayment } from './event-payment-util';
import { EventTicketsService } from './event-tickets.service';
import { RejectPaymentDto, SubmitProofDto } from './dto/event-tickets.dto';

const OPEN = ['PENDING', 'SUBMITTED'];
const PROOF_BUCKET = 'verification-documents';
const SWEEP_EVERY_MS = 2 * 60_000;
/** What the person looking at a payment may see about the payer. */
interface PayerView {
  contacts: boolean;
  profiles: Map<string, AttendeeProfile>;
}

const PAGE = 30;

const STATUSES = ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'];

@Injectable()
export class EventPaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventPaymentsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly tickets: EventTicketsService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.EVENT_PAYMENT_SWEEP === 'off') return;
    this.timer = setInterval(() => void this.sweep(), SWEEP_EVERY_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // ── attendee ────────────────────────────────────────────────────────────

  /** One payment as its owner sees it, including where to pay while it is open. */
  async mine(userId: string, paymentId: string) {
    let p = await this.loadOwned(userId, paymentId);
    if (p.status === 'PENDING' && p.expiresAt <= new Date()) {
      await this.expirePayment(p.id);
      p = await this.loadOwned(userId, paymentId);
    }
    const open = OPEN.includes(p.status);
    return {
      id: p.id,
      status: p.status,
      amount: Number(p.amount),
      unitPrice: Number(p.unitPrice),
      seats: p.seats,
      tier: p.tierName,
      expiresAt: p.expiresAt,
      submittedAt: p.submittedAt,
      utr: p.utr,
      hasScreenshot: !!p.proofImage,
      note: p.decisionNote,
      resubmitCount: p.resubmitCount,
      maxResubmits: PAYMENT_LIMITS.maxResubmits,
      event: {
        id: p.event.id,
        title: p.event.title,
        startDate: p.event.startDate,
        venue: p.event.venue,
        city: p.event.city,
        posterImage: p.event.posterImage,
      },
      // The UPI details only show while the attendee still has something to pay or verify.
      payTo: open
        ? {
            upiId: p.event.payUpiId,
            payeeName: p.event.payeeName,
            phone: p.event.payPhone,
            qrImage: p.event.payQrImage,
          }
        : null,
      tickets: p.tickets.map((t) => ({
        id: t.id,
        holderName: t.holderName,
        isGuest: t.isGuest,
        code: t.code,
        status: t.status,
      })),
    };
  }

  async submitProof(userId: string, paymentId: string, dto: SubmitProofDto) {
    await hit(this.redis, `rl:pay-proof:${userId}`, 10, 60, 'Too many attempts. Wait a minute.');
    const p = await this.loadOwned(userId, paymentId);

    if (p.status !== 'PENDING') {
      throw new ConflictException({
        statusCode: 409,
        code: 'PAYMENT_NOT_OPEN',
        message:
          p.status === 'SUBMITTED'
            ? 'You already sent proof. The host will verify it soon.'
            : p.status === 'APPROVED'
              ? 'This payment is already verified.'
              : 'This payment is closed. Register for the event again.',
      });
    }
    if (p.expiresAt <= new Date()) {
      await this.expirePayment(p.id);
      throw new ConflictException({
        statusCode: 409,
        code: 'PAYMENT_EXPIRED',
        message: 'The time to pay has run out and the seat was released. Register again.',
      });
    }

    const utr = normalizeUtr(dto.utr);
    if (!UTR_PATTERN.test(utr)) {
      throw new BadRequestException(
        'Enter the UPI reference number exactly as your payment app shows it (10 to 22 letters and digits).',
      );
    }

    let proofImage: string | null = null;
    if (dto.proofPath || dto.proofBucket) {
      const okPath =
        !!dto.proofPath &&
        dto.proofBucket === PROOF_BUCKET &&
        dto.proofPath.startsWith(`${p.user.tenantId}/payment/`) &&
        !dto.proofPath.includes('..');
      if (!okPath)
        throw new BadRequestException('The screenshot did not upload correctly. Try again.');
      proofImage = JSON.stringify({ bucket: dto.proofBucket, path: dto.proofPath });
    }

    try {
      await this.db.$transaction(async (tx) => {
        const u = await tx.eventPayment.updateMany({
          where: { id: p.id, status: 'PENDING' },
          data: {
            status: 'SUBMITTED',
            utr,
            proofImage,
            payerNote: dto.note?.trim().slice(0, PAYMENT_LIMITS.noteMax) || null,
            submittedAt: new Date(),
            hostRemindedAt: null,
            decisionNote: null,
          },
        });
        if (u.count !== 1) {
          throw new ConflictException('This payment changed. Refresh and check its status.');
        }
        await logPayment(tx, {
          tenantId: p.tenantId,
          paymentId: p.id,
          eventId: p.eventId,
          actorId: userId,
          actorRole: 'ATTENDEE',
          action: 'PROOF_SUBMITTED',
          detail: {
            utrLast4: utr.slice(-4),
            hasScreenshot: !!proofImage,
            attempt: p.resubmitCount + 1,
          },
        });
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException({
          statusCode: 409,
          code: 'UTR_USED',
          message:
            'This reference number was already used for another payment. Check the number, or contact the host.',
        });
      }
      throw err;
    }

    this.audit.log({
      tenantId: p.tenantId,
      userId,
      action: 'EVENT_PAYMENT_PROOF_SUBMITTED',
      resource: 'EVENT',
      resourceId: p.eventId,
      metadata: { paymentId: p.id, amount: Number(p.amount) },
    });
    void this.tickets.notify(p.user, {
      title: `Proof received: ${p.event.title}`,
      body: `The host will verify your ${rupees(p.amount.toString())} payment. Your seat stays held until then.`,
      type: 'EVENT_PAYMENT',
      metadata: { eventId: p.eventId, paymentId: p.id, url: `/tickets/pay/${p.id}` },
    });
    const owner = await this.tickets.hostOwner(p.event.businessId);
    if (owner) {
      void this.tickets.notify(owner, {
        title: `Verify a payment: ${p.event.title}`,
        body: `${p.user.name} sent proof for ${rupees(p.amount.toString())}. Check your UPI app, then approve or reject it.`,
        type: 'EVENT_PAYMENT',
        metadata: {
          eventId: p.eventId,
          paymentId: p.id,
          url: `/dashboard/events/${p.eventId}?tab=payments`,
        },
      });
    }
    return this.mine(userId, paymentId);
  }

  /** The attendee gives the seat back before it is verified. */
  async cancel(userId: string, paymentId: string) {
    const p = await this.loadOwned(userId, paymentId);
    if (!OPEN.includes(p.status)) {
      throw new ConflictException('This payment is already closed.');
    }
    const hadProof = p.status === 'SUBMITTED';
    await this.db.$transaction(async (tx) => {
      const u = await tx.eventPayment.updateMany({
        where: { id: p.id, status: { in: OPEN } },
        data: { status: 'CANCELLED', decidedAt: new Date() },
      });
      if (u.count !== 1)
        throw new ConflictException('This payment changed. Refresh and try again.');
      const t = await tx.eventTicket.updateMany({
        where: { paymentId: p.id, status: 'PENDING' },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await this.tickets.releaseSeats(tx, p.eventId, t.count);
      await logPayment(tx, {
        tenantId: p.tenantId,
        paymentId: p.id,
        eventId: p.eventId,
        actorId: userId,
        actorRole: 'ATTENDEE',
        action: 'CANCELLED',
        detail: { hadProof },
      });
    });
    await this.afterSeatsFreed(p.eventId);
    if (hadProof) {
      const owner = await this.tickets.hostOwner(p.event.businessId);
      if (owner) {
        void this.tickets.notify(owner, {
          title: `Payment cancelled: ${p.event.title}`,
          body: `${p.user.name} cancelled after sending proof for ${rupees(p.amount.toString())}. If they paid, you may need to refund them directly.`,
          type: 'EVENT_PAYMENT',
          metadata: { eventId: p.eventId, url: `/dashboard/events/${p.eventId}?tab=payments` },
        });
      }
    }
    return { cancelled: true };
  }

  // ── host ────────────────────────────────────────────────────────────────

  async listForEvent(
    actor: EventActor,
    eventId: string,
    q: { status?: string; search?: string; page?: number },
  ) {
    await assertEventHost(this.db, eventId, actor);
    const contacts = canSeeContacts(actor);
    await this.expireDueForEvent(eventId);
    const page = Math.max(1, Number(q.page) || 1);
    const status = STATUSES.includes(q.status ?? '') ? q.status : undefined;
    const search = q.search?.trim();
    const where: Prisma.EventPaymentWhereInput = {
      eventId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { utr: { contains: normalizeUtr(search) } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              ...(contacts ? [{ user: { email: { contains: search, mode: 'insensitive' as const } } }] : []),
            ],
          }
        : {}),
    };
    const [rows, total, groups] = await Promise.all([
      this.db.eventPayment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * PAGE,
        take: PAGE,
        include: { user: { select: { name: true, email: true, phone: true } } },
      }),
      this.db.eventPayment.count({ where }),
      this.db.eventPayment.groupBy({
        by: ['status'],
        where: { eventId },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);
    const profiles = await attendeeProfiles(
      this.db,
      rows.map((p) => p.userId),
    );
    return {
      data: rows.map((p) => this.row(p, { contacts, profiles })),
      meta: { total, page, limit: PAGE },
      summary: this.summarise(groups),
    };
  }

  async detail(actor: EventActor, eventId: string, paymentId: string) {
    await assertEventHost(this.db, eventId, actor);
    const p = await this.db.eventPayment.findFirst({
      where: { id: paymentId, eventId },
      include: this.detailInclude,
    });
    if (!p) throw new NotFoundException('Payment not found');
    return this.buildDetail(p, {
      contacts: canSeeContacts(actor),
      profiles: await attendeeProfiles(this.db, [p.userId]),
    });
  }

  async approve(actor: EventActor, eventId: string, paymentId: string) {
    const event = await assertEventHost(this.db, eventId, actor);
    const p = await this.db.eventPayment.findFirst({
      where: { id: paymentId, eventId },
      include: { user: { select: { id: true, name: true, tenantId: true } } },
    });
    if (!p) throw new NotFoundException('Payment not found');
    if (p.status !== 'SUBMITTED') {
      throw new ConflictException({
        statusCode: 409,
        code: 'PAYMENT_NOT_SUBMITTED',
        message:
          p.status === 'APPROVED'
            ? 'This payment is already approved.'
            : 'There is no proof to approve on this payment.',
      });
    }

    await this.db.$transaction(async (tx) => {
      const u = await tx.eventPayment.updateMany({
        where: { id: p.id, status: 'SUBMITTED' },
        data: {
          status: 'APPROVED',
          decidedAt: new Date(),
          decidedBy: actor.id,
          decisionNote: null,
        },
      });
      if (u.count !== 1)
        throw new ConflictException('This payment changed. Refresh and try again.');
      const t = await tx.eventTicket.updateMany({
        where: { paymentId: p.id, status: 'PENDING' },
        data: { status: 'ISSUED', issuedAt: new Date() },
      });
      if (t.count === 0) {
        throw new ConflictException(
          'The seats for this payment were already released, so no ticket can be issued. Refund the attendee directly.',
        );
      }
      await logPayment(tx, {
        tenantId: p.tenantId,
        paymentId: p.id,
        eventId,
        actorId: actor.id,
        actorRole: actorRoleOf(actor),
        action: 'APPROVED',
        detail: { amount: Number(p.amount), tickets: t.count },
      });
    });

    this.audit.log({
      tenantId: event.tenantId,
      userId: actor.id,
      action: 'EVENT_PAYMENT_APPROVED',
      resource: 'EVENT',
      resourceId: eventId,
      metadata: { paymentId: p.id, amount: Number(p.amount) },
    });
    await this.redis.del(`event-booking:${eventId}`);
    void this.tickets.notify(p.user, {
      title: `Payment verified: ${event.title}`,
      body: `Your ${p.seats === 1 ? 'ticket is' : 'tickets are'} ready. Show the QR at the gate.`,
      type: 'EVENT_PAYMENT_APPROVED',
      metadata: { eventId, paymentId: p.id, url: '/tickets' },
    });
    return { approved: true };
  }

  /**
   * The host cannot approve. With allowResubmit the attendee may send corrected proof and keeps the
   * seat for a fresh window; without it the seat is released.
   */
  async reject(actor: EventActor, eventId: string, paymentId: string, dto: RejectPaymentDto) {
    const event = await assertEventHost(this.db, eventId, actor);
    const p = await this.db.eventPayment.findFirst({
      where: { id: paymentId, eventId },
      include: { user: { select: { id: true, name: true, tenantId: true } } },
    });
    if (!p) throw new NotFoundException('Payment not found');
    if (p.status !== 'SUBMITTED') {
      throw new ConflictException('Only a payment with proof waiting can be rejected.');
    }
    const reason = dto.reason.trim();
    const again = !!dto.allowResubmit && p.resubmitCount < PAYMENT_LIMITS.maxResubmits;

    await this.db.$transaction(async (tx) => {
      if (again) {
        const u = await tx.eventPayment.updateMany({
          where: { id: p.id, status: 'SUBMITTED' },
          data: {
            status: 'PENDING',
            // The reference is cleared so the attendee can fix a typo without tripping the duplicate check.
            utr: null,
            proofImage: null,
            decisionNote: reason,
            resubmitCount: { increment: 1 },
            expiresAt: new Date(Date.now() + event.payWindowHours * 3_600_000),
          },
        });
        if (u.count !== 1)
          throw new ConflictException('This payment changed. Refresh and try again.');
      } else {
        const u = await tx.eventPayment.updateMany({
          where: { id: p.id, status: 'SUBMITTED' },
          data: {
            status: 'REJECTED',
            decidedAt: new Date(),
            decidedBy: actor.id,
            decisionNote: reason,
          },
        });
        if (u.count !== 1)
          throw new ConflictException('This payment changed. Refresh and try again.');
        const t = await tx.eventTicket.updateMany({
          where: { paymentId: p.id, status: 'PENDING' },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        await this.tickets.releaseSeats(tx, eventId, t.count);
      }
      await logPayment(tx, {
        tenantId: p.tenantId,
        paymentId: p.id,
        eventId,
        actorId: actor.id,
        actorRole: actorRoleOf(actor),
        action: again ? 'RESUBMIT_REQUESTED' : 'REJECTED',
        detail: { reason, utrLast4: p.utr?.slice(-4) ?? null },
      });
    });

    this.audit.log({
      tenantId: event.tenantId,
      userId: actor.id,
      action: again ? 'EVENT_PAYMENT_RESUBMIT_REQUESTED' : 'EVENT_PAYMENT_REJECTED',
      resource: 'EVENT',
      resourceId: eventId,
      metadata: { paymentId: p.id, amount: Number(p.amount), reason },
    });
    if (!again) await this.afterSeatsFreed(eventId);
    void this.tickets.notify(p.user, {
      title: again ? `Check your payment: ${event.title}` : `Payment not accepted: ${event.title}`,
      body: again
        ? `${reason} Please send the reference number again within ${event.payWindowHours} hours.`
        : `${reason} Your seat was released. If you paid, ask the host for a refund.`,
      type: 'EVENT_PAYMENT_REJECTED',
      metadata: { eventId, paymentId: p.id, url: `/tickets/pay/${p.id}` },
    });
    return { rejected: !again, resubmitRequested: again };
  }

  // ── admins (monitoring across every event) ──────────────────────────────

  async adminList(q: {
    status?: string;
    eventId?: string;
    search?: string;
    overdue?: string;
    page?: number;
  }) {
    const page = Math.max(1, Number(q.page) || 1);
    const status = STATUSES.includes(q.status ?? '') ? q.status : undefined;
    const search = q.search?.trim();
    const overdueSince = new Date(Date.now() - PAYMENT_LIMITS.verifyReminderHours * 3_600_000);
    const where: Prisma.EventPaymentWhereInput = {
      ...(status ? { status } : {}),
      ...(q.eventId ? { eventId: q.eventId } : {}),
      ...(q.overdue === '1' ? { status: 'SUBMITTED', submittedAt: { lte: overdueSince } } : {}),
      ...(search
        ? {
            OR: [
              { utr: { contains: normalizeUtr(search) } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { event: { title: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total, groups, overdue] = await Promise.all([
      this.db.eventPayment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * PAGE,
        take: PAGE,
        include: {
          user: { select: { name: true, email: true, phone: true } },
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              businessId: true,
              business: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.db.eventPayment.count({ where }),
      this.db.eventPayment.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.db.eventPayment.count({
        where: { status: 'SUBMITTED', submittedAt: { lte: overdueSince } },
      }),
    ]);
    const profiles = await attendeeProfiles(
      this.db,
      rows.map((p) => p.userId),
    );
    return {
      data: rows.map((p) => ({
        ...this.row(p, { contacts: true, profiles }),
        event: {
          id: p.event.id,
          title: p.event.title,
          startDate: p.event.startDate,
          host: p.event.business?.name ?? 'Platform event',
        },
      })),
      meta: { total, page, limit: PAGE },
      summary: { ...this.summarise(groups), overdue },
    };
  }

  async adminDetail(paymentId: string) {
    const p = await this.db.eventPayment.findUnique({
      where: { id: paymentId },
      include: this.detailInclude,
    });
    if (!p) throw new NotFoundException('Payment not found');
    return this.buildDetail(p, {
      contacts: true,
      profiles: await attendeeProfiles(this.db, [p.userId]),
    });
  }

  // ── background: expiry and reminders ────────────────────────────────────

  /** Releases held seats whose time ran out and nudges hosts sitting on unverified proof. */
  async sweep() {
    try {
      const got = await this.redis
        .getClient()
        .set('event-payments:sweep', '1', 'EX', Math.floor(SWEEP_EVERY_MS / 1000) - 10, 'NX');
      if (got !== 'OK') return;

      const due = await this.db.eventPayment.findMany({
        where: { status: 'PENDING', expiresAt: { lte: new Date() } },
        orderBy: { expiresAt: 'asc' },
        take: 100,
        select: { id: true },
      });
      for (const p of due) {
        await this.expirePayment(p.id).catch((e) =>
          this.logger.error(`Expiring payment ${p.id} failed: ${e.message}`),
        );
      }

      const since = new Date(Date.now() - PAYMENT_LIMITS.verifyReminderHours * 3_600_000);
      const overdue = await this.db.eventPayment.findMany({
        where: { status: 'SUBMITTED', submittedAt: { lte: since }, hostRemindedAt: null },
        take: 100,
        include: { event: { select: { id: true, title: true, businessId: true } } },
      });
      for (const p of overdue) {
        await this.db.eventPayment.update({
          where: { id: p.id },
          data: { hostRemindedAt: new Date() },
        });
        await logPayment(this.db, {
          tenantId: p.tenantId,
          paymentId: p.id,
          eventId: p.eventId,
          actorRole: 'SYSTEM',
          action: 'REMINDER',
          detail: { waitingHours: PAYMENT_LIMITS.verifyReminderHours },
        });
        const owner = await this.tickets.hostOwner(p.event.businessId);
        if (owner) {
          void this.tickets.notify(owner, {
            title: `Payment waiting for you: ${p.event.title}`,
            body: `A payment of ${rupees(p.amount.toString())} has been waiting over ${PAYMENT_LIMITS.verifyReminderHours} hours for you to verify it.`,
            type: 'EVENT_PAYMENT',
            metadata: {
              eventId: p.eventId,
              url: `/dashboard/events/${p.eventId}?tab=payments`,
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Payment sweep failed: ${err.message}`);
    }
  }

  private async expireDueForEvent(eventId: string) {
    const due = await this.db.eventPayment.findMany({
      where: { eventId, status: 'PENDING', expiresAt: { lte: new Date() } },
      take: 100,
      select: { id: true },
    });
    for (const p of due) await this.expirePayment(p.id);
  }

  /** Releases a held seat whose payment time ran out. Safe to call twice. */
  async expirePayment(paymentId: string): Promise<boolean> {
    const p = await this.db.eventPayment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { id: true, tenantId: true } },
        event: { select: { title: true } },
      },
    });
    if (!p || p.status !== 'PENDING' || p.expiresAt > new Date()) return false;

    const done = await this.db.$transaction(async (tx) => {
      const u = await tx.eventPayment.updateMany({
        where: { id: p.id, status: 'PENDING', expiresAt: { lte: new Date() } },
        data: { status: 'EXPIRED', decidedAt: new Date() },
      });
      if (u.count !== 1) return false;
      const t = await tx.eventTicket.updateMany({
        where: { paymentId: p.id, status: 'PENDING' },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await this.tickets.releaseSeats(tx, p.eventId, t.count);
      await logPayment(tx, {
        tenantId: p.tenantId,
        paymentId: p.id,
        eventId: p.eventId,
        actorRole: 'SYSTEM',
        action: 'EXPIRED',
        detail: { seats: t.count, hadResubmits: p.resubmitCount },
      });
      return true;
    });
    if (!done) return false;

    await this.afterSeatsFreed(p.eventId);
    void this.tickets.notify(p.user, {
      title: `Seat released: ${p.event.title}`,
      body: 'We did not get your payment proof in time, so the seat went back. You can register again if seats remain.',
      type: 'EVENT_PAYMENT',
      metadata: { eventId: p.eventId, paymentId: p.id, url: `/events/${p.eventId}` },
    });
    return true;
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private async afterSeatsFreed(eventId: string) {
    await this.redis.del(`event-booking:${eventId}`);
    await this.tickets
      .promoteWaitlist(eventId)
      .catch((err) =>
        this.logger.error(`Waitlist promotion failed for ${eventId}: ${err.message}`),
      );
  }

  private async loadOwned(userId: string, paymentId: string) {
    const p = await this.db.eventPayment.findFirst({
      where: { id: paymentId, userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            venue: true,
            city: true,
            posterImage: true,
            businessId: true,
            payUpiId: true,
            payeeName: true,
            payPhone: true,
            payQrImage: true,
          },
        },
        user: { select: { id: true, name: true, tenantId: true } },
        tickets: { orderBy: [{ isGuest: 'asc' }, { issuedAt: 'asc' }] },
      },
    });
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  private readonly detailInclude = {
    user: { select: { id: true, name: true, email: true, phone: true } },
    event: { select: { id: true, title: true, startDate: true, businessId: true } },
    tickets: { orderBy: [{ isGuest: 'asc' }, { issuedAt: 'asc' }] },
    logs: { orderBy: { createdAt: 'asc' } },
  } satisfies Prisma.EventPaymentInclude;

  /** Row for a list: no proof image, no timeline. */
  private row(p: any, view: PayerView) {
    const overdue =
      p.status === 'SUBMITTED' &&
      !!p.submittedAt &&
      Date.now() - new Date(p.submittedAt).getTime() >
        PAYMENT_LIMITS.verifyReminderHours * 3_600_000;
    return {
      id: p.id,
      eventId: p.eventId,
      status: p.status,
      amount: Number(p.amount),
      seats: p.seats,
      tier: p.tierName,
      utr: p.utr,
      hasScreenshot: !!p.proofImage,
      submittedAt: p.submittedAt,
      expiresAt: p.expiresAt,
      decidedAt: p.decidedAt,
      decisionNote: p.decisionNote,
      resubmitCount: p.resubmitCount,
      createdAt: p.createdAt,
      overdue,
      payer: {
        name: p.user?.name ?? '',
        profession: view.profiles.get(p.userId)?.profession ?? null,
        place: view.profiles.get(p.userId)?.place ?? null,
        ...(view.contacts ? { email: p.user?.email ?? '', phone: p.user?.phone ?? null } : {}),
      },
    };
  }

  private async buildDetail(p: any, view: PayerView) {
    let proofUrl: string | null = null;
    if (p.proofImage) {
      try {
        const ref = JSON.parse(p.proofImage);
        proofUrl = await this.storage.createSignedDownloadUrl(ref.bucket, ref.path, 600);
      } catch {
        proofUrl = null;
      }
    }
    // The same reference on another live or past payment is the clearest sign of a reused screenshot.
    const sameReference = p.utr
      ? await this.db.eventPayment.findMany({
          where: { utr: p.utr, id: { not: p.id } },
          select: { id: true, eventId: true, status: true },
          take: 10,
        })
      : [];
    return {
      ...this.row(p, view),
      payerNote: p.payerNote,
      event: p.event,
      proofUrl,
      sameReference,
      tickets: p.tickets.map((t: any) => ({
        id: t.id,
        holderName: t.holderName,
        isGuest: t.isGuest,
        code: t.code,
        status: t.status,
      })),
      logs: p.logs.map((l: any) => ({
        id: l.id,
        action: l.action,
        actorRole: l.actorRole,
        detail: l.detail,
        createdAt: l.createdAt,
      })),
    };
  }

  private summarise(
    groups: { status: string; _count: { _all: number }; _sum: { amount: Prisma.Decimal | null } }[],
  ) {
    const by = (s: string) => groups.find((g) => g.status === s);
    const count = (s: string) => by(s)?._count._all ?? 0;
    const sum = (s: string) => Number(by(s)?._sum.amount ?? 0);
    return {
      counts: Object.fromEntries(STATUSES.map((s) => [s, count(s)])),
      verifiedAmount: sum('APPROVED'),
      awaitingAmount: sum('SUBMITTED'),
      heldAmount: sum('PENDING'),
    };
  }
}
