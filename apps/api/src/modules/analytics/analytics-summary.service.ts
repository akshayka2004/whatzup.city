import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

/**
 * AnalyticsSummaryService — Section 26 aggregation layer.
 *
 * Maintains pre-aggregated summary rows so dashboards never run
 * COUNT(*)/SUM queries over transactional tables at request time.
 *
 * All public methods are fire-and-forget safe: they catch their own
 * errors and log them so callers don't need try/catch.
 */
@Injectable()
export class AnalyticsSummaryService {
  private readonly logger = new Logger(AnalyticsSummaryService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // USER SPENDING SUMMARY
  // Triggered after: bill verified, bill deleted/adjusted, offer redeemed
  // ──────────────────────────────────────────────────────────────────────────

  async refreshUserSpending(tenantId: string, userId: string): Promise<void> {
    try {
      const now = new Date();
      const d30  = new Date(now.getTime() -  30 * 86400_000);
      const d90  = new Date(now.getTime() -  90 * 86400_000);
      const d365 = new Date(now.getTime() - 365 * 86400_000);

      const [totalAgg, agg30, agg90, agg365, billCount, crmStats] = await Promise.all([
        this.db.bill.aggregate({
          where: { userId, tenantId, status: 'VERIFIED', deletedAt: null },
          _sum: { amount: true },
        }),
        this.db.bill.aggregate({
          where: { userId, tenantId, status: 'VERIFIED', deletedAt: null, verifiedAt: { gte: d30 } },
          _sum: { amount: true },
        }),
        this.db.bill.aggregate({
          where: { userId, tenantId, status: 'VERIFIED', deletedAt: null, verifiedAt: { gte: d90 } },
          _sum: { amount: true },
        }),
        this.db.bill.aggregate({
          where: { userId, tenantId, status: 'VERIFIED', deletedAt: null, verifiedAt: { gte: d365 } },
          _sum: { amount: true },
        }),
        this.db.bill.count({ where: { userId, tenantId, status: 'VERIFIED', deletedAt: null } }),
        (this.db as any).businessCustomer
          .aggregate({
            where: { userId, tenantId, deletedAt: null },
            _sum: { offersClaimedCount: true, offersRedeemedCount: true },
          })
          .catch(() => ({ _sum: { offersClaimedCount: 0, offersRedeemedCount: 0 } })),
      ]);

      const totalSpend       = Number(totalAgg._sum?.amount ?? 0);
      const spendLast30Days  = Number(agg30._sum?.amount ?? 0);
      const spendLast90Days  = Number(agg90._sum?.amount ?? 0);
      const spendLast365Days = Number(agg365._sum?.amount ?? 0);
      const offersClaimedCount  = crmStats._sum?.offersClaimedCount  ?? 0;
      const offersRedeemedCount = crmStats._sum?.offersRedeemedCount ?? 0;

      // Engagement score: weighted, capped at 100
      const engagementScore = Math.min(
        100,
        billCount * 10 + offersClaimedCount * 5 + offersRedeemedCount * 15,
      );

      await (this.db as any).userSpendingSummary.upsert({
        where:  { userId },
        create: {
          userId, tenantId, totalSpend, spendLast30Days, spendLast90Days,
          spendLast365Days, verifiedBillCount: billCount,
          offersClaimedCount, offersRedeemedCount, engagementScore,
          lastActivityAt: now,
        },
        update: {
          totalSpend, spendLast30Days, spendLast90Days, spendLast365Days,
          verifiedBillCount: billCount, offersClaimedCount, offersRedeemedCount,
          engagementScore, lastActivityAt: now,
        },
      });

      await this.redis.del(`analytics:overview:${tenantId}`);
    } catch (err: any) {
      this.logger.error(`refreshUserSpending(${userId}) failed: ${err.message}`, err.stack);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUSINESS ANALYTICS SUMMARY
  // Triggered after: customer interaction, bill verified, offer redeemed/claimed
  // ──────────────────────────────────────────────────────────────────────────

  async refreshBusinessSummary(tenantId: string, businessId: string): Promise<void> {
    try {
      const db = this.db as any;

      const [crmStats, offerRedemptionCount, billAgg, branchCount] = await Promise.all([
        db.businessCustomer
          .aggregate({
            where: { businessId, tenantId, deletedAt: null },
            _count: { _all: true },
            _sum: { offersClaimedCount: true, offersRedeemedCount: true },
          })
          .catch(() => ({
            _count: { _all: 0 },
            _sum: { offersClaimedCount: 0, offersRedeemedCount: 0 },
          })),
        this.db.offerRedemption
          .count({ where: { tenantId, deletedAt: null, offer: { businessId } } })
          .catch(() => 0),
        this.db.bill
          .aggregate({
            where: { businessId, tenantId, status: 'VERIFIED', deletedAt: null },
            _count: { _all: true },
            _sum: { amount: true },
          })
          .catch(() => ({ _count: { _all: 0 }, _sum: { amount: 0 } })),
        this.db.businessBranch
          .count({ where: { businessId, tenantId, deletedAt: null } })
          .catch(() => 0),
      ]);

      const customerCount    = crmStats._count?._all ?? 0;
      const offerClaims      = crmStats._sum?.offersClaimedCount  ?? 0;
      const offerRedemptions = crmStats._sum?.offersRedeemedCount ?? 0;
      const conversionRate   = offerClaims > 0 ? offerRedemptions / offerClaims : 0;
      const verifiedBillCount = billAgg._count?._all ?? 0;
      const estimatedSpend   = Number(billAgg._sum?.amount ?? 0);

      await db.businessAnalyticsSummary.upsert({
        where:  { businessId },
        create: {
          businessId, tenantId, customerCount, offerClaims,
          offerRedemptions, conversionRate, verifiedBillCount, estimatedSpend,
          branchCount, lastActivityAt: new Date(),
        },
        update: {
          customerCount, offerClaims, offerRedemptions, conversionRate,
          verifiedBillCount, estimatedSpend, branchCount,
          lastActivityAt: new Date(),
        },
      });

      // Bust all analytics caches for this business
      await this.redis.del(`analytics:summary:${tenantId}:${businessId}:30`);
      await this.redis.del(`analytics:summary:${tenantId}:${businessId}:7`);
      await this.redis.del(`analytics:business:${tenantId}:${businessId}:30`);
      await this.redis.del(`analytics:overview:${tenantId}`);
    } catch (err: any) {
      this.logger.error(`refreshBusinessSummary(${businessId}) failed: ${err.message}`, err.stack);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BRANCH ANALYTICS SUMMARY
  // Triggered after: branch-level interactions (future)
  // ──────────────────────────────────────────────────────────────────────────

  async refreshBranchSummary(tenantId: string, branchId: string): Promise<void> {
    try {
      const db = this.db as any;

      const [crmStats, billAgg] = await Promise.all([
        db.businessCustomer
          .aggregate({
            where: { branchBusinessId: branchId, tenantId, deletedAt: null },
            _count: { _all: true },
            _sum: { offersClaimedCount: true, offersRedeemedCount: true },
          })
          .catch(() => ({
            _count: { _all: 0 },
            _sum: { offersClaimedCount: 0, offersRedeemedCount: 0 },
          })),
        this.db.bill
          .aggregate({
            where: { businessId: branchId, tenantId, status: 'VERIFIED', deletedAt: null },
            _count: { _all: true },
            _sum: { amount: true },
          })
          .catch(() => ({ _count: { _all: 0 }, _sum: { amount: 0 } })),
      ]);

      await db.branchAnalyticsSummary.upsert({
        where:  { branchId },
        create: {
          branchId, tenantId,
          customerCount:    crmStats._count?._all ?? 0,
          offerClaims:      crmStats._sum?.offersClaimedCount  ?? 0,
          offerRedemptions: crmStats._sum?.offersRedeemedCount ?? 0,
          verifiedBillCount: billAgg._count?._all ?? 0,
          estimatedSpend:    Number(billAgg._sum?.amount ?? 0),
          lastActivityAt:    new Date(),
        },
        update: {
          customerCount:    crmStats._count?._all ?? 0,
          offerClaims:      crmStats._sum?.offersClaimedCount  ?? 0,
          offerRedemptions: crmStats._sum?.offersRedeemedCount ?? 0,
          verifiedBillCount: billAgg._count?._all ?? 0,
          estimatedSpend:    Number(billAgg._sum?.amount ?? 0),
          lastActivityAt:    new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`refreshBranchSummary(${branchId}) failed: ${err.message}`, err.stack);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REFERRAL ANALYTICS SUMMARY
  // Triggered after: referral code used, registration approved, invalidated
  // ──────────────────────────────────────────────────────────────────────────

  async refreshReferralSummary(
    entityId: string,
    entityType: string,
    referralCode: string,
  ): Promise<void> {
    try {
      const [total, successful] = await Promise.all([
        this.db.user.count({ where: { referredBy: entityId, deletedAt: null } }),
        this.db.user.count({ where: { referredBy: entityId, isActive: true, deletedAt: null } }),
      ]);

      const conversionRate = total > 0 ? successful / total : 0;

      await (this.db as any).referralAnalyticsSummary.upsert({
        where:  { entityId },
        create: {
          entityId, entityType, referralCode,
          totalReferrals: total, successfulReferrals: successful,
          activeReferrals: successful, referralConversionRate: conversionRate,
          lastReferralAt: total > 0 ? new Date() : null,
        },
        update: {
          referralCode, totalReferrals: total, successfulReferrals: successful,
          activeReferrals: successful, referralConversionRate: conversionRate,
          lastReferralAt: total > 0 ? new Date() : null,
        },
      });
    } catch (err: any) {
      this.logger.error(`refreshReferralSummary(${entityId}) failed: ${err.message}`, err.stack);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ HELPERS — Used by AnalyticsService and controllers
  // ──────────────────────────────────────────────────────────────────────────

  /** Top N spenders for the super-admin leaderboard */
  async getTopSpenders(tenantId: string, limit = 10): Promise<any[]> {
    const cacheKey = `analytics:top-spenders:${tenantId}:${limit}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const rows = await (this.db as any).userSpendingSummary.findMany({
      where:   { tenantId },
      orderBy: { totalSpend: 'desc' },
      take:    limit,
      select: {
        userId: true, totalSpend: true, spendLast30Days: true,
        verifiedBillCount: true, offersRedeemedCount: true,
        engagementScore: true, primarySpendCategory: true, lastActivityAt: true,
      },
    });

    // Join with user name (small N — safe)
    const userIds: string[] = rows.map((r: any) => r.userId);
    const users = await this.db.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const result = rows.map((r: any) => ({
      ...r,
      user: userMap.get(r.userId) ?? null,
    }));

    await this.redis.set(cacheKey, result, 300);
    return result;
  }

  /** Top N referrers for the super-admin leaderboard */
  async getTopReferrers(entityType?: string, limit = 10): Promise<any[]> {
    const cacheKey = `analytics:top-referrers:${entityType ?? 'all'}:${limit}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await (this.db as any).referralAnalyticsSummary.findMany({
      where:   entityType ? { entityType } : undefined,
      orderBy: { successfulReferrals: 'desc' },
      take:    limit,
    });

    await this.redis.set(cacheKey, result, 300);
    return result;
  }

  /** Business summary from pre-aggregated table (read-through) */
  async getBusinessSummaryFromTable(businessId: string): Promise<any | null> {
    return (this.db as any).businessAnalyticsSummary.findUnique({
      where: { businessId },
    });
  }
}
