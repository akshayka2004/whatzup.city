import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class BillsService {
  constructor(private readonly db: DatabaseService) {}

  async upload(
    userId: string,
    data: {
      businessId: string;
      amount: number;
      billDate: string;
      billImage: string;
      description?: string;
    },
  ) {
    return this.db.bill.create({
      data: {
        userId,
        businessId: data.businessId,
        amount: data.amount,
        billDate: new Date(data.billDate),
        billImage: data.billImage,
        description: data.description,
      },
    });
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.db.bill.findMany({
        where: { userId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { business: { select: { id: true, name: true, logo: true } } },
      }),
      this.db.bill.count({ where: { userId, deletedAt: null } }),
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

  async findPendingVerification(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.db.bill.findMany({
        where: { status: 'UPLOADED', deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
        },
      }),
      this.db.bill.count({ where: { status: 'UPLOADED', deletedAt: null } }),
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

  async verify(id: string, verifiedBy: string) {
    return this.db.bill.update({
      where: { id },
      data: { status: 'VERIFIED', verifiedAt: new Date(), verifiedBy },
    });
  }

  async reject(id: string, verifiedBy: string, reason: string) {
    return this.db.bill.update({
      where: { id },
      data: { status: 'REJECTED', verifiedBy, rejectionReason: reason },
    });
  }
}
