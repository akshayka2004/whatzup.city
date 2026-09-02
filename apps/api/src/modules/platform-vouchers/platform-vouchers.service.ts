import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../../common/database/database.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';

/**
 * Global (cross-business) points + reward tiers. A user earns 1 point per ₹1
 * of verified bill spend, platform-wide (PointsEntry, one row per bill —
 * awarded alongside VerifiedPurchase in BillVerificationsService). Super-admin
 * defines PlatformVoucher tiers; a customer whose lifetime points reach the
 * threshold unlocks a unique code, redeemable by ANY business's staff (unlike
 * the per-business Voucher flow, redemption here isn't ownership-scoped).
 */
@Injectable()
export class PlatformVouchersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  private async pointsBalance(userId: string): Promise<number> {
    const agg = await this.db.pointsEntry.aggregate({
      where: { userId, deletedAt: null },
      _sum: { points: true },
    });
    return Number(agg._sum.points ?? 0);
  }

  private async generateUniqueCode(tenantId: string): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const code = 'PTS-' + randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      const exists = await this.db.platformVoucherClaim.findFirst({
        where: { tenantId, code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    return 'PTS-' + randomBytes(6).toString('hex').toUpperCase();
  }

  // ── SUPER-ADMIN: CRUD ───────────────────────────────────────────────────

  async create(adminId: string, tenantId: string, dto: any) {
    const resolvedTenant = await this.tenantResolver.resolveTenantId(tenantId);
    if (Number(dto.thresholdPoints) <= 0) {
      throw new BadRequestException('thresholdPoints must be greater than 0');
    }
    return this.db.platformVoucher.create({
      data: {
        tenantId: resolvedTenant,
        title: dto.title,
        description: dto.description ?? null,
        thresholdPoints: dto.thresholdPoints,
        rewardType: dto.rewardType ?? 'AMOUNT',
        rewardValue: dto.rewardValue ?? null,
        rewardLabel: dto.rewardLabel ?? null,
        status: dto.status ?? 'ACTIVE',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: new Date(dto.endDate),
        maxRedemptions: dto.maxRedemptions ?? null,
        terms: dto.terms ?? null,
        createdBy: adminId,
      },
    });
  }

  async listForAdmin() {
    const tiers = await this.db.platformVoucher.findMany({
      where: { deletedAt: null },
      orderBy: { thresholdPoints: 'asc' },
    });
    return Promise.all(
      tiers.map(async (t) => {
        const [unlocked, redeemed] = await Promise.all([
          this.db.platformVoucherClaim.count({ where: { platformVoucherId: t.id, deletedAt: null } }),
          this.db.platformVoucherClaim.count({ where: { platformVoucherId: t.id, status: 'REDEEMED', deletedAt: null } }),
        ]);
        return { ...t, unlockedCount: unlocked, redeemedCount: redeemed };
      }),
    );
  }

  async update(id: string, adminId: string, dto: any) {
    const existing = await this.db.platformVoucher.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Platform voucher not found');
    const data: any = {};
    for (const k of ['title', 'description', 'rewardType', 'rewardValue', 'rewardLabel', 'status', 'terms', 'maxRedemptions']) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.thresholdPoints !== undefined) data.thresholdPoints = dto.thresholdPoints;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    data.updatedBy = adminId;
    return this.db.platformVoucher.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.db.platformVoucher.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Platform voucher not found');
    await this.db.platformVoucher.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  // ── BUSINESS STAFF: redeem a customer's code (not ownership-scoped) ─────

  async redeem(staffUserId: string, staffBusinessId: string | undefined, code: string) {
    const normalized = (code || '').trim().toUpperCase();
    const claim = await this.db.platformVoucherClaim.findFirst({
      where: { code: normalized, deletedAt: null },
      include: { platformVoucher: true, user: { select: { id: true, name: true } } },
    });
    if (!claim) throw new NotFoundException('Voucher code not found');
    if (claim.status === 'REDEEMED') {
      throw new BadRequestException('This voucher has already been redeemed');
    }
    const tier = claim.platformVoucher;
    if (tier.maxRedemptions != null && tier.currentRedemptions >= tier.maxRedemptions) {
      throw new BadRequestException('Voucher redemption limit reached');
    }
    const updated = await this.db.platformVoucherClaim.update({
      where: { id: claim.id },
      data: {
        status: 'REDEEMED',
        redeemedAt: new Date(),
        redeemedBy: staffUserId,
        redeemedByBusinessId: staffBusinessId ?? null,
      },
    });
    await this.db.platformVoucher.update({
      where: { id: tier.id },
      data: { currentRedemptions: { increment: 1 } },
    });
    return {
      success: true,
      customer: claim.user?.name ?? 'Customer',
      voucherTitle: tier.title,
      reward: tier.rewardLabel,
      claim: updated,
    };
  }

  // ── CUSTOMER: browse + unlock ────────────────────────────────────────────

  async available(userId?: string) {
    const now = new Date();
    const tiers = await this.db.platformVoucher.findMany({
      where: { deletedAt: null, status: 'ACTIVE', endDate: { gte: now } },
      orderBy: { thresholdPoints: 'asc' },
    });

    const points = userId ? await this.pointsBalance(userId) : 0;
    const claims = userId
      ? await this.db.platformVoucherClaim.findMany({ where: { userId, deletedAt: null } })
      : [];
    const claimByTier = new Map(claims.map((c) => [c.platformVoucherId, c]));

    return {
      points,
      tiers: tiers.map((t) => {
        const claim = claimByTier.get(t.id);
        const threshold = Number(t.thresholdPoints);
        const qualified = points >= threshold;
        const remaining = Math.max(0, threshold - points);
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          thresholdPoints: threshold,
          rewardType: t.rewardType,
          rewardValue: t.rewardValue != null ? Number(t.rewardValue) : null,
          rewardLabel: t.rewardLabel,
          endDate: t.endDate,
          terms: t.terms,
          progress: threshold > 0 ? Math.min(1, points / threshold) : 1,
          remainingToUnlock: remaining,
          qualified,
          unlocked: !!claim,
          code: claim ? claim.code : null,
          status: claim ? claim.status : null,
          redeemedAt: claim?.redeemedAt ?? null,
        };
      }),
    };
  }

  async unlock(userId: string, tierId: string) {
    const tier = await this.db.platformVoucher.findFirst({ where: { id: tierId, deletedAt: null } });
    if (!tier) throw new NotFoundException('Platform voucher not found');
    if (tier.status !== 'ACTIVE' || tier.endDate < new Date()) {
      throw new BadRequestException('This voucher is no longer available');
    }

    const existing = await this.db.platformVoucherClaim.findFirst({
      where: { platformVoucherId: tierId, userId, deletedAt: null },
    });
    if (existing) return { code: existing.code, status: existing.status, alreadyUnlocked: true };

    const points = await this.pointsBalance(userId);
    if (points < Number(tier.thresholdPoints)) {
      throw new BadRequestException(
        `Earn ${(Number(tier.thresholdPoints) - points).toLocaleString('en-IN')} more points to unlock this voucher`,
      );
    }
    if (tier.maxRedemptions != null && tier.currentRedemptions >= tier.maxRedemptions) {
      throw new BadRequestException('This voucher is fully claimed');
    }

    const code = await this.generateUniqueCode(tier.tenantId);
    try {
      const claim = await this.db.platformVoucherClaim.create({
        data: {
          tenantId: tier.tenantId,
          platformVoucherId: tier.id,
          userId,
          code,
          pointsAtUnlock: points,
        },
      });
      return { code: claim.code, status: claim.status, alreadyUnlocked: false };
    } catch {
      const race = await this.db.platformVoucherClaim.findFirst({ where: { platformVoucherId: tierId, userId } });
      if (race) return { code: race.code, status: race.status, alreadyUnlocked: true };
      throw new BadRequestException('Could not unlock voucher, please retry');
    }
  }

  async myVouchers(userId: string) {
    return this.db.platformVoucherClaim.findMany({
      where: { userId, deletedAt: null },
      orderBy: { unlockedAt: 'desc' },
      include: {
        platformVoucher: { select: { title: true, rewardLabel: true, rewardType: true, rewardValue: true, endDate: true } },
      },
    });
  }
}
