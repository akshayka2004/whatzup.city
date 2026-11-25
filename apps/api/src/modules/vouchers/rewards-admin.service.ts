// ============================================================
// Platform oversight of business rewards: every reward on the platform with what it has handed out and
// still owes, and a short watch list of patterns that look like misuse (many Quick pay bills for the
// same customer, one staff member entering a lot of bills, a business where nearly everything is typed
// at the counter). The watch list only points at things to look at; it never blocks anyone.
// ============================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { effectiveExpiry } from '../rewards/reward-rules';

const DAY_MS = 86_400_000;
const PAGE = 25;

export const WATCH = {
  days: 30,
  /** Same customer, same business, this many Quick pay bills in the period. */
  sameCustomer: 5,
  /** One staff member, this many Quick pay bills in one day. */
  staffPerDay: 30,
  /** A business with at least this many counter bills, of which this share are Quick pay. */
  businessMinBills: 20,
  businessShare: 0.9,
};

type Flag = { kind: string; severity: 'LOOK' | 'CHECK'; text: string; businessId: string };

@Injectable()
export class RewardsAdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** What an AMOUNT reward still costs if every open code is used; other kinds cannot be priced. */
  private open(v: any, claims: any[], now: number) {
    return claims.filter(
      (c) =>
        c.voucherId === v.id && c.status === 'UNLOCKED' && effectiveExpiry(c, v).getTime() >= now,
    ).length;
  }

  async overview(q: { status?: string; search?: string; page?: number } = {}, now = Date.now()) {
    const page = Math.max(1, Math.floor(Number(q.page)) || 1);
    const where: Record<string, any> = { deletedAt: null };
    if (q.status === 'LIVE') {
      where.status = 'ACTIVE';
      where.endDate = { gte: new Date(now) };
    } else if (q.status === 'PAUSED') where.status = 'PAUSED';
    else if (q.status === 'ENDED') where.endDate = { lt: new Date(now) };
    const search = String(q.search ?? '')
      .trim()
      .slice(0, 80);
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    // tenant-scope-ok: platform admin view across all businesses; role-guarded in the controller
    const [rows, total, live] = await Promise.all([
      // tenant-scope-ok: platform admin view across all businesses; role-guarded in the controller
      this.db.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE,
        take: PAGE,
        include: { business: { select: { id: true, name: true, city: true } } },
      }),
      // tenant-scope-ok: platform admin view across all businesses; role-guarded in the controller
      this.db.voucher.count({ where }),
      // tenant-scope-ok: platform admin view across all businesses; role-guarded in the controller
      this.db.voucher.count({
        where: { deletedAt: null, status: 'ACTIVE', endDate: { gte: new Date(now) } },
      }),
    ]);
    const ids = rows.map((r) => r.id);
    // tenant-scope-ok: claims of the rewards on this page
    const claims = ids.length
      ? // tenant-scope-ok: claims of the rewards on this page
        await this.db.voucherClaim.findMany({
          where: { voucherId: { in: ids }, deletedAt: null },
          select: { voucherId: true, status: true, expiresAt: true, redeemAmount: true },
          take: 50_000,
        })
      : [];
    const list = rows.map((v) => {
      const mine = claims.filter((c) => c.voucherId === v.id);
      const redeemed = mine.filter((c) => c.status === 'REDEEMED').length;
      const open = this.open(v, claims, now);
      const value = v.rewardValue != null ? Number(v.rewardValue) : null;
      return {
        id: v.id,
        title: v.title,
        status: v.status,
        endDate: v.endDate,
        business: v.business,
        threshold: Number(v.thresholdAmount),
        rewardType: v.rewardType,
        rewardValue: value,
        rewardLabel: v.rewardLabel,
        repeatable: v.repeatable,
        spendWindow: v.spendWindow,
        targeted: !!v.audience && Object.keys(v.audience as object).length > 0,
        claimed: mine.length,
        redeemed,
        open,
        slotsLeft:
          v.maxRedemptions != null ? Math.max(0, v.maxRedemptions - v.currentClaims) : null,
        // An exact owed amount only for a flat ₹ reward; a percent or a free item cannot be priced here.
        owed: v.rewardType === 'AMOUNT' && value != null ? value * open : null,
        given: v.rewardType === 'AMOUNT' && value != null ? value * redeemed : null,
      };
    });
    return {
      data: list,
      meta: { total, page, limit: PAGE },
      summary: {
        live,
        owed: list.reduce((a, r) => a + (r.owed ?? 0), 0),
        openCodes: list.reduce((a, r) => a + r.open, 0),
      },
      watch: await this.watchList(now),
    };
  }

  /** Patterns worth a look in the last 30 days of Quick pay bills. */
  async watchList(now = Date.now()): Promise<Flag[]> {
    const since = new Date(now - WATCH.days * DAY_MS);
    const flags: Flag[] = [];
    // tenant-scope-ok: platform-wide watch list over confirmed Quick pay bills
    const [pairs, byStaffDay, perBusiness] = await Promise.all([
      this.db.counterBill.groupBy({
        by: ['businessId', 'userId'],
        where: { status: 'CONFIRMED', decidedAt: { gte: since }, businessId: { not: null } },
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { businessId: 'asc' },
        take: 5000,
      }),
      this.db.counterBill.findMany({
        where: { status: 'CONFIRMED', decidedAt: { gte: since }, staffId: { not: null } },
        select: { businessId: true, staffId: true, decidedAt: true },
        take: 50_000,
      }),
      this.db.counterBill.groupBy({
        by: ['businessId'],
        where: { status: 'CONFIRMED', decidedAt: { gte: since }, businessId: { not: null } },
        _count: { _all: true },
        orderBy: { businessId: 'asc' },
        take: 5000,
      }),
    ]);

    for (const p of pairs) {
      if (p._count._all >= WATCH.sameCustomer) {
        flags.push({
          kind: 'SAME_CUSTOMER',
          severity: 'LOOK',
          businessId: p.businessId!,
          text: `One customer has ${p._count._all} Quick pay bills here in ${WATCH.days} days (₹${Math.round(Number(p._sum.amount ?? 0)).toLocaleString('en-IN')}).`,
        });
      }
    }

    const perDay = new Map<string, number>();
    for (const r of byStaffDay) {
      const k = `${r.businessId}|${r.staffId}|${new Date(r.decidedAt!.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10)}`;
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }
    const seenStaff = new Set<string>();
    for (const [k, n] of perDay) {
      const [businessId, staffId] = k.split('|');
      if (n >= WATCH.staffPerDay && !seenStaff.has(`${businessId}|${staffId}`)) {
        seenStaff.add(`${businessId}|${staffId}`);
        flags.push({
          kind: 'STAFF_VOLUME',
          severity: 'CHECK',
          businessId,
          text: `One staff member entered ${n} Quick pay bills in a single day.`,
        });
      }
    }

    // Share of the business's verified bills that are Quick pay.
    const businessIds = perBusiness
      .filter((b) => b._count._all >= WATCH.businessMinBills)
      .map((b) => b.businessId!);
    if (businessIds.length) {
      // tenant-scope-ok: platform-wide watch list
      const all = await this.db.bill.groupBy({
        by: ['businessId'],
        where: {
          businessId: { in: businessIds },
          status: 'VERIFIED',
          deletedAt: null,
          createdAt: { gte: since },
        },
        _count: { _all: true },
        orderBy: { businessId: 'asc' },
      });
      const total = new Map(all.map((a) => [a.businessId, a._count._all]));
      for (const b of perBusiness) {
        const t = total.get(b.businessId!) ?? 0;
        if (
          b._count._all >= WATCH.businessMinBills &&
          t > 0 &&
          b._count._all / t >= WATCH.businessShare
        ) {
          flags.push({
            kind: 'ALL_COUNTER',
            severity: 'LOOK',
            businessId: b.businessId!,
            text: `${Math.round((b._count._all / t) * 100)}% of verified bills here are typed at the counter (${b._count._all} of ${t}).`,
          });
        }
      }
    }

    if (!flags.length) return [];
    // tenant-scope-ok: business names for the flags
    const names = await this.db.business.findMany({
      where: { id: { in: [...new Set(flags.map((f) => f.businessId))] } },
      select: { id: true, name: true, city: true },
    });
    const byId = new Map(names.map((n) => [n.id, n]));
    return flags
      .map((f) => ({ ...f, business: byId.get(f.businessId) ?? null }))
      .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'CHECK' ? -1 : 1))
      .slice(0, 50);
  }

  /** An admin pauses or resumes a business reward (for example after a complaint). Audited. */
  async setStatus(
    actor: { id: string; tenantId?: string | null },
    voucherId: string,
    status: string,
  ) {
    if (status !== 'ACTIVE' && status !== 'PAUSED') {
      throw new BadRequestException('Status must be ACTIVE or PAUSED.');
    }
    const v = await this.db.voucher.findFirst({ where: { id: voucherId, deletedAt: null } }); // tenant-scope-ok: platform admin
    if (!v) throw new NotFoundException('Reward not found');
    if (v.status === status) return { id: v.id, status };
    await this.db.voucher.update({
      where: { id: voucherId },
      data: { status, updatedBy: actor.id },
    });
    await this.audit.log({
      tenantId: v.tenantId,
      userId: actor.id,
      action: status === 'PAUSED' ? 'VOUCHER_PAUSED_BY_ADMIN' : 'VOUCHER_RESUMED_BY_ADMIN',
      resource: 'VOUCHER',
      resourceId: voucherId,
      oldData: { status: v.status },
      newData: { status },
    });
    return { id: v.id, status };
  }
}
