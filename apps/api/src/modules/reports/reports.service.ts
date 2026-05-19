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
    return this.db.report.create({
      data: {
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
      this.db.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reporter: { select: { id: true, name: true, email: true } } },
      }),
      this.db.report.count({ where }),
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
    return this.db.report.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedBy, resolution, resolvedAt: new Date() },
    });
  }

  async dismiss(id: string, resolvedBy: string): Promise<any> {
    return this.db.report.update({
      where: { id },
      data: { status: 'DISMISSED', resolvedBy, resolvedAt: new Date() },
    });
  }
}
