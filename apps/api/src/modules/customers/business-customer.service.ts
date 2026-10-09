import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

// Cast helper — bypasses stale Prisma client types after schema migration.
function prismaAny(db: DatabaseService): any {
  return db;
}

type InteractionType = 'OFFER_CLAIM' | 'OFFER_REDEEM' | 'BILL_UPLOAD' | 'REVIEW' | 'CAMPAIGN';

/** Lifecycle windows, in days: "new" = first seen within, "lapsed" = not seen within. */
export const SEGMENT_DAYS = { new: 30, lapsed: 60 } as const;
const EXPORT_MAX = 10_000;

export function segmentOf(r: {
  firstInteractionDate: Date | string;
  lastInteractionDate: Date | string;
  offersClaimedCount?: number;
  offersRedeemedCount?: number;
  totalVerifiedPurchases?: number;
}): 'new' | 'returning' | 'lapsed' | 'one-time' {
  const now = Date.now();
  const first = new Date(r.firstInteractionDate).getTime();
  const last = new Date(r.lastInteractionDate).getTime();
  if (now - last > SEGMENT_DAYS.lapsed * 86_400_000) return 'lapsed';
  if (now - first <= SEGMENT_DAYS.new * 86_400_000) return 'new';
  const repeat =
    (r.offersClaimedCount ?? 0) > 1 ||
    (r.offersRedeemedCount ?? 0) > 1 ||
    (r.totalVerifiedPurchases ?? 0) > 1;
  return repeat ? 'returning' : 'one-time';
}

const istDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '';

/** RFC 4180 quoting plus a guard against spreadsheet formula injection. */
function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
@Injectable()
export class BusinessCustomerService {
  private readonly logger = new Logger(BusinessCustomerService.name);

  constructor(private readonly db: DatabaseService) {}

  // ── Called from offer/bill/review services to track interaction ───────

  async trackInteraction(
    tenantId: string,
    userId: string,
    businessId: string,
    type: InteractionType,
    options?: { parentBusinessId?: string; branchBusinessId?: string; referralSource?: string },
  ): Promise<void> {
    const db = prismaAny(this.db);
    try {
      const existing = await db.businessCustomer.findFirst({
        where: { tenantId, userId, businessId, deletedAt: null },
      });

      const increment: any = {};
      if (type === 'OFFER_CLAIM') increment.offersClaimedCount = { increment: 1 };
      if (type === 'OFFER_REDEEM') increment.offersRedeemedCount = { increment: 1 };

      if (existing) {
        await db.businessCustomer.update({
          where: { id: existing.id },
          data: {
            lastInteractionDate: new Date(),
            customerStatus: 'ACTIVE',
            ...increment,
          },
        });
      } else {
        await db.businessCustomer.create({
          data: {
            tenantId,
            userId,
            businessId,
            parentBusinessId: options?.parentBusinessId ?? null,
            branchBusinessId: options?.branchBusinessId ?? null,
            referralSource: options?.referralSource ?? null,
            firstInteractionDate: new Date(),
            lastInteractionDate: new Date(),
            customerStatus: 'ACTIVE',
            offersClaimedCount: type === 'OFFER_CLAIM' ? 1 : 0,
            offersRedeemedCount: type === 'OFFER_REDEEM' ? 1 : 0,
            totalVerifiedPurchases: 0,
          },
        });
      }
    } catch (err: any) {
      // Non-fatal — never block the primary action
      this.logger.warn(`trackInteraction failed: ${err.message}`);
    }
  }

  // ── Business CRM: list customers with filters ─────────────────────────

