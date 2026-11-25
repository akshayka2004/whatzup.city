// ============================================================
// Quick pay: a bill with no photo and no approval queue.
//
//   1. The customer opens "Quick pay" in the app: a 6-digit code, good for 10 minutes.
//   2. Staff type the code and the bill amount at the counter.
//   3. The customer sees "₹850 at Cafe X, confirm?" on their own phone and taps Confirm.
//   4. A verified bill is created on the spot, so progress and rewards move immediately.
//
// Both sides vouch for the amount: the staff member typed it, the customer confirmed it. That is enough
// for ordinary bills, so the owner is not asked to approve each one. The safeguards: an amount ceiling,
// a few per customer per day, nobody can enter their own bill, every one is logged with the staff
// member, and the owner can void one within 7 days.
// ============================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { DatabaseService } from '../../common/database/database.service';
import { assertBusinessAccess } from '../../common/utils/business-access';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardProgressService } from '../rewards/reward-progress.service';

export const QUICK = {
  codeMinutes: 10,
  amountMax: 25_000,
  perCustomerPerDay: 3,
  openedPerHour: 20,
  voidDays: 7,
};

export type QuickActor = { id: string; role?: string | null; tenantId?: string | null };

const MIN_MS = 60_000;
const DAY_MS = 86_400_000;

