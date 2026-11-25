import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../../common/database/database.service';
import { assertBusinessAccess } from '../../common/utils/business-access';
import { EntitlementsService } from '../subscriptions/entitlements.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardAudienceService } from '../rewards/reward-audience.service';
import { RewardProgressService } from '../rewards/reward-progress.service';
import {
  LIMITS,
  LOCKED_AFTER_CLAIM,
  claimExpiry,
  effectiveExpiry,
  normalizeAudience,
  validateRewardInput,
  audienceIsSet,
} from '../rewards/reward-rules';

export type Actor = { id: string; role?: string | null };

/** "Asha Nair" → "Asha N." Staff see a first name and an initial, never a full name. */
function maskName(name?: string | null): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'Customer';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/**
 * Spend-gated rewards. A business sets a reward ("spend ₹1,000, get a free dessert"); a customer whose
 * VERIFIED spend inside the reward's window reaches the level claims a unique code and shows it at the
 * counter, where staff mark it used. Codes are never returned before the customer qualifies.
 *
 *  - The window is chosen per reward (since it started, this month, last 30 days, or all time for old ones).
 *  - A repeatable reward ("every ₹1,000") can be claimed once per full level of spend in the window.
 *  - An audience can limit who sees and can claim it (see rewards/reward-rules.ts).
 *  - Claiming and redeeming are single database steps, so two taps or two staff cannot both win.
 *
 * Tenancy: voucher + claim + verified-purchase data all live in the business's tenant. Customer-facing
 * reads resolve by the globally-unique businessId, so a customer in another tenant still works.
 */