  /**
   * Shared filter → where clause for the CRM list and its CSV export. Access is checked
   * by the controller (assertBusinessAccess), and customers' user rows live in their own
   * tenants, so neither side is tenant-scoped here.
   */
  private buildWhere(businessId: string, filter?: string, search?: string) {
    const now = Date.now();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const daysAgo = (d: number) => new Date(now - d * 86_400_000);
    const repeat = [
      { offersClaimedCount: { gt: 1 } },
      { offersRedeemedCount: { gt: 1 } },
      { totalVerifiedPurchases: { gt: 1 } },
    ];
    const where: any = { businessId, deletedAt: null };

    switch (filter) {
      case 'claimed':
        where.offersClaimedCount = { gt: 0 };
        break;
      case 'redeemed':
        where.offersRedeemedCount = { gt: 0 };
        break;
      case 'active_month':
        where.lastInteractionDate = { gte: startOfMonth };
        break;
      case 'new_month':
        where.firstInteractionDate = { gte: startOfMonth };
        break;
      case 'repeat':
        where.OR = repeat;
        break;
      case 'high_engagement':
        where.OR = [
          { offersClaimedCount: { gte: 3 } },
          { offersRedeemedCount: { gte: 2 } },
          { totalVerifiedPurchases: { gte: 3 } },
        ];
        break;
      case 'branch':
        where.branchBusinessId = { not: null };
        break;
      case 'referral':
        where.referralSource = { not: null };
        break;
      // Lifecycle segments (see SEGMENT_DAYS).
      case 'new':
        where.firstInteractionDate = { gte: daysAgo(SEGMENT_DAYS.new) };
        break;
      case 'returning':
        where.firstInteractionDate = { lt: daysAgo(SEGMENT_DAYS.new) };
        where.lastInteractionDate = { gte: daysAgo(SEGMENT_DAYS.lapsed) };
        where.OR = repeat;
        break;
      case 'lapsed':
        where.lastInteractionDate = { lt: daysAgo(SEGMENT_DAYS.lapsed) };
        break;
    }

    const term = search?.trim();
    if (term) {
      where.user = {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
        ],
      };
    }
    return where;
  }

  private toRow(r: any) {
    return {
      id: r.id,
      userId: r.userId,
      name: r.user?.name ?? 'Unknown',
      email: r.user?.email ?? '',
      phone: r.user?.phone ?? '',
      avatar: r.user?.avatar ?? '',
      offersClaimedCount: r.offersClaimedCount,
      offersRedeemedCount: r.offersRedeemedCount,
      totalVerifiedPurchases: r.totalVerifiedPurchases,
      firstInteractionDate: r.firstInteractionDate,
      lastInteractionDate: r.lastInteractionDate,
      referralSource: r.referralSource,
      customerStatus: r.customerStatus,
      branchBusinessId: r.branchBusinessId,
      segment: segmentOf(r),
    };
  }

  async listBusinessCustomers(
    _tenantId: string,
    businessId: string,
    opts: {
      filter?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const db = prismaAny(this.db);
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const where = this.buildWhere(businessId, opts.filter, opts.search);

    const [total, records] = await Promise.all([
      db.businessCustomer.count({ where }),
      db.businessCustomer.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        },
        orderBy: { lastInteractionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { customers: records.map((r: any) => this.toRow(r)), total, page, limit };
  }

  /** The whole filtered list as CSV (capped at EXPORT_MAX rows), for the owner's own records. */
  async exportCsv(businessId: string, filter?: string, search?: string) {
    const db = prismaAny(this.db);
    const records = await db.businessCustomer.findMany({
      where: this.buildWhere(businessId, filter, search),
      include: { user: { select: { name: true, email: true, phone: true } } },
      orderBy: { lastInteractionDate: 'desc' },
      take: EXPORT_MAX,
    });
    const header = [
      'Name',
      'Email',
      'Phone',
      'Segment',
      'Offers claimed',
      'Offers redeemed',
      'Verified bills',
      'First seen',
      'Last seen',
      'Referral source',
    ];
    const lines = records.map((r: any) => {
      const row = this.toRow(r);
      return [
        row.name,
        row.email,
        row.phone,
        row.segment,
        row.offersClaimedCount,
        row.offersRedeemedCount,
        row.totalVerifiedPurchases,
        istDate(row.firstInteractionDate),
        istDate(row.lastInteractionDate),
        row.referralSource ?? '',
      ]
        .map(csvCell)
        .join(',');
    });
    // BOM so Excel opens UTF-8 (Malayalam names) correctly.
    return '﻿' + [header.join(','), ...lines].join('\r\n');
  }

  // ── Business CRM: analytics summary ──────────────────────────────────

  async getCustomerStats(_tenantId: string, businessId: string) {
    const db = prismaAny(this.db);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      total,
      newThisMonth,
      newLastMonth,
      activeThisMonth,
      claimed,
      redeemed,
      repeat,
      segNew,
      segReturning,
      segLapsed,
    ] = await Promise.all([
      db.businessCustomer.count({ where: { businessId, deletedAt: null } }),
      db.businessCustomer.count({
        where: { businessId, deletedAt: null, firstInteractionDate: { gte: startOfMonth } },
      }),
      db.businessCustomer.count({
        where: {
          businessId,
          deletedAt: null,
          firstInteractionDate: { gte: lastMonth, lt: startOfMonth },
        },
      }),
      db.businessCustomer.count({
        where: { businessId, deletedAt: null, lastInteractionDate: { gte: startOfMonth } },
      }),
      db.businessCustomer.count({
        where: { businessId, deletedAt: null, offersClaimedCount: { gt: 0 } },
      }),
      db.businessCustomer.count({
        where: { businessId, deletedAt: null, offersRedeemedCount: { gt: 0 } },
      }),
      db.businessCustomer.count({
        where: {
          businessId,
          deletedAt: null,
          OR: [
            { offersClaimedCount: { gt: 1 } },
            { offersRedeemedCount: { gt: 1 } },
            { totalVerifiedPurchases: { gt: 1 } },
          ],
        },
      }),
      db.businessCustomer.count({ where: this.buildWhere(businessId, 'new') }),
      db.businessCustomer.count({ where: this.buildWhere(businessId, 'returning') }),
      db.businessCustomer.count({ where: this.buildWhere(businessId, 'lapsed') }),
    ]);

    const monthlyGrowth =
      newLastMonth > 0
        ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
        : newThisMonth > 0
          ? 100
          : 0;

    const claimRate = total > 0 ? Math.round((claimed / total) * 100) : 0;
    const redemptionRate = claimed > 0 ? Math.round((redeemed / claimed) * 100) : 0;
    const retentionRate = total > 0 ? Math.round((repeat / total) * 100) : 0;
    const conversionRate = total > 0 ? Math.round((redeemed / total) * 100) : 0;

    return {
      totalCustomers: total,
      newThisMonth,
      activeThisMonth,
      returningCustomers: repeat,
      conversionRate,
      offerClaimRate: claimRate,
      offerRedemptionRate: redemptionRate,
      monthlyGrowth,
      customerRetention: retentionRate,
      segments: {
        new: segNew,
        returning: segReturning,
        lapsed: segLapsed,
        newDays: SEGMENT_DAYS.new,
        lapsedDays: SEGMENT_DAYS.lapsed,
      },
    };
  }
}
