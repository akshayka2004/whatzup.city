import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    reporterId: string,
    data: {
      targetType: string;
      targetId: string;
      type: string;
      description: string;
      evidence?: string[];
    },
  ): Promise<any> {
    const reporter = await this.db.user.findUnique({
      where: { id: reporterId },
      select: { tenantId: true },
    });
    const tenantId = reporter?.tenantId || 'default';
    return this.db.moderationReport.create({
      data: {
        tenantId,
        reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        type: data.type,
        description: data.description,
        evidence: data.evidence || [],
      },
    });
  }

  async findAll(page = 1, limit = 20, status?: string): Promise<any> {
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.db.moderationReport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reporter: { select: { id: true, name: true, email: true } } },
      }),
      this.db.moderationReport.count({ where }),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async resolve(id: string, resolvedBy: string, resolution: string): Promise<any> {
    return this.db.moderationReport.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedBy, resolution, resolvedAt: new Date() },
    });
  }

  async dismiss(id: string, resolvedBy: string): Promise<any> {
    return this.db.moderationReport.update({
      where: { id },
      data: { status: 'DISMISSED', resolvedBy, resolvedAt: new Date() },
    });
  }

  /**
   * Export Business KPIs across the tenant as a CSV string
   */
  async exportBusinessKPIReport(tenantId: string, days = 30): Promise<string> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const metrics = await this.db.businessMetric.groupBy({
      by: ['businessId'],
      where: {
        tenantId,
        date: { gte: thresholdDate },
      },
      _sum: {
        viewCount: true,
        clickCount: true,
        redemptionCount: true,
        reviewCount: true,
      },
    });

    // Fetch business names
    const businesses = await this.db.business.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true },
    });

    const bizNameMap = new Map(businesses.map((b) => [b.id, b.name]));

    const csvRows = ['Business ID,Business Name,Views,Clicks,Redemptions,Reviews'];

    for (const item of metrics) {
      const name = bizNameMap.get(item.businessId) || 'Unknown Business';
      const escapedName = name.replace(/"/g, '""');
      csvRows.push(
        `"${item.businessId}","${escapedName}",${item._sum.viewCount || 0},${item._sum.clickCount || 0},${item._sum.redemptionCount || 0},${item._sum.reviewCount || 0}`,
      );
    }

    return csvRows.join('\n');
  }

  /**
   * Export open and resolved fraud auditing entries as a CSV string
   */
  async exportFraudReport(tenantId: string, days = 30): Promise<string> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const flags = await this.db.fraudFlag.findMany({
      where: {
        tenantId,
        createdAt: { gte: thresholdDate },
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        severity: true,
        status: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvRows = ['Flag ID,Target Type,Target ID,Severity,Status,Reason,Created At'];

    for (const flag of flags) {
      const escapedReason = flag.reason.replace(/"/g, '""').replace(/\n/g, ' ');
      csvRows.push(
        `"${flag.id}","${flag.targetType}","${flag.targetId}","${flag.severity}","${flag.status}","${escapedReason}","${flag.createdAt.toISOString()}"`,
      );
    }

    return csvRows.join('\n');
  }
}
