import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../../common/database/database.service';

/**
 * Spend-gated vouchers. A business publishes a Voucher with a spend threshold;
 * a customer whose cumulative VERIFIED spend at that business reaches the
 * threshold unlocks a unique VoucherClaim code, then shows it in-store where
 * staff mark it redeemed. Codes are never returned before the customer qualifies.
 *
 * Tenancy: voucher + claim + verified-purchase data all live in the business's
 * tenant. Customer-facing reads resolve by the globally-unique businessId, so a
 * customer in another tenant still sees/unlocks correctly.
 */
@Injectable()
export class VouchersService {
  constructor(private readonly db: DatabaseService) {}

  // ── helpers ──────────────────────────────────────────────────────────────

  /** Resolve a business by id OR entityId, returning its real id + tenantId. */
  private async resolveBusiness(idOrEntityId: string) {
    const business = await this.db.business.findFirst({
      where: { OR: [{ id: idOrEntityId }, { entityId: idOrEntityId }] },
      select: { id: true, tenantId: true, ownerId: true, name: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  /** Cumulative verified spend (₹) for a user at a business. */
  private async verifiedSpend(userId: string, businessId: string): Promise<number> {
    const agg = await this.db.verifiedPurchase.aggregate({
      where: { userId, businessId, deletedAt: null },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  private async generateUniqueCode(tenantId: string): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const code = 'VCH-' + randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      const exists = await this.db.voucherClaim.findFirst({
        where: { tenantId, code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    // Extremely unlikely; fall back to a longer code.
    return 'VCH-' + randomBytes(6).toString('hex').toUpperCase();
  }

  // ── OWNER: CRUD ──────────────────────────────────────────────────────────

  async create(userId: string, businessIdOrEntity: string, dto: any) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    if (Number(dto.thresholdAmount) <= 0) {
      throw new BadRequestException('thresholdAmount must be greater than 0');
    }
    return this.db.voucher.create({
      data: {
        tenantId: business.tenantId,
        businessId: business.id,
        title: dto.title,
        description: dto.description ?? null,
        thresholdAmount: dto.thresholdAmount,
        rewardType: dto.rewardType ?? 'AMOUNT',
        rewardValue: dto.rewardValue ?? null,
        rewardLabel: dto.rewardLabel ?? null,
        status: dto.status ?? 'ACTIVE',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: new Date(dto.endDate),
        maxRedemptions: dto.maxRedemptions ?? null,
        terms: dto.terms ?? null,
        targetCities: dto.targetCities ?? [],
        createdBy: userId,
      },
    });
  }

  async listForBusiness(userId: string, businessIdOrEntity: string) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    const vouchers = await this.db.voucher.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    // Attach claim counts for the owner overview.
    const withCounts = await Promise.all(
      vouchers.map(async (v) => {
        const [unlocked, redeemed] = await Promise.all([
          this.db.voucherClaim.count({ where: { voucherId: v.id, deletedAt: null } }),
          this.db.voucherClaim.count({ where: { voucherId: v.id, status: 'REDEEMED', deletedAt: null } }),
        ]);
        return { ...v, unlockedCount: unlocked, redeemedCount: redeemed };
      }),
    );
    return withCounts;
  }

  private async ownedVoucher(userId: string, voucherId: string) {
    const voucher = await this.db.voucher.findFirst({ where: { id: voucherId, deletedAt: null } });
    if (!voucher) throw new NotFoundException('Voucher not found');
    const business = await this.db.business.findFirst({
      where: { id: voucher.businessId },
      select: { ownerId: true },
    });
    if (!business || business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    return voucher;
  }

  async update(userId: string, voucherId: string, dto: any) {
    await this.ownedVoucher(userId, voucherId);
    const data: any = {};
    for (const k of ['title', 'description', 'rewardType', 'rewardValue', 'rewardLabel', 'status', 'terms', 'maxRedemptions', 'targetCities']) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.thresholdAmount !== undefined) data.thresholdAmount = dto.thresholdAmount;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    data.updatedBy = userId;
    return this.db.voucher.update({ where: { id: voucherId }, data });
  }

  async remove(userId: string, voucherId: string) {
    await this.ownedVoucher(userId, voucherId);
    await this.db.voucher.update({ where: { id: voucherId }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async listClaims(userId: string, voucherId: string) {
    await this.ownedVoucher(userId, voucherId);
    // tenant-scope-ok: ownership asserted by ownedVoucher() immediately above
    return this.db.voucherClaim.findMany({
      where: { voucherId, deletedAt: null },
      orderBy: { unlockedAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  // ── OWNER / STAFF: redeem a customer's code in-store ─────────────────────

  async redeem(userId: string, businessIdOrEntity: string, code: string) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    const normalized = (code || '').trim().toUpperCase();
    const claim = await this.db.voucherClaim.findFirst({
      where: { businessId: business.id, code: normalized, deletedAt: null },
      include: { voucher: true, user: { select: { id: true, name: true } } },
    });
    if (!claim) throw new NotFoundException('Voucher code not found for this business');
    if (claim.status === 'REDEEMED') {
      throw new BadRequestException('This voucher has already been redeemed');
    }
    const voucher = claim.voucher;
    if (voucher.maxRedemptions != null && voucher.currentRedemptions >= voucher.maxRedemptions) {
      throw new BadRequestException('Voucher redemption limit reached');
    }
    const updated = await this.db.voucherClaim.update({
      where: { id: claim.id },
      data: { status: 'REDEEMED', redeemedAt: new Date(), redeemedBy: userId },
    });
    await this.db.voucher.update({
      where: { id: voucher.id },
      data: { currentRedemptions: { increment: 1 } },
    });
    return {
      success: true,
      customer: claim.user?.name ?? 'Customer',
      voucherTitle: voucher.title,
      reward: voucher.rewardLabel,
      claim: updated,
    };
  }

  // ── CUSTOMER: browse + unlock ────────────────────────────────────────────

  /**
   * Active vouchers for a business with the viewer's unlock state + spend
   * progress. Code is included ONLY when the viewer has already unlocked it.
   */
  async available(businessIdOrEntity: string, userId?: string) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    const now = new Date();
    const vouchers = await this.db.voucher.findMany({
      where: {
        businessId: business.id,
        deletedAt: null,
        status: 'ACTIVE',
        endDate: { gte: now },
      },
      orderBy: { thresholdAmount: 'asc' },
    });

    const spend = userId ? await this.verifiedSpend(userId, business.id) : 0;
    const claims = userId
      ? await this.db.voucherClaim.findMany({
          where: { userId, businessId: business.id, deletedAt: null },
        })
      : [];
    const claimByVoucher = new Map(claims.map((c) => [c.voucherId, c]));

    return {
      spend,
      businessName: business.name,
      vouchers: vouchers.map((v) => {
        const claim = claimByVoucher.get(v.id);
        const threshold = Number(v.thresholdAmount);
        const qualified = spend >= threshold;
        const remaining = Math.max(0, threshold - spend);
        return {
          id: v.id,
          title: v.title,
          description: v.description,
          thresholdAmount: threshold,
          rewardType: v.rewardType,
          rewardValue: v.rewardValue != null ? Number(v.rewardValue) : null,
          rewardLabel: v.rewardLabel,
          endDate: v.endDate,
          terms: v.terms,
          progress: threshold > 0 ? Math.min(1, spend / threshold) : 1,
          remainingToUnlock: remaining,
          qualified,
          unlocked: !!claim,
          // Code ONLY once unlocked.
          code: claim ? claim.code : null,
          status: claim ? claim.status : null,
          redeemedAt: claim?.redeemedAt ?? null,
        };
      }),
    };
  }

  /** Unlock a voucher for the current customer if they qualify. Idempotent. */
  async unlock(userId: string, voucherId: string) {
    const voucher = await this.db.voucher.findFirst({ where: { id: voucherId, deletedAt: null } });
    if (!voucher) throw new NotFoundException('Voucher not found');
    if (voucher.status !== 'ACTIVE' || voucher.endDate < new Date()) {
      throw new BadRequestException('This voucher is no longer available');
    }

    // Already unlocked → return existing code (idempotent).
    const existing = await this.db.voucherClaim.findFirst({
      where: { voucherId, userId, deletedAt: null },
    });
    if (existing) return { code: existing.code, status: existing.status, alreadyUnlocked: true };

    const spend = await this.verifiedSpend(userId, voucher.businessId);
    if (spend < Number(voucher.thresholdAmount)) {
      throw new BadRequestException(
        `Spend ₹${(Number(voucher.thresholdAmount) - spend).toLocaleString('en-IN')} more to unlock this voucher`,
      );
    }
    if (voucher.maxRedemptions != null && voucher.currentRedemptions >= voucher.maxRedemptions) {
      throw new BadRequestException('This voucher is fully claimed');
    }

    const code = await this.generateUniqueCode(voucher.tenantId);
    try {
      const claim = await this.db.voucherClaim.create({
        data: {
          tenantId: voucher.tenantId,
          voucherId: voucher.id,
          userId,
          businessId: voucher.businessId,
          code,
          spendAtUnlock: spend,
        },
      });
      return { code: claim.code, status: claim.status, alreadyUnlocked: false };
    } catch {
      // Unique race: another request unlocked first — return that one.
      const race = await this.db.voucherClaim.findFirst({ where: { voucherId, userId } });
      if (race) return { code: race.code, status: race.status, alreadyUnlocked: true };
      throw new BadRequestException('Could not unlock voucher, please retry');
    }
  }

  /** Customer wallet: all vouchers they have unlocked, across businesses. */
  async myVouchers(userId: string) {
    return this.db.voucherClaim.findMany({
      where: { userId, deletedAt: null },
      orderBy: { unlockedAt: 'desc' },
      include: {
        voucher: { select: { title: true, rewardLabel: true, rewardType: true, rewardValue: true, endDate: true } },
        business: { select: { id: true, name: true, city: true } },
      },
    });
  }
}