@Injectable()
export class VouchersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly entitlements: EntitlementsService,
    private readonly progress: RewardProgressService,
    private readonly audience: RewardAudienceService,
    @Optional() private readonly audit?: AuditService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

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

  /** Owners, brand owners, moderators and platform admins manage rewards. */
  private async manager(actor: Actor, businessIdOrEntity: string) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    await assertBusinessAccess(this.db, business.id, actor, { managersOnly: true });
    return business;
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

  async create(actor: Actor, businessIdOrEntity: string, dto: any) {
    const business = await this.manager(actor, businessIdOrEntity);
    validateRewardInput(dto, { creating: true });
    const audience = normalizeAudience(dto.audience);
    const endsAt = new Date(dto.endDate);
    if ((dto.status ?? 'ACTIVE') === 'ACTIVE' && endsAt.getTime() >= Date.now()) {
      await this.entitlements.assertCanGoLive(business.id, 'voucher');
    }
    const repeatable = !!dto.repeatable;
    return this.db.voucher.create({
      data: {
        tenantId: business.tenantId,
        businessId: business.id,
        title: String(dto.title).trim(),
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
        spendWindow: dto.spendWindow ?? 'SINCE_START',
        repeatable,
        perCustomerLimit: repeatable ? (dto.perCustomerLimit ?? LIMITS.repeatDefaultCap) : null,
        claimValidDays: dto.claimValidDays ?? LIMITS.claimValidDefault,
        audience,
        createdBy: actor.id,
      },
    });
  }

  async listForBusiness(actor: Actor, businessIdOrEntity: string) {
    const business = await this.manager(actor, businessIdOrEntity);
    const vouchers = await this.db.voucher.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    // Attach claim counts for the owner overview.
    return Promise.all(
      vouchers.map(async (v) => {
        const [unlocked, redeemed] = await Promise.all([
          this.db.voucherClaim.count({ where: { voucherId: v.id, deletedAt: null } }),
          this.db.voucherClaim.count({
            where: { voucherId: v.id, status: 'REDEEMED', deletedAt: null },
          }),
        ]);
        return {
          ...v,
          unlockedCount: unlocked,
          redeemedCount: redeemed,
          targeted: audienceIsSet(normalizeAudience(v.audience)),
        };
      }),
    );
  }

  private async managedVoucher(actor: Actor, voucherId: string) {
    const voucher = await this.db.voucher.findFirst({ where: { id: voucherId, deletedAt: null } });
    if (!voucher) throw new NotFoundException('Voucher not found');
    await assertBusinessAccess(this.db, voucher.businessId, actor, { managersOnly: true });
    return voucher;
  }

  async update(actor: Actor, voucherId: string, dto: any) {
    const existing = await this.managedVoucher(actor, voucherId);
    // Once someone has claimed, what they were promised does not change under them.
    // tenant-scope-ok: access asserted by managedVoucher() above
    const claims = await this.db.voucherClaim.count({
      where: { voucherId, deletedAt: null },
    });
    if (claims > 0) {
      const touched = LOCKED_AFTER_CLAIM.filter((k) => {
        if (dto[k] === undefined) return false;
        if (k === 'audience') {
          return (
            JSON.stringify(normalizeAudience(dto[k])) !==
            JSON.stringify(normalizeAudience(existing.audience))
          );
        }
        if (k === 'startDate') return new Date(dto[k]).getTime() !== existing.startDate.getTime();
        if (k === 'thresholdAmount') return Number(dto[k]) !== Number(existing.thresholdAmount);
        if (k === 'rewardValue') return Number(dto[k]) !== Number(existing.rewardValue ?? 0);
        return dto[k] !== (existing as any)[k];
      });
      if (touched.length) {
        throw new BadRequestException(
          'Customers have already claimed this reward, so the spend needed, reward, dates and audience cannot change. You can extend the end date, pause it, or create a new reward.',
        );
      }
    }
    validateRewardInput(
      {
        ...dto,
        // Check against what the reward will look like after the edit.
        startDate: dto.startDate ?? existing.startDate,
        endDate: dto.endDate ?? existing.endDate,
        rewardType: dto.rewardType ?? existing.rewardType,
        rewardValue:
          dto.rewardValue ?? (existing.rewardValue != null ? Number(existing.rewardValue) : null),
        rewardLabel: dto.rewardLabel ?? existing.rewardLabel,
        repeatable: dto.repeatable ?? existing.repeatable,
        thresholdAmount: dto.thresholdAmount ?? Number(existing.thresholdAmount),
      },
      { creating: false },
    );
    if (dto.maxRedemptions != null && Number(dto.maxRedemptions) < existing.currentClaims) {
      throw new BadRequestException(
        `${existing.currentClaims} codes have already been claimed, so the limit cannot be lower than that.`,
      );
    }
    const data: any = {};
    for (const k of [
      'title',
      'description',
      'rewardType',
      'rewardValue',
      'rewardLabel',
      'status',
      'terms',
      'maxRedemptions',
      'targetCities',
      'spendWindow',
      'repeatable',
      'perCustomerLimit',
      'claimValidDays',
    ]) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.audience !== undefined) data.audience = normalizeAudience(dto.audience);
    if (dto.thresholdAmount !== undefined) data.thresholdAmount = dto.thresholdAmount;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    data.updatedBy = actor.id;
    // Plan limit: only when this edit turns a non-live voucher live (resume / extend an expired one).
    const live = (status: string, end: Date) =>
      status === 'ACTIVE' && new Date(end).getTime() >= Date.now();
    const wasLive = live(existing.status, existing.endDate);
    const willBeLive = live(data.status ?? existing.status, data.endDate ?? existing.endDate);
    if (willBeLive && !wasLive) {
      await this.entitlements.assertCanGoLive(existing.businessId, 'voucher', voucherId);
    }
    return this.db.voucher.update({ where: { id: voucherId }, data });
  }

  async remove(actor: Actor, voucherId: string) {
    await this.managedVoucher(actor, voucherId);
    // Codes already handed out are a promise to a customer: pause the reward instead of deleting it.
    // tenant-scope-ok: access asserted by managedVoucher() above
    const open = await this.db.voucherClaim.count({
      where: {
        voucherId,
        deletedAt: null,
        status: 'UNLOCKED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (open > 0) {
      throw new BadRequestException(
        `${open} customer${open === 1 ? ' has' : 's have'} an unused code for this reward. Pause it instead, and delete it after the codes are used or expire.`,
      );
    }
    await this.db.voucher.update({ where: { id: voucherId }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async listClaims(actor: Actor, voucherId: string) {
    await this.managedVoucher(actor, voucherId);
    // tenant-scope-ok: access asserted by managedVoucher() immediately above
    const claims = await this.db.voucherClaim.findMany({
      where: { voucherId, deletedAt: null },
      orderBy: { unlockedAt: 'desc' },
      take: 500,
      include: { user: { select: { id: true, name: true } } },
    });
    // The owner sees who claimed, because they serve them; the audience itself is never listed.
    return claims.map((c) => ({
      ...c,
      user: c.user ? { id: c.user.id, name: c.user.name } : null,
    }));
  }

  /** How many people fit an audience, for the "about N people" line in the reward form. */
  async audiencePreview(actor: Actor, businessIdOrEntity: string, audience: unknown) {
    const business = await this.manager(actor, businessIdOrEntity);
    return this.audience.preview(business.id, audience);
  }

  // ── STAFF: look up and redeem a customer's code ──────────────────────────

  /** Any active staff of the business can check and redeem a code. */
  private async staff(actor: Actor, businessIdOrEntity: string) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    await assertBusinessAccess(this.db, business.id, actor);
    return business;
  }

  private normalizeCode(code: string) {
    return (code || '').trim().toUpperCase();
  }

  /** What the staff member sees before confirming: whose code, which reward, whether it still works. */
  async lookup(actor: Actor, businessIdOrEntity: string, code: string) {
    const business = await this.staff(actor, businessIdOrEntity);
    const claim = await this.db.voucherClaim.findFirst({
      where: { businessId: business.id, code: this.normalizeCode(code), deletedAt: null },
      include: { voucher: true, user: { select: { name: true } } },
    });
    if (!claim) throw new NotFoundException('That code is not a reward from this business.');
    const expiresAt = effectiveExpiry(claim, claim.voucher);
    const expired = expiresAt.getTime() < Date.now();
    const valid = claim.status === 'UNLOCKED' && !expired;
    return {
      valid,
      reason: valid
        ? null
        : claim.status === 'REDEEMED'
          ? 'Already used'
          : expired
            ? 'Expired'
            : 'Not valid',
      customer: maskName(claim.user?.name),
      title: claim.voucher.title,
      rewardType: claim.voucher.rewardType,
      rewardValue: claim.voucher.rewardValue != null ? Number(claim.voucher.rewardValue) : null,
      rewardLabel: claim.voucher.rewardLabel,
      terms: claim.voucher.terms,
      expiresAt,
      redeemedAt: claim.redeemedAt,
    };
  }

  async redeem(
    actor: Actor,
    businessIdOrEntity: string,
    code: string,
    opts: { billAmount?: number } = {},
  ) {
    const business = await this.staff(actor, businessIdOrEntity);
    const claim = await this.db.voucherClaim.findFirst({
      where: { businessId: business.id, code: this.normalizeCode(code), deletedAt: null },
      include: { voucher: true, user: { select: { id: true, name: true, tenantId: true } } },
    });
    if (!claim) throw new NotFoundException('Voucher code not found for this business');
    if (claim.status === 'REDEEMED') {
      throw new BadRequestException('This voucher has already been redeemed');
    }
    const expiresAt = effectiveExpiry(claim, claim.voucher);
    if (expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        `This code expired on ${expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}.`,
      );
    }
    const amount =
      opts.billAmount != null &&
      Number.isFinite(Number(opts.billAmount)) &&
      Number(opts.billAmount) >= 0
        ? Math.round(Number(opts.billAmount) * 100) / 100
        : null;

    // One conditional update: of two staff pressing at once, exactly one sees count 1.
    const won = await this.db.voucherClaim.updateMany({
      where: { id: claim.id, status: 'UNLOCKED' },
      data: {
        status: 'REDEEMED',
        redeemedAt: new Date(),
        redeemedBy: actor.id,
        redeemAmount: amount,
      },
    });
    if (won.count !== 1) throw new BadRequestException('This voucher has already been redeemed');
    await this.db.voucher.update({
      where: { id: claim.voucherId },
      data: { currentRedemptions: { increment: 1 } },
    });
    await this.progress.recordEvent({
      tenantId: claim.tenantId,
      userId: claim.userId,
      voucherId: claim.voucherId,
      businessId: business.id,
      kind: 'REDEEMED',
      cycleKey: claim.id,
      amount,
    });
    await this.audit?.log({
      tenantId: claim.tenantId,
      userId: actor.id,
      action: 'VOUCHER_REDEEMED',
      resource: 'VOUCHER_CLAIM',
      resourceId: claim.id,
      metadata: { businessId: business.id, voucherId: claim.voucherId, code: claim.code, amount },
    });
    await this.notifications
      ?.send({
        tenantId: claim.user.tenantId,
        userId: claim.userId,
        title: 'Reward used',
        body: `"${claim.voucher.title}" was used at ${business.name}. Enjoy!`,
        type: 'IN_APP',
        channel: 'BUSINESS',
        metadata: { kind: 'REWARD_REDEEMED', claimId: claim.id, businessId: business.id },
      })
      .catch(() => undefined);

    return {
      success: true,
      customer: maskName(claim.user?.name),
      voucherTitle: claim.voucher.title,
      reward: claim.voucher.rewardLabel,
      claim: { ...claim, status: 'REDEEMED', redeemedAt: new Date(), redeemAmount: amount },
    };
  }

  // ── CUSTOMER: browse + claim ─────────────────────────────────────────────

  /** The reward as the customer sees it: progress, what is claimable, and their codes. */
  private async present(v: any, userId: string | undefined, now: number) {
    const base = {
      id: v.id,
      title: v.title,
      description: v.description,
      thresholdAmount: Number(v.thresholdAmount),
      rewardType: v.rewardType,
      rewardValue: v.rewardValue != null ? Number(v.rewardValue) : null,
      rewardLabel: v.rewardLabel,
      endDate: v.endDate,
      terms: v.terms,
      spendWindow: v.spendWindow,
      repeatable: v.repeatable,
      targeted: audienceIsSet(normalizeAudience(v.audience)),
    };
    if (!userId) {
      return {
        ...base,
        spendInWindow: 0,
        progress: 0,
        remainingToUnlock: Number(v.thresholdAmount),
        qualified: false,
        claimable: 0,
        claimedCount: 0,
        unlocked: false,
        code: null,
        status: null,
        redeemedAt: null,
        codes: [],
      };
    }
    const st = await this.progress.stateFor(v, userId, now);
    // tenant-scope-ok: the viewer's own claims of this reward
    const claims = await this.db.voucherClaim.findMany({
      where: { voucherId: v.id, userId, deletedAt: null },
      orderBy: { unlockedAt: 'desc' },
      take: 20,
    });
    const codes = claims.map((c) => ({
      code: c.code,
      status: c.status,
      unlockedAt: c.unlockedAt,
      redeemedAt: c.redeemedAt,
      expiresAt: effectiveExpiry(c, v),
    }));
    const latest = codes.find((c) => c.status === 'UNLOCKED') ?? codes[0] ?? null;
    return {
      ...base,
      spendInWindow: st.spend,
      progress: st.progress,
      remainingToUnlock: st.remaining,
      qualified: st.claimable > 0,
      claimable: st.claimable,
      claimedCount: st.claimed,
      done: st.done,
      unlocked: claims.length > 0,
      code: latest?.code ?? null,
      status: latest?.status ?? null,
      redeemedAt: latest?.redeemedAt ?? null,
      codes,
    };
  }

  /**
   * Live rewards of a business with the viewer's progress. A reward with an audience is shown only to
   * people who fit it (and not to visitors who are signed out, since we cannot tell).
   */
  async available(businessIdOrEntity: string, userId?: string) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    const now = Date.now();
    const vouchers = await this.db.voucher.findMany({
      where: {
        businessId: business.id,
        deletedAt: null,
        status: 'ACTIVE',
        startDate: { lte: new Date(now) },
        endDate: { gte: new Date(now) },
      },
      orderBy: { thresholdAmount: 'asc' },
    });
    const visible: any[] = [];
    for (const v of vouchers) {
      if (audienceIsSet(normalizeAudience(v.audience))) {
        if (!userId || !(await this.audience.matches(v, userId, now))) continue;
      }
      visible.push(v);
    }
    const spend = userId ? await this.progress.spendSince(userId, business.id, null) : 0;
    return {
      spend,
      businessName: business.name,
      vouchers: await Promise.all(visible.map((v) => this.present(v, userId, now))),
    };
  }

  /** Claim a reward for the signed-in customer. Safe to call twice. */
  async claim(userId: string, voucherId: string) {
    const now = Date.now();
    const voucher = await this.db.voucher.findFirst({ where: { id: voucherId, deletedAt: null } });
    if (!voucher) throw new NotFoundException('Voucher not found');
    if (
      voucher.status !== 'ACTIVE' ||
      voucher.endDate.getTime() < now ||
      voucher.startDate.getTime() > now
    ) {
      throw new BadRequestException('This voucher is no longer available');
    }
    if (!(await this.audience.matches(voucher, userId, now))) {
      throw new ForbiddenException('This reward is not available for your account.');
    }

    const st = await this.progress.stateFor(voucher as any, userId, now);
    if (st.claimable < 1) {
      // Non-repeatable and already claimed: hand back the same code, like before.
      const existing = await this.db.voucherClaim.findFirst({
        where: { voucherId, userId, deletedAt: null },
        orderBy: { unlockedAt: 'desc' },
      });
      if (existing && st.done && !voucher.repeatable) {
        return { code: existing.code, status: existing.status, alreadyUnlocked: true };
      }
      if (st.done) {
        throw new BadRequestException(
          'You have already claimed this reward the most times it allows.',
        );
      }
      throw new BadRequestException(
        `Spend ₹${st.remaining.toLocaleString('en-IN')} more to unlock this voucher`,
      );
    }

    const key = st.nextCycleKey;
    const code = await this.generateUniqueCode(voucher.tenantId);
    const expiresAt = claimExpiry(voucher, now);
    try {
      const claim = await this.db.$transaction(async (tx: any) => {
        // The cap is on codes handed out. One conditional update decides who gets the last one.
        const took: number = await tx.$executeRaw`
          UPDATE "vouchers" SET "current_claims" = "current_claims" + 1
           WHERE "id" = ${voucherId}::uuid
             AND ("max_redemptions" IS NULL OR "current_claims" < "max_redemptions")`;
        if (took !== 1) throw new BadRequestException('This voucher is fully claimed');
        return tx.voucherClaim.create({
          data: {
            tenantId: voucher.tenantId,
            voucherId: voucher.id,
            userId,
            businessId: voucher.businessId,
            code,
            spendAtUnlock: st.spend,
            cycleKey: key,
            expiresAt,
          },
        });
      });
      await this.progress.recordEvent({
        tenantId: voucher.tenantId,
        userId,
        voucherId,
        businessId: voucher.businessId,
        kind: 'CLAIMED',
        cycleKey: key,
        amount: st.spend,
      });
      return { code: claim.code, status: claim.status, alreadyUnlocked: false, expiresAt };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      // Two taps at once: the other one won this claim number. Return that code.
      const race = await this.db.voucherClaim.findFirst({
        where: { voucherId, userId, cycleKey: key },
      });
      if (race) return { code: race.code, status: race.status, alreadyUnlocked: true };
      throw new BadRequestException('Could not unlock voucher, please retry');
    }
  }

  /** Old name, same thing. */
  unlock(userId: string, voucherId: string) {
    return this.claim(userId, voucherId);
  }

  // ── CUSTOMER: wallet and "rewards near you" ──────────────────────────────

  /**
   * Everything the customer holds or is working towards, across businesses:
   * ready to claim, close, and their codes (usable first).
   */
  async wallet(userId: string) {
    const now = Date.now();
    const [claims, boughtAt] = await Promise.all([
      // tenant-scope-ok: the customer's own claims across businesses
      this.db.voucherClaim.findMany({
        where: { userId, deletedAt: null },
        orderBy: { unlockedAt: 'desc' },
        take: 100,
        include: {
          voucher: {
            select: {
              title: true,
              rewardLabel: true,
              rewardType: true,
              rewardValue: true,
              endDate: true,
              terms: true,
            },
          },
          business: { select: { id: true, name: true, city: true } },
        },
      }),
      // tenant-scope-ok: the customer's own purchases
      this.db.verifiedPurchase.groupBy({
        by: ['businessId'],
        where: { userId, deletedAt: null },
        _sum: { amount: true },
        orderBy: { businessId: 'asc' },
        take: 100,
      }),
    ]);

    const codes = claims
      .map((c) => {
        const expiresAt = effectiveExpiry(c, c.voucher);
        const expired = c.status === 'UNLOCKED' && expiresAt.getTime() < now;
        return {
          id: c.id,
          code: c.code,
          status: expired ? 'EXPIRED' : c.status,
          title: c.voucher.title,
          rewardType: c.voucher.rewardType,
          rewardValue: c.voucher.rewardValue != null ? Number(c.voucher.rewardValue) : null,
          rewardLabel: c.voucher.rewardLabel,
          terms: c.voucher.terms,
          unlockedAt: c.unlockedAt,
          redeemedAt: c.redeemedAt,
          expiresAt,
          business: c.business,
        };
      })
      .sort((a, b) => {
        const rank = (s: string) => (s === 'UNLOCKED' ? 0 : s === 'REDEEMED' ? 1 : 2);
        return rank(a.status) - rank(b.status);
      });

    const businessIds = boughtAt.map((b) => b.businessId);
    const ready: any[] = [];
    const near: any[] = [];
    if (businessIds.length) {
      // tenant-scope-ok: live rewards of businesses the customer has bought from
      const vouchers = await this.db.voucher.findMany({
        where: {
          businessId: { in: businessIds },
          deletedAt: null,
          status: 'ACTIVE',
          startDate: { lte: new Date(now) },
          endDate: { gte: new Date(now) },
        },
        take: 60,
        include: { business: { select: { id: true, name: true, city: true } } },
      });
      for (const v of vouchers) {
        if (!(await this.audience.matches(v, userId, now))) continue;
        const st = await this.progress.stateFor(v as any, userId, now);
        const item = {
          voucherId: v.id,
          title: v.title,
          rewardType: v.rewardType,
          rewardValue: v.rewardValue != null ? Number(v.rewardValue) : null,
          rewardLabel: v.rewardLabel,
          threshold: Number(v.thresholdAmount),
          spendInWindow: st.spend,
          progress: st.progress,
          remaining: st.remaining,
          claimable: st.claimable,
          repeatable: v.repeatable,
          endDate: v.endDate,
          business: v.business,
        };
        if (st.claimable > 0) ready.push(item);
        else if (!st.done && st.progress > 0) near.push(item);
      }
      near.sort((a, b) => a.remaining - b.remaining);
    }
    return { ready, near: near.slice(0, 20), codes };
  }

  /**
   * "Rewards near you": live rewards at businesses in a city that the customer fits, closest first.
   * A reward aimed at an audience appears only to people in it, with a short "why you" line.
   */
  async nearMe(userId: string, city?: string) {
    const now = Date.now();
    let where = (city ?? '').trim();
    if (!where) {
      // tenant-scope-ok: the customer's own profile
      const profile = await this.db.customer.findFirst({
        where: { userId, deletedAt: null },
        select: { city: true },
      });
      where = profile?.city ?? '';
    }
    // tenant-scope-ok: public listing of live rewards in a city
    const vouchers = await this.db.voucher.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        startDate: { lte: new Date(now) },
        endDate: { gte: new Date(now) },
        business: {
          status: 'APPROVED',
          deletedAt: null,
          ...(where ? { city: { equals: where, mode: 'insensitive' as const } } : {}),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        business: {
          select: { id: true, name: true, city: true, category: { select: { name: true } } },
        },
      },
    });
    const out: any[] = [];
    for (const v of vouchers) {
      const aud = normalizeAudience(v.audience);
      if (audienceIsSet(aud) && !(await this.audience.matches(v, userId, now))) continue;
      const st = await this.progress.stateFor(v as any, userId, now);
      if (st.done && st.claimable === 0) continue;
      out.push({
        voucherId: v.id,
        title: v.title,
        rewardType: v.rewardType,
        rewardValue: v.rewardValue != null ? Number(v.rewardValue) : null,
        rewardLabel: v.rewardLabel,
        threshold: Number(v.thresholdAmount),
        spendInWindow: st.spend,
        progress: st.progress,
        remaining: st.remaining,
        claimable: st.claimable,
        repeatable: v.repeatable,
        endDate: v.endDate,
        picked: audienceIsSet(aud),
        business: {
          id: v.business.id,
          name: v.business.name,
          city: v.business.city,
          category: v.business.category?.name ?? null,
        },
      });
    }
    out.sort(
      (a, b) => b.claimable - a.claimable || b.progress - a.progress || a.remaining - b.remaining,
    );
    return { city: where || null, rewards: out.slice(0, 30) };
  }

  /** The customer's claimed codes only (the old "my vouchers" shape). */
  async myVouchers(userId: string) {
    return (await this.wallet(userId)).codes;
  }
}