const maskName = (name?: string | null) => {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'Customer';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

@Injectable()
export class QuickBillsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly rewards: RewardProgressService,
    @Optional() private readonly audit?: AuditService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  // ── customer ─────────────────────────────────────────────────────────────

  /** A code to read out at the counter. Re-opening the screen shows the same live code. */
  async open(user: QuickActor) {
    if (!user.tenantId) throw new BadRequestException('Could not find your account.');
    const now = Date.now();
    await this.db.counterBill.updateMany({
      where: {
        userId: user.id,
        status: { in: ['OPEN', 'AWAITING'] },
        expiresAt: { lt: new Date(now) },
      },
      data: { status: 'EXPIRED' },
    });
    const live = await this.db.counterBill.findFirst({
      where: {
        userId: user.id,
        status: { in: ['OPEN', 'AWAITING'] },
        expiresAt: { gte: new Date(now) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (live) return this.view(live);

    const recent = await this.db.counterBill.count({
      where: { userId: user.id, createdAt: { gte: new Date(now - 60 * MIN_MS) } },
    });
    if (recent >= QUICK.openedPerHour) {
      throw new BadRequestException(
        'Too many Quick pay codes in the last hour. Please try again later.',
      );
    }
    for (let i = 0; i < 6; i++) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      try {
        const row = await this.db.counterBill.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            code,
            expiresAt: new Date(now + QUICK.codeMinutes * MIN_MS),
          },
        });
        return this.view(row);
      } catch (err: any) {
        // The code is in use by someone else's open request: try another.
        if (err?.code !== 'P2002') throw err;
      }
    }
    throw new ConflictException('Could not make a code just now. Please try again.');
  }

  private view(r: any, business?: { id: string; name: string } | null) {
    return {
      id: r.id,
      code: r.code,
      status: r.status,
      expiresAt: r.expiresAt,
      amount: r.amount != null ? Number(r.amount) : null,
      billNumber: r.billNumber ?? null,
      business: business ?? null,
    };
  }

  /** The customer's screen polls this: is staff's amount here yet? */
  async status(user: QuickActor, id: string) {
    const r = await this.db.counterBill.findFirst({ where: { id, userId: user.id } });
    if (!r) throw new NotFoundException('Not found');
    let status = r.status;
    if ((status === 'OPEN' || status === 'AWAITING') && r.expiresAt.getTime() < Date.now()) {
      await this.db.counterBill.updateMany({ where: { id, status }, data: { status: 'EXPIRED' } });
      status = 'EXPIRED';
    }
    const business = r.businessId
      ? await this.db.business.findFirst({
          where: { id: r.businessId },
          select: { id: true, name: true },
        }) // tenant-scope-ok: name of the shop the customer is paying at
      : null;
    return this.view({ ...r, status }, business);
  }

  /** The customer's answer to "₹850 at Cafe X?". */
  async decide(user: QuickActor, id: string, accept: boolean) {
    const r = await this.db.counterBill.findFirst({ where: { id, userId: user.id } });
    if (!r) throw new NotFoundException('Not found');
    if (r.status !== 'AWAITING' || !r.businessId || r.amount == null) {
      throw new BadRequestException('There is nothing to confirm right now.');
    }
    if (r.expiresAt.getTime() < Date.now()) {
      await this.db.counterBill.updateMany({
        where: { id, status: 'AWAITING' },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('That request timed out. Ask the shop to enter it again.');
    }
    if (!accept) {
      await this.db.counterBill.updateMany({
        where: { id, status: 'AWAITING' },
        data: { status: 'DECLINED', decidedAt: new Date() },
      });
      return { status: 'DECLINED' };
    }

    const amount = Number(r.amount);
    const now = new Date();
    const businessId = r.businessId;
    const staffId = r.staffId;
    let billId = '';
    try {
      billId = await this.db.$transaction(async (tx: any) => {
        // One step decides: of two taps, exactly one moves AWAITING to CONFIRMED.
        const won = await tx.counterBill.updateMany({
          where: { id, status: 'AWAITING' },
          data: { status: 'CONFIRMED', decidedAt: now },
        });
        if (won.count !== 1) throw new ConflictException('Already answered.');
        const bill = await tx.bill.create({
          data: {
            tenantId: r.tenantId,
            userId: r.userId,
            businessId,
            amount,
            billDate: now,
            billImage: 'counter-confirm',
            status: 'VERIFIED',
            verifiedAt: now,
            verifiedBy: staffId,
            billNumber: r.billNumber,
            orderChannel: 'IN_STORE',
            description: 'Confirmed at the counter',
            source: 'COUNTER',
          },
        });
        await tx.verifiedPurchase.create({
          data: {
            tenantId: r.tenantId,
            userId: r.userId,
            businessId,
            billId: bill.id,
            amount,
            purchaseDate: now,
          },
        });
        await tx.pointsEntry.create({
          data: { tenantId: r.tenantId, userId: r.userId, billId: bill.id, points: amount },
        });
        await tx.counterBill.update({ where: { id }, data: { billId: bill.id } });
        return bill.id as string;
      });
    } catch (err: any) {
      if (err instanceof ConflictException) {
        const again = await this.db.counterBill.findFirst({ where: { id, userId: user.id } });
        return { status: again?.status ?? 'CONFIRMED', billId: again?.billId ?? null };
      }
      throw err;
    }

    // After the bill exists, none of this can undo it.
    await this.db.businessCustomer
      .updateMany({
        where: { userId: r.userId, businessId, deletedAt: null },
        data: { totalVerifiedPurchases: { increment: 1 } },
      })
      .catch(() => undefined);
    void this.rewards.onSpend(r.userId, businessId).catch(() => undefined);
    await this.audit?.log({
      tenantId: r.tenantId,
      userId: r.userId,
      action: 'COUNTER_BILL_CONFIRMED',
      resource: 'BILL',
      resourceId: billId,
      metadata: { businessId, staffId, amount },
    });
    return { status: 'CONFIRMED', billId };
  }

  // ── staff ────────────────────────────────────────────────────────────────

  /** Staff enter the customer's code and the amount. The customer is asked to confirm. */
  async enter(
    actor: QuickActor,
    input: { businessId: string; code: string; amount: number; billNumber?: string },
  ) {
    const business = await this.db.business.findFirst({
      where: { OR: [{ id: input.businessId }, { entityId: input.businessId }] },
      select: { id: true, name: true, ownerId: true, status: true, tenantId: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    await assertBusinessAccess(this.db, business.id, actor);
    if (business.status !== 'APPROVED') {
      throw new BadRequestException('Quick pay works once the business is approved.');
    }

    const amount = Math.round(Number(input.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1)
      throw new BadRequestException('Enter the bill amount.');
    if (amount > QUICK.amountMax) {
      throw new BadRequestException(
        `Quick pay is for bills up to ₹${QUICK.amountMax.toLocaleString('en-IN')}. For larger bills, the customer can upload the bill photo.`,
      );
    }
    const code = String(input.code ?? '').replace(/\D/g, '');
    if (code.length !== 6) throw new BadRequestException('The code is 6 digits.');

    const now = Date.now();
    const req = await this.db.counterBill.findFirst({
      where: { code, status: 'OPEN', expiresAt: { gte: new Date(now) } },
    });
    if (!req)
      throw new NotFoundException(
        'That code is not active. Ask the customer to open Quick pay again.',
      );

    if (req.userId === actor.id) throw new ForbiddenException('You cannot enter your own bill.');
    // Nobody who works at the business can be its Quick pay customer.
    const insider = await this.db.business.findFirst({
      where: {
        id: business.id,
        OR: [
          { ownerId: req.userId },
          { brand: { ownerId: req.userId } },
          { staff: { some: { userId: req.userId, isActive: true, deletedAt: null } } },
        ],
      },
      select: { id: true },
    });
    if (insider)
      throw new ForbiddenException(
        'That account belongs to this business, so it cannot earn rewards here.',
      );

    const today = new Date(now - DAY_MS);
    const todays = await this.db.bill.count({
      where: {
        userId: req.userId,
        businessId: business.id,
        source: 'COUNTER',
        status: 'VERIFIED',
        deletedAt: null,
        createdAt: { gte: today },
      },
    });
    if (todays >= QUICK.perCustomerPerDay) {
      throw new BadRequestException(
        `This customer already has ${QUICK.perCustomerPerDay} Quick pay bills today. Ask them to upload a bill photo instead.`,
      );
    }

    const moved = await this.db.counterBill.updateMany({
      where: { id: req.id, status: 'OPEN' },
      data: {
        status: 'AWAITING',
        businessId: business.id,
        staffId: actor.id,
        amount,
        billNumber: input.billNumber ? String(input.billNumber).trim().slice(0, 60) : null,
        enteredAt: new Date(now),
        expiresAt: new Date(now + QUICK.codeMinutes * MIN_MS),
      },
    });
    if (moved.count !== 1)
      throw new ConflictException('That code was just used. Ask the customer for a new one.');

    await this.notifications
      ?.send({
        tenantId: req.tenantId,
        userId: req.userId,
        title: `Confirm ₹${amount.toLocaleString('en-IN')} at ${business.name}`,
        body: 'Open Quick pay and tap Confirm if the amount is right.',
        type: 'IN_APP',
        channel: 'BUSINESS',
        metadata: { kind: 'QUICK_PAY_CONFIRM', counterBillId: req.id, businessId: business.id },
      })
      .catch(() => undefined);
    return {
      id: req.id,
      status: 'AWAITING',
      amount,
      business: { id: business.id, name: business.name },
    };
  }

  /** Staff can see whether the customer has confirmed yet. */
  async staffStatus(actor: QuickActor, businessId: string, id: string) {
    const biz = await this.db.business.findFirst({
      where: { OR: [{ id: businessId }, { entityId: businessId }] },
      select: { id: true },
    });
    if (!biz) throw new NotFoundException('Business not found');
    await assertBusinessAccess(this.db, biz.id, actor);
    const r = await this.db.counterBill.findFirst({ where: { id, businessId: biz.id } });
    if (!r) throw new NotFoundException('Not found');
    let status = r.status;
    if (status === 'AWAITING' && r.expiresAt.getTime() < Date.now()) status = 'EXPIRED';
    return { id: r.id, status, amount: r.amount != null ? Number(r.amount) : null };
  }

  // ── owner ────────────────────────────────────────────────────────────────

  /** Recent Quick pay bills of a business, with who entered them, so an owner can spot misuse. */
  async recent(actor: QuickActor, businessId: string) {
    const biz = await this.db.business.findFirst({
      where: { OR: [{ id: businessId }, { entityId: businessId }] },
      select: { id: true },
    });
    if (!biz) throw new NotFoundException('Business not found');
    await assertBusinessAccess(this.db, biz.id, actor, { managersOnly: true });
    const rows = await this.db.counterBill.findMany({
      where: { businessId: biz.id, status: 'CONFIRMED' },
      orderBy: { decidedAt: 'desc' },
      take: 50,
    });
    const bills = rows.length
      ? await this.db.bill.findMany({
          where: { id: { in: rows.map((r) => r.billId!).filter(Boolean) } },
          select: { id: true, voidedAt: true },
        })
      : [];
    const voided = new Map(bills.map((b) => [b.id, b.voidedAt]));
    const people = await this.db.user.findMany({
      where: {
        id: {
          in: [...new Set(rows.flatMap((r) => [r.userId, r.staffId].filter(Boolean) as string[]))],
        },
      },
      select: { id: true, name: true },
    });
    const name = new Map(people.map((p) => [p.id, p.name]));
    return rows.map((r) => ({
      id: r.id,
      billId: r.billId,
      at: r.decidedAt,
      amount: Number(r.amount),
      customer: maskName(name.get(r.userId)),
      staff: r.staffId ? (name.get(r.staffId) ?? 'Staff') : null,
      voided: !!(r.billId && voided.get(r.billId)),
      canVoid:
        !!r.billId &&
        !voided.get(r.billId) &&
        !!r.decidedAt &&
        Date.now() - r.decidedAt.getTime() <= QUICK.voidDays * DAY_MS,
    }));
  }

  /** The owner cancels a Quick pay bill (wrong amount, a mistake, or misuse): spend and points are taken back. */
  async voidBill(actor: QuickActor, billId: string) {
    const bill = await this.db.bill.findFirst({ where: { id: billId, deletedAt: null } });
    if (!bill) throw new NotFoundException('Bill not found');
    await assertBusinessAccess(this.db, bill.businessId, actor, { managersOnly: true });
    if (bill.source !== 'COUNTER') {
      throw new BadRequestException(
        'Only Quick pay bills can be cancelled here. Photo bills are handled in the bill queue.',
      );
    }
    if (bill.voidedAt) return { ok: true, already: true };
    if (Date.now() - bill.createdAt.getTime() > QUICK.voidDays * DAY_MS) {
      throw new BadRequestException(
        `A Quick pay bill can be cancelled within ${QUICK.voidDays} days.`,
      );
    }
    const now = new Date();
    await this.db.$transaction(async (tx: any) => {
      await tx.bill.update({
        where: { id: billId },
        data: { voidedAt: now, voidedBy: actor.id, status: 'REJECTED' },
      });
      await tx.verifiedPurchase.updateMany({
        where: { billId, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.pointsEntry.updateMany({
        where: { billId, deletedAt: null },
        data: { deletedAt: now },
      });
    });
    await this.db.businessCustomer
      .updateMany({
        where: {
          userId: bill.userId,
          businessId: bill.businessId,
          deletedAt: null,
          totalVerifiedPurchases: { gt: 0 },
        },
        data: { totalVerifiedPurchases: { decrement: 1 } },
      })
      .catch(() => undefined);
    await this.audit?.log({
      tenantId: bill.tenantId,
      userId: actor.id,
      action: 'COUNTER_BILL_VOIDED',
      resource: 'BILL',
      resourceId: billId,
      metadata: { businessId: bill.businessId, amount: Number(bill.amount) },
    });
    await this.notifications
      ?.send({
        tenantId: bill.tenantId,
        userId: bill.userId,
        title: 'A bill was cancelled',
        body: `A ₹${Number(bill.amount).toLocaleString('en-IN')} Quick pay bill was cancelled by the shop. Your progress was adjusted.`,
        type: 'IN_APP',
        channel: 'BUSINESS',
        metadata: { kind: 'QUICK_PAY_VOIDED', billId },
      })
      .catch(() => undefined);
    return { ok: true };
  }
}
