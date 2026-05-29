import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

// Cast helper — bypasses stale Prisma client types after schema migration.
function prismaAny(db: DatabaseService): any {
  return db;
}

type InteractionType = 'OFFER_CLAIM' | 'OFFER_REDEEM' | 'BILL_UPLOAD' | 'REVIEW' | 'CAMPAIGN';

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
      if (type === 'BILL_UPLOAD') increment.totalVerifiedPurchases = { increment: 1 };

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
            totalVerifiedPurchases: type === 'BILL_UPLOAD' ? 1 : 0,
          },
        });
      }
    } catch (err: any) {
      // Non-fatal — never block the primary action
      this.logger.warn(`trackInteraction failed: ${err.message}`);
    }
  }

  // ── Business CRM: list customers with filters ─────────────────────────

  async listBusinessCustomers(
    tenantId: string,
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
    const skip = (page - 1) * limit;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Base where clause
    const baseWhere: any = { tenantId, businessId, deletedAt: null };

    // Apply filter
    switch (opts.filter) {
      case 'claimed':
        baseWhere.offersClaimedCount = { gt: 0 };
        break;
      case 'redeemed':
        baseWhere.offersRedeemedCount = { gt: 0 };
        break;
      case 'active_month':
        baseWhere.lastInteractionDate = { gte: startOfMonth };
        break;
      case 'new_month':
        baseWhere.firstInteractionDate = { gte: startOfMonth };
        break;
      case 'repeat':
        baseWhere.OR = [
          { offersClaimedCount: { gt: 1 } },
          { offersRedeemedCount: { gt: 1 } },
          { totalVerifiedPurchases: { gt: 1 } },
        ];
        break;
      case 'high_engagement':
        baseWhere.OR = [
          { offersClaimedCount: { gte: 3 } },
          { offersRedeemedCount: { gte: 2 } },
          { totalVerifiedPurchases: { gte: 3 } },
        ];
        break;
      case 'branch':
        baseWhere.branchBusinessId = { not: null };
        break;
      case 'referral':
        baseWhere.referralSource = { not: null };
        break;
    }

    // Apply search on joined user data — do a two-pass approach
    let userFilter: any = undefined;
    if (opts.search) {
      const term = opts.search.toLowerCase();
      const matchingUsers = await db.user.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      const userIds = matchingUsers.map((u: any) => u.id);
      if (userIds.length === 0) {
        return { customers: [], total: 0, page, limit };
      }
      baseWhere.userId = { in: userIds };
    }

    const [total, records] = await Promise.all([
      db.businessCustomer.count({ where: baseWhere }),
      db.businessCustomer.findMany({
        where: baseWhere,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, avatar: true },
          },
        },
        orderBy: { lastInteractionDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const customers = records.map((r: any) => ({
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
    }));

    return { customers, total, page, limit };
  }

  // ── Business CRM: analytics summary ──────────────────────────────────

  async getCustomerStats(tenantId: string, businessId: string) {
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
    ] = await Promise.all([
      db.businessCustomer.count({ where: { tenantId, businessId, deletedAt: null } }),
      db.businessCustomer.count({
        where: { tenantId, businessId, deletedAt: null, firstInteractionDate: { gte: startOfMonth } },
      }),
      db.businessCustomer.count({
        where: {
          tenantId, businessId, deletedAt: null,
          firstInteractionDate: { gte: lastMonth, lt: startOfMonth },
        },
      }),
      db.businessCustomer.count({
        where: { tenantId, businessId, deletedAt: null, lastInteractionDate: { gte: startOfMonth } },
      }),
      db.businessCustomer.count({
        where: { tenantId, businessId, deletedAt: null, offersClaimedCount: { gt: 0 } },
      }),
      db.businessCustomer.count({
        where: { tenantId, businessId, deletedAt: null, offersRedeemedCount: { gt: 0 } },
      }),
      db.businessCustomer.count({
        where: {
          tenantId, businessId, deletedAt: null,
          OR: [
            { offersClaimedCount: { gt: 1 } },
            { offersRedeemedCount: { gt: 1 } },
            { totalVerifiedPurchases: { gt: 1 } },
          ],
        },
      }),
    ]);

    const monthlyGrowth = newLastMonth > 0
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : newThisMonth > 0 ? 100 : 0;

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
    };
  }
}
