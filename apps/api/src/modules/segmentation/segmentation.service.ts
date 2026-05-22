import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export enum UserSegmentType {
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  HIGH_VALUE = 'HIGH_VALUE',
}

export enum BusinessSegmentType {
  HIGH_ENGAGEMENT = 'HIGH_ENGAGEMENT',
  GROWING = 'GROWING',
  INACTIVE = 'INACTIVE',
}

@Injectable()
export class SegmentationService {
  private readonly logger = new Logger(SegmentationService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Identifies users who have logged in or generated activity in the last 14 days
   */
  async getActiveUsers(tenantId: string, days = 14) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    // Get user IDs with recent device login session
    const recentLogins = await this.db.deviceLogin.findMany({
      where: {
        tenantId,
        lastLoginAt: { gte: thresholdDate },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const userIds = recentLogins.map((login) => login.userId);

    return this.db.user.findMany({
      where: {
        id: { in: userIds },
        tenantId,
        deletedAt: null,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  /**
   * Identifies users who have not logged in or done any activity in the last 30 days
   */
  async getDormantUsers(tenantId: string, days = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    // Users whose latest device logins are older than threshold, or who never logged in
    const activeUsers = await this.db.deviceLogin.findMany({
      where: {
        tenantId,
        lastLoginAt: { gte: thresholdDate },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const activeUserIds = activeUsers.map((login) => login.userId);

    return this.db.user.findMany({
      where: {
        id: { notIn: activeUserIds },
        tenantId,
        deletedAt: null,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  /**
   * Identifies customers with high bill values or high verified purchases count
   */
  async getHighValueCustomers(tenantId: string, minBillAmount = 1000) {
    // Find users with verified purchases that aggregate above minBillAmount
    const verifiedPurchases = await this.db.verifiedPurchase.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      having: {
        userId: {
          _count: {
            gt: 0,
          },
        },
      },
    });

    // Filter those exceeding the high value criteria
    const highValueUserIds = verifiedPurchases
      .filter((vp) => (vp._sum.amount?.toNumber() || 0) >= minBillAmount)
      .map((vp) => vp.userId);

    return this.db.user.findMany({
      where: {
        id: { in: highValueUserIds },
        tenantId,
        deletedAt: null,
      },
      select: { id: true, name: true, email: true },
    });
  }

  /**
   * Identifies businesses with top-tier click-to-view ratios or positive reviews count
   */
  async getHighEngagementBusinesses(tenantId: string, limit = 20) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 30); // Look at last 30 days

    // Sum view and click counts from precomputed business metrics
    const metrics = await this.db.businessMetric.groupBy({
      by: ['businessId'],
      where: {
        tenantId,
        date: { gte: thresholdDate },
      },
      _sum: {
        viewCount: true,
        clickCount: true,
        reviewCount: true,
      },
    });

    // Score based on (clicks * 2) + views + (reviews * 10)
    const scored = metrics.map((m) => {
      const views = m._sum.viewCount || 0;
      const clicks = m._sum.clickCount || 0;
      const reviews = m._sum.reviewCount || 0;
      const score = clicks * 2 + views + reviews * 10;
      return { businessId: m.businessId, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topBusinessIds = scored.slice(0, limit).map((s) => s.businessId);

    return this.db.business.findMany({
      where: {
        id: { in: topBusinessIds },
        tenantId,
        deletedAt: null,
      },
      include: {
        category: { select: { name: true } },
      },
    });
  }
}
