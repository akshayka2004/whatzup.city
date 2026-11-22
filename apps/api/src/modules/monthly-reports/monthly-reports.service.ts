// ============================================================
// Monthly report. Read-only roll-up of one calendar month (India time):
// users, business analytics, new sign-ups, wishlists, revenue by category and the biggest spenders.
// Revenue and spend are counted from VERIFIED bills only (by the date on the bill).
// ============================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { EVENT_GROUPS, eventsFor } from '../analytics/event-taxonomy';
import {
  istDayOf,
  maskName,
  monthWindow,
  pctChange,
  reportCsv,
  round2,
  topSpenderBy,
  type SpendRow,
} from './monthly-report.util';

export type ReportScope = {
  tenantId: string;
  /** Set for a business owner: only these businesses are reported, and customer names are masked. */
  businessIds?: string[];
  /** Admin filter: only businesses in this category (by category id). */
  categoryId?: string;
};

const LIST_LIMIT = 100;

@Injectable()
export class MonthlyReportsService {
  constructor(private readonly db: DatabaseService) {}

  /** Businesses a person owns, co-manages (owner/moderator) or owns through a brand. */
  async businessIdsFor(userId: string, tenantId: string): Promise<string[]> {
    const rows = await this.db.business.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { brand: { ownerId: userId } },
          {
            staff: {
              some: {
                userId,
                isActive: true,
                deletedAt: null,
                role: { in: ['OWNER', 'MODERATOR'] as any },
              },
            },
          },
        ],
      },
      select: { id: true },
      take: 500,
    });
    return rows.map((r) => r.id);
  }

  async categories(tenantId: string) {
    return this.db.category.findMany({
      where: { tenantId, deletedAt: null, parentId: null, isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  async build(monthInput: string | undefined, scope: ReportScope) {
    const win = monthWindow(monthInput);
    if (!win) throw new BadRequestException('Month must look like 2026-11.');
    const { tenantId } = scope;
    const mine = !!scope.businessIds;

    // The businesses this report covers.
    const bizWhere: Record<string, any> = {
      tenantId,
      deletedAt: null,
      status: 'APPROVED',
      ...(scope.businessIds ? { id: { in: scope.businessIds } } : {}),
      ...(scope.categoryId ? { categoryId: scope.categoryId } : {}),
    };
    // tenant-scope-ok: bizWhere always carries tenantId
    const businesses = await this.db.business.findMany({
     
      where: bizWhere,
      select: {
        id: true,
        name: true,
        city: true,
        category: { select: { id: true, name: true } },
      },
      take: 5000,
    });
    const ids = businesses.map((b) => b.id);
    const byId = new Map(businesses.map((b) => [b.id, b]));
    const inRange = { gte: win.start, lt: win.end };
    const prevRange = { gte: win.prevStart, lt: win.start };
    const idFilter = { in: ids };

    const wantedEvents = [...eventsFor('profileView', 'call', 'directions', 'whatsapp')];

    const [events, billsNow, billsPrev, spendPairs, favs, reviews, userBlock] = await Promise.all([
      ids.length
        ? this.db.analyticsEvent.groupBy({
            by: ['businessId', 'event'],
            where: {
              tenantId,
              businessId: idFilter,
              event: { in: wantedEvents },
              createdAt: inRange,
            },
            _count: { _all: true },
          })
        : [],
      ids.length
        ? this.db.bill.groupBy({
            by: ['businessId'],
            where: {
              tenantId,
              businessId: idFilter,
              status: 'VERIFIED',
              deletedAt: null,
              billDate: inRange,
            },
            _sum: { amount: true },
            _count: { _all: true },
          })
        : [],
      ids.length
        ? this.db.bill.groupBy({
            by: ['businessId'],
            where: {
              tenantId,
              businessId: idFilter,
              status: 'VERIFIED',
              deletedAt: null,
              billDate: prevRange,
            },
            _sum: { amount: true },
            _count: { _all: true },
          })
        : [],
      ids.length
        ? this.db.bill.groupBy({
            by: ['businessId', 'userId'],
            where: {
              tenantId,
              businessId: idFilter,
              status: 'VERIFIED',
              deletedAt: null,
              billDate: inRange,
            },
            _sum: { amount: true },
            _count: { _all: true },
          })
        : [],
      ids.length
        ? this.db.favorite.groupBy({
            by: ['businessId'],
            where: { tenantId, businessId: idFilter, deletedAt: null, createdAt: inRange },
            _count: { _all: true },
          })
        : [],
      ids.length
        ? this.db.review.groupBy({
            by: ['businessId'],
            where: { businessId: idFilter, deletedAt: null, createdAt: inRange }, // tenant-scope-ok: ids are already tenant-scoped
            _count: { _all: true },
          })
        : [],
      mine ? Promise.resolve(null) : this.userSections(tenantId, win),
    ]);

    // ── per business ────────────────────────────────────────────────
    const count = (biz: string, group: keyof typeof EVENT_GROUPS) => {
      const names = new Set<string>(EVENT_GROUPS[group]);
      return (events as any[])
        .filter((e) => e.businessId === biz && names.has(e.event))
        .reduce((a, e) => a + e._count._all, 0);
    };
    const billMap = new Map((billsNow as any[]).map((b) => [b.businessId, b]));
    const favMap = new Map((favs as any[]).map((f) => [f.businessId, f._count._all as number]));
    const revMap = new Map((reviews as any[]).map((r) => [r.businessId, r._count._all as number]));

    const rows = businesses.map((b) => {
      const bill = billMap.get(b.id);
      return {
        id: b.id,
        name: b.name,
        category: b.category?.name ?? '—',
        city: b.city,
        views: count(b.id, 'profileView'),
        calls: count(b.id, 'call'),
        directions: count(b.id, 'directions'),
        whatsapp: count(b.id, 'whatsapp'),
        saves: favMap.get(b.id) ?? 0,
        bills: bill?._count._all ?? 0,
        revenue: round2(Number(bill?._sum.amount ?? 0)),
        reviews: revMap.get(b.id) ?? 0,
      };
    });
    rows.sort((a, b) => b.revenue - a.revenue || b.views - a.views || a.name.localeCompare(b.name));

    // ── revenue by category ─────────────────────────────────────────
    const cat = new Map<
      string,
      { category: string; revenue: number; bills: number; prev: number; businesses: Set<string> }
    >();
    const catOf = (bizId: string) => byId.get(bizId)?.category;
    const addCat = (bizId: string, rev: number, bills: number, isPrev: boolean) => {
      const c = catOf(bizId);
      if (!c) return;
      const cur = cat.get(c.id) ?? {
        category: c.name,
        revenue: 0,
        bills: 0,
        prev: 0,
        businesses: new Set(),
      };
      if (isPrev) cur.prev += rev;
      else {
        cur.revenue += rev;
        cur.bills += bills;
        if (rev > 0) cur.businesses.add(bizId);
      }
      cat.set(c.id, cur);
    };
    for (const b of billsNow as any[])
      addCat(b.businessId, Number(b._sum.amount ?? 0), b._count._all, false);
    for (const b of billsPrev as any[])
      addCat(b.businessId, Number(b._sum.amount ?? 0), b._count._all, true);
    const totalRevenue = [...cat.values()].reduce((a, c) => a + c.revenue, 0);
    const prevRevenue = [...cat.values()].reduce((a, c) => a + c.prev, 0);
    const revenueByCategory = [...cat.values()]
      .filter((c) => c.revenue > 0 || c.prev > 0)
      .map((c) => ({
        category: c.category,
        revenue: round2(c.revenue),
        bills: c.bills,
        businesses: c.businesses.size,
        share: totalRevenue ? round2((c.revenue / totalRevenue) * 100) : 0,
        change: pctChange(c.revenue, c.prev),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── highest spenders ────────────────────────────────────────────
    const spend: SpendRow[] = (spendPairs as any[]).map((p) => ({
      businessId: p.businessId,
      userId: p.userId,
      amount: Number(p._sum.amount ?? 0),
      bills: p._count._all,
    }));
    const topByBiz = topSpenderBy(spend, (r) => r.businessId);
    const topByCat = topSpenderBy(spend, (r) => catOf(r.businessId)?.id);
    const winners = new Set<string>();
    for (const v of topByBiz.values()) winners.add(v.userId);
    for (const v of topByCat.values()) winners.add(v.userId);
    const people = winners.size
      ? await this.db.user.findMany({
          where: { id: { in: [...winners] } }, // tenant-scope-ok: ids come from this tenant's bills
          select: { id: true, name: true, email: true },
        })
      : [];
    const nameOf = new Map(people.map((p) => [p.id, p]));
    const who = (userId: string) => {
      const p = nameOf.get(userId);
      // A business owner sees "Asha N." only; admins see the full name.
      return mine ? maskName(p?.name) : (p?.name ?? 'Customer');
    };
    const topSpenders = {
      byBusiness: [...topByBiz.entries()]
        .map(([bizId, v]) => ({
          business: byId.get(bizId)?.name ?? '—',
          category: catOf(bizId)?.name ?? '—',
          name: who(v.userId),
          amount: round2(v.amount),
          bills: v.bills,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, LIST_LIMIT),
      byCategory: [...topByCat.entries()]
        .map(([catId, v]) => ({
          category: cat.get(catId)?.category ?? '—',
          name: who(v.userId),
          amount: round2(v.amount),
          bills: v.bills,
        }))
        .sort((a, b) => b.amount - a.amount),
    };

    const totalSaves = rows.reduce((a, r) => a + r.saves, 0);
    return {
      month: { key: win.key, label: win.label, days: win.days, futureStart: win.futureStart },
      scope: mine ? 'mine' : 'platform',
      generatedAt: new Date().toISOString(),
      totals: {
        revenue: round2(totalRevenue),
        previousRevenue: round2(prevRevenue),
        revenueChange: pctChange(totalRevenue, prevRevenue),
        bills: rows.reduce((a, r) => a + r.bills, 0),
        businesses: rows.length,
        profileViews: rows.reduce((a, r) => a + r.views, 0),
        saves: totalSaves,
      },
      users: userBlock?.users ?? null,
      newUsers: userBlock?.newUsers ?? null,
      businesses: rows.slice(0, LIST_LIMIT),
      businessesShown: Math.min(rows.length, LIST_LIMIT),
      interest: {
        totalSaves,
        topSaved: rows
          .filter((r) => r.saves > 0)
          .sort((a, b) => b.saves - a.saves)
          .slice(0, 20)
          .map((r) => ({ name: r.name, category: r.category, saves: r.saves })),
      },
      revenueByCategory,
      topSpenders,
    };
  }

  /** Platform-only sections: everyone on the platform and who joined this month. */
  private async userSections(tenantId: string, win: NonNullable<ReturnType<typeof monthWindow>>) {
    const base = { tenantId, deletedAt: null };
    const [byRole, active, joined, joinedPrev, referred] = await Promise.all([
      this.db.user.groupBy({
        by: ['role'],
        where: { ...base, isActive: true },
        _count: { _all: true },
      }),
      this.db.user.count({
        where: { ...base, isActive: true, lastLoginAt: { gte: win.start, lt: win.end } },
      }),
      this.db.user.findMany({
        where: { ...base, createdAt: { gte: win.start, lt: win.end } },
        select: { createdAt: true, role: true },
        take: 50_000,
      }),
      this.db.user.count({ where: { ...base, createdAt: { gte: win.prevStart, lt: win.start } } }),
      this.db.user.count({
        where: { ...base, createdAt: { gte: win.start, lt: win.end }, referredBy: { not: null } },
      }),
    ]);
    const roleCounts: Record<string, number> = {};
    for (const r of byRole as any[]) roleCounts[r.role] = r._count._all;
    const days = new Map<string, number>();
    for (let i = 0; i < win.days; i++) {
      days.set(istDayOf(new Date(win.start.getTime() + i * 86_400_000 + 3_600_000)), 0);
    }
    for (const u of joined) {
      const d = istDayOf(u.createdAt);
      days.set(d, (days.get(d) ?? 0) + 1);
    }
    return {
      users: {
        total: Object.values(roleCounts).reduce((a, b) => a + b, 0),
        regular: roleCounts.USER ?? 0,
        activeThisMonth: active,
        byRole: roleCounts,
      },
      newUsers: {
        total: joined.length,
        regular: joined.filter((u) => u.role === 'USER').length,
        referred,
        previousTotal: joinedPrev,
        change: pctChange(joined.length, joinedPrev),
        byDay: [...days.entries()].map(([day, count]) => ({ day, count })),
      },
    };
  }

  csv(report: any) {
    return reportCsv(report);
  }
}
