import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getMetrics(tenantId: string, businessId: string) {
    const [views, clicks, reviews, redemptions] = await Promise.all([
      this.db.analyticsEvent.count({
        where: { tenantId, businessId, event: 'PAGE_VIEW' },
      }),
      this.db.analyticsEvent.count({
        where: { tenantId, businessId, event: 'CLICK_LINK' },
      }),
      this.db.review.count({
        where: { tenantId, businessId, deletedAt: null },
      }),
      this.db.offerRedemption.count({
        where: { tenantId, offer: { businessId } },
      }),
    ]);

    return {
      views,
      clicks,
      reviews,
      redemptions,
    };
  }

  async getProfileCompleteness(tenantId: string, businessId: string) {
    const business = await this.db.business.findUnique({
      where: { id: businessId },
      include: {
        branches: true,
        media: true,
      },
    });

    if (!business) {
      return { score: 0, missing: [] };
    }

    let score = 0;
    const missing = [];
    const totalFields = 8; // Adjust based on required profile elements

    if (business.name) score += 1;
    else missing.push('name');
    if (business.description) score += 1;
    else missing.push('description');
    if (business.logo) score += 1;
    else missing.push('logo');
    if (business.coverImage) score += 1;
    else missing.push('coverImage');
    if (business.phone || business.email) score += 1;
    else missing.push('contact_info');
    if (business.operatingHours) score += 1;
    else missing.push('operating_hours');
    if (business.branches && business.branches.length > 0) score += 1;
    else missing.push('branches');
    if (business.media && business.media.length > 0) score += 1;
    else missing.push('media');

    return {
      score: Math.round((score / totalFields) * 100),
      missing,
    };
  }
}
