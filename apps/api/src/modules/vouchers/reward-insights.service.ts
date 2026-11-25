// ============================================================
// Business insights: what the reward program does for one business. Revenue and customers from
// verified bills, who is new / returning / drifting away, how each reward moves people from "close" to
// "claimed" to "used", and how fast bills get approved (the thing that stalls progress).
// Names are shown as first name + initial. Nothing here lists a customer who has not bought from the
// business.
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { assertBusinessAccess } from '../../common/utils/business-access';
import { effectiveExpiry, istDay } from '../rewards/reward-rules';
import {
  Purchase,
  change,
  cohorts,
  dailySeries,
  dormancy,
  inWindow,
  overview,
  pct,
  redeemerUplift,
  spendBands,
  topCustomers,
  visitFrequency,
  weekdays,
} from './reward-insights.util';
import type { Actor } from './vouchers.service';

const DAY_MS = 86_400_000;
const FETCH_DAYS = 210;
const ROW_CAP = 100_000;

function maskName(name?: string | null): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'Customer';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

@Injectable()
export class RewardInsightsService {
  constructor(private readonly db: DatabaseService) {}

  async forBusiness(actor: Actor, businessIdOrEntity: string, daysInput = 30, now = Date.now()) {
    const business = await this.db.business.findFirst({
      where: { OR: [{ id: businessIdOrEntity }, { entityId: businessIdOrEntity }] },
      select: { id: true, name: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    await assertBusinessAccess(this.db, business.id, actor, { managersOnly: true });

    const days = Math.min(180, Math.max(7, Math.floor(daysInput) || 30));
    const to = now;
    const from = now - days * DAY_MS;
    const prevFrom = from - days * DAY_MS;
    const businessId = business.id;

    const [rows, firsts] = await Promise.all([
      // tenant-scope-ok: access asserted above; purchases are keyed by the globally unique business id
      this.db.verifiedPurchase.findMany({
        where: {
          businessId,
          deletedAt: null,
          purchaseDate: { gte: new Date(now - FETCH_DAYS * DAY_MS) },
        },
        select: { userId: true, amount: true, purchaseDate: true },
        orderBy: { purchaseDate: 'desc' },
        take: ROW_CAP,
      }),
      // tenant-scope-ok: same business, first purchase per customer
      this.db.verifiedPurchase.groupBy({
        by: ['userId'],
        where: { businessId, deletedAt: null },
        _min: { purchaseDate: true },
        orderBy: { userId: 'asc' },
        take: ROW_CAP,
      }),
    ]);
    const purchases: Purchase[] = rows.map((r) => ({
      userId: r.userId,
      amount: Number(r.amount),
      at: r.purchaseDate.getTime(),
    }));
    const firstEver = new Map<string, number>();
    for (const f of firsts)
      if (f._min.purchaseDate) firstEver.set(f.userId, f._min.purchaseDate.getTime());

    const cur = inWindow(purchases, from, to);
    const prev = inWindow(purchases, prevFrom, from);
    const now_ = overview(cur, firstEver, from, to);
    const before = overview(prev, firstEver, prevFrom, from);

    const [top, rewards, ops, mix, redemptions] = await Promise.all([
      this.topList(cur),
      this.rewards(businessId, from, to, purchases, now),
      this.operations(businessId, from, to, now),
      this.billMix(businessId, from, to),
      this.redemptionLog(businessId, from),
    ]);

    return {
      business: { id: businessId, name: business.name },
      range: { days, from: istDay(from), to: istDay(to) },
      overview: {
        ...now_,
        previous: before,
        revenueChange: change(now_.revenue, before.revenue),
        customersChange: change(now_.customers, before.customers),
        billsChange: change(now_.bills, before.bills),
      },
      daily: dailySeries(cur, from, to),
      weekdays: weekdays(cur),
      spendBands: spendBands(cur),
      frequency: visitFrequency(cur),
      cohorts: cohorts(purchases, 6, now),
      dormancy: dormancy(purchases, now),
      topCustomers: top,
      rewards,
      operations: ops,
      billMix: mix,
      redemptions,
      notes: {
        names: 'Customer names are shown as a first name and an initial.',
        uplift:
          'Spend before and after is a rough guide. People who claim rewards are often already your regulars.',
      },
    };
  }

  private async topList(cur: Purchase[]) {
    const top = topCustomers(cur, 10);
    if (!top.length) return [];
    // tenant-scope-ok: names of customers who bought from this business, masked below
    const users = await this.db.user.findMany({
      where: { id: { in: top.map((t) => t.userId) } },
      select: { id: true, name: true },
    });
    const name = new Map(users.map((u) => [u.id, u.name]));
    return top.map((t) => ({
      name: maskName(name.get(t.userId)),
      spend: t.spend,
      visits: t.visits,
      lastVisit: istDay(t.last),
    }));
  }

  /** The reward funnel per reward, and what rewards cost and bring in. */
  private async rewards(
    businessId: string,
    from: number,
    to: number,
    purchases: Purchase[],
    now: number,
  ) {
    // tenant-scope-ok: rewards of this business
    const vouchers = await this.db.voucher.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (!vouchers.length) return { list: [], totals: null, uplift: null };
    const ids = vouchers.map((v) => v.id);
    const [events, claims] = await Promise.all([
      // tenant-scope-ok: this business's reward events
      this.db.rewardEvent.groupBy({
        by: ['voucherId', 'kind'],
        where: {
          businessId,
          voucherId: { in: ids },
          createdAt: { gte: new Date(from), lt: new Date(to) },
        },
        _count: { _all: true },
        orderBy: { voucherId: 'asc' },
      }),
      // tenant-scope-ok: this business's claims
      this.db.voucherClaim.findMany({
        where: { businessId, voucherId: { in: ids }, deletedAt: null },
        select: {
          voucherId: true,
          userId: true,
          status: true,
          unlockedAt: true,
          redeemedAt: true,
          expiresAt: true,
          redeemAmount: true,
        },
        take: 20_000,
      }),
    ]);

    const evCount = (vid: string, kind: string) =>
      events.find((e) => e.voucherId === vid && e.kind === kind)?._count._all ?? 0;

    const list = vouchers.map((v) => {
      const mine = claims.filter((c) => c.voucherId === v.id);
      const redeemed = mine.filter((c) => c.status === 'REDEEMED');
      const redeemedInWindow = redeemed.filter(
        (c) => c.redeemedAt && c.redeemedAt.getTime() >= from && c.redeemedAt.getTime() < to,
      );
      const open = mine.filter(
        (c) => c.status === 'UNLOCKED' && effectiveExpiry(c, v).getTime() >= now,
      ).length;
      const expired = mine.filter(
        (c) => c.status === 'UNLOCKED' && effectiveExpiry(c, v).getTime() < now,
      ).length;
      const gaps = redeemed
        .filter((c) => c.redeemedAt)
        .map((c) => (c.redeemedAt!.getTime() - c.unlockedAt.getTime()) / DAY_MS);
      const avgDaysToUse = gaps.length
        ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10
        : null;
      const billTotal = redeemedInWindow.reduce((a, c) => a + Number(c.redeemAmount ?? 0), 0);
      const value = v.rewardValue != null ? Number(v.rewardValue) : null;
      // What the reward cost: a flat amount is exact; a percent needs the bill amounts staff typed.
      const cost =
        v.rewardType === 'AMOUNT' && value != null
          ? value * redeemedInWindow.length
          : v.rewardType === 'PERCENT' && value != null && billTotal > 0
            ? Math.round((billTotal * value) / 100)
            : null;
      const claimedN = evCount(v.id, 'CLAIMED');
      const readyN = evCount(v.id, 'READY');
      return {
        id: v.id,
        title: v.title,
        status: v.status,
        spendWindow: v.spendWindow,
        repeatable: v.repeatable,
        targeted: !!v.audience && Object.keys(v.audience as object).length > 0,
        threshold: Number(v.thresholdAmount),
        funnel: {
          near: evCount(v.id, 'NEAR'),
          ready: readyN,
          claimed: claimedN,
          redeemed: redeemedInWindow.length,
          expiring: evCount(v.id, 'EXPIRING'),
        },
        claimedToUsedRate: pct(redeemed.length, mine.length),
        readyToClaimedRate: pct(claimedN, readyN),
        unusedOpen: open,
        unusedExpired: expired,
        avgDaysToUse,
        cost,
        redeemedBillTotal: Math.round(billTotal * 100) / 100,
        claimsTotal: mine.length,
        slotsLeft:
          v.maxRedemptions != null ? Math.max(0, v.maxRedemptions - v.currentClaims) : null,
      };
    });

    const redeems = claims
      .filter((c) => c.redeemedAt)
      .map((c) => ({ userId: c.userId, at: c.redeemedAt!.getTime() }));
    return {
      list,
      totals: {
        claimed: list.reduce((a, r) => a + r.funnel.claimed, 0),
        redeemed: list.reduce((a, r) => a + r.funnel.redeemed, 0),
        cost: list.reduce((a, r) => a + (r.cost ?? 0), 0),
        unusedOpen: list.reduce((a, r) => a + r.unusedOpen, 0),
      },
      uplift: redeemerUplift(redeems, purchases, now),
    };
  }

  /** How quickly bills get approved: slow approval is the main reason customers stop trying. */
  private async operations(businessId: string, from: number, to: number, now: number) {
    const [pending, oldest, decided] = await Promise.all([
      // tenant-scope-ok: bill queue of this business (keyed by business id, see docs 12.3)
      this.db.billVerification.count({ where: { businessId, status: 'PENDING' } }),
      this.db.billVerification.aggregate({
        where: { businessId, status: 'PENDING' },
        _min: { createdAt: true },
      }),
      // tenant-scope-ok: same queue
      this.db.billVerification.findMany({
        where: { businessId, createdAt: { gte: new Date(from), lt: new Date(to) } },
        select: { status: true, createdAt: true, verifiedAt: true },
        take: 5000,
      }),
    ]);
    const approved = decided.filter((d) => d.status === 'APPROVED');
    const rejected = decided.filter((d) => d.status === 'REJECTED').length;
    const hours = approved
      .filter((d) => d.verifiedAt)
      .map((d) => (d.verifiedAt!.getTime() - d.createdAt.getTime()) / 3_600_000);
    const sorted = [...hours].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    const oldestAt = oldest._min.createdAt;
    return {
      pending,
      oldestPendingHours: oldestAt
        ? Math.round(((now - oldestAt.getTime()) / 3_600_000) * 10) / 10
        : null,
      submitted: decided.length,
      approved: approved.length,
      rejected,
      approvalRate: pct(approved.length, approved.length + rejected),
      medianHoursToApprove: median != null ? Math.round(median * 10) / 10 : null,
      slowShare: hours.length ? pct(hours.filter((h) => h > 24).length, hours.length) : null,
    };
  }

  /** Photo bills vs counter bills, and how customers ordered and paid. */
  private async billMix(businessId: string, from: number, to: number) {
    const where = {
      businessId,
      status: 'VERIFIED' as const,
      deletedAt: null,
      createdAt: { gte: new Date(from), lt: new Date(to) },
    };
    const [bySource, byChannel, byPayment] = await Promise.all([
      // tenant-scope-ok: verified bills of this business
      this.db.bill.groupBy({
        by: ['source'],
        where,
        _count: { _all: true },
        orderBy: { source: 'asc' },
      }),
      // tenant-scope-ok: verified bills of this business (access asserted by the caller)
      this.db.bill.groupBy({
        by: ['orderChannel'],
        where,
        _count: { _all: true },
        orderBy: { orderChannel: 'asc' },
      }),
      // tenant-scope-ok: verified bills of this business (access asserted by the caller)
      this.db.bill.groupBy({
        by: ['paymentMode'],
        where,
        _count: { _all: true },
        orderBy: { paymentMode: 'asc' },
      }),
    ]);
    const norm = (rows: any[], key: string) =>
      rows.map((r) => ({ label: r[key] ?? 'Not asked', bills: r._count._all }));
    return {
      source: norm(bySource, 'source'),
      channel: norm(byChannel, 'orderChannel'),
      payment: norm(byPayment, 'paymentMode'),
    };
  }

  /** The last rewards used, who served them: so an owner can see staff doing the right thing. */
  private async redemptionLog(businessId: string, from: number) {
    // tenant-scope-ok: this business's redemptions
    const rows = await this.db.voucherClaim.findMany({
      where: { businessId, status: 'REDEEMED', redeemedAt: { gte: new Date(from) } },
      orderBy: { redeemedAt: 'desc' },
      take: 20,
      select: {
        redeemedAt: true,
        redeemedBy: true,
        userId: true,
        redeemAmount: true,
        voucher: { select: { title: true } },
      },
    });
    if (!rows.length) return [];
    const ids = [
      ...new Set(rows.flatMap((r) => [r.userId, r.redeemedBy].filter(Boolean) as string[])),
    ];
    // tenant-scope-ok: names for the people in these rows
    const users = await this.db.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const name = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({
      at: r.redeemedAt,
      reward: r.voucher.title,
      customer: maskName(name.get(r.userId)),
      staff: r.redeemedBy ? (name.get(r.redeemedBy) ?? 'Staff') : null,
      billAmount: r.redeemAmount != null ? Number(r.redeemAmount) : null,
    }));
  }
}
