import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../../common/database/database.service';
import { CreateDiscountDto } from './dto/discount.dto';

/**
 * Lucky-wheel discount campaigns. A business publishes one active campaign
 * (an item + a max discount %); the server generates 7 wheel segments, capped
 * at that max, shown to every visitor. A customer spins once per campaign —
 * the server picks the winning segment and issues a redeemable ticket (a
 * DiscountSpin) with a unique code, shown in-store and marked redeemed there.
 *
 * Tenancy: campaign + spin data live in the business's tenant. Customer-facing
 * reads resolve by the globally-unique businessId, same convention as Vouchers.
 */
const WHEEL_SEGMENTS = 7;
const MIN_SEGMENT_PERCENT = 1;
const SPIN_TICKET_VALID_DAYS = 30;

@Injectable()
export class DiscountsService {
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

  /**
   * 7 segment values, ascending, topping out at maxPercent. Below 7 distinct
   * values (a low max), segments repeat rather than going below 1% or above the max.
   */
  private generateWheelPercentages(maxPercent: number): number[] {
    const span = Math.max(1, maxPercent - MIN_SEGMENT_PERCENT);
    const values = [maxPercent];
    for (let i = 1; i < WHEEL_SEGMENTS; i++) {
      values.push(MIN_SEGMENT_PERCENT + Math.floor(Math.random() * (span + 1)));
    }
    return values.sort((a, b) => a - b);
  }

  private async generateCode(tenantId: string): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = 'SPIN-' + randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      const exists = await this.db.discountSpin.findFirst({ where: { tenantId, code }, select: { id: true } });
      if (!exists) return code;
    }
    // Extremely unlikely; fall back to a longer code.
    return 'SPIN-' + randomBytes(6).toString('hex').toUpperCase();
  }

  // ── OWNER: CRUD ──────────────────────────────────────────────────────────

  async create(userId: string, businessIdOrEntity: string, dto: CreateDiscountDto) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');

    if (dto.productId) {
      const product = await this.db.product.findFirst({
        where: { id: dto.productId, businessId: business.id, deletedAt: null },
      });
      if (!product) throw new BadRequestException('That product does not belong to this business.');
    }

    const wheelPercentages = this.generateWheelPercentages(dto.maxDiscountPercent);

    // One active campaign at a time — creating a new one retires the old.
    // Tickets already issued under it stay valid until redeemed or expired.
    await this.db.businessDiscount.updateMany({
      where: { businessId: business.id, isActive: true, deletedAt: null },
      data: { isActive: false },
    });

    return this.db.businessDiscount.create({
      data: {
        tenantId: business.tenantId,
        businessId: business.id,
        itemName: dto.itemName.trim(),
        productId: dto.productId || null,
        description: dto.description?.trim() || null,
        maxDiscountPercent: dto.maxDiscountPercent,
        wheelPercentages,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async listMine(userId: string, businessIdOrEntity: string) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    const discounts = await this.db.businessDiscount.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      discounts.map(async (d) => {
        const [spun, redeemed] = await Promise.all([
          this.db.discountSpin.count({ where: { discountId: d.id, deletedAt: null } }),
          this.db.discountSpin.count({ where: { discountId: d.id, status: 'REDEEMED', deletedAt: null } }),
        ]);
        return { ...d, spunCount: spun, redeemedCount: redeemed };
      }),
    );
  }

  async deactivate(userId: string, id: string) {
    const discount = await this.db.businessDiscount.findFirst({
      where: { id, deletedAt: null },
      include: { business: { select: { ownerId: true } } },
    });
    if (!discount) throw new NotFoundException('Discount campaign not found');
    if (discount.business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    return this.db.businessDiscount.update({ where: { id }, data: { isActive: false } });
  }

  // ── PUBLIC / CUSTOMER ────────────────────────────────────────────────────

  /** The active campaign for a business profile, plus the caller's own ticket if they already spun. */
  async getActive(businessIdOrEntity: string, userId?: string) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    const now = new Date();
    const discount = await this.db.businessDiscount.findFirst({
      where: {
        businessId: business.id,
        isActive: true,
        deletedAt: null,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!discount) return null;

    const mySpin = userId
      ? await this.db.discountSpin.findFirst({
          where: { discountId: discount.id, userId, deletedAt: null },
          select: { discountPercent: true, code: true, status: true, itemName: true, expiresAt: true },
        })
      : null;

    return {
      id: discount.id,
      businessId: discount.businessId,
      businessName: business.name,
      itemName: discount.itemName,
      description: discount.description,
      wheelPercentages: discount.wheelPercentages,
      mySpin,
    };
  }

  /** Every business with a live wheel right now — for the public "Spin it" discovery page. */
  async listAllActive(limit = 60) {
    const now = new Date();
    const discounts = await this.db.businessDiscount.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        business: { select: { id: true, name: true, city: true, logo: true, category: { select: { name: true } } } },
      },
    });
    return discounts.map((d) => ({
      id: d.id,
      businessId: d.business.id,
      businessName: d.business.name,
      businessCity: d.business.city,
      businessLogo: d.business.logo,
      categoryName: d.business.category?.name || null,
      itemName: d.itemName,
      description: d.description,
      maxDiscountPercent: d.maxDiscountPercent,
      wheelPercentages: d.wheelPercentages,
    }));
  }

  /**
   * Spin the wheel. The winning segment is chosen here, server-side, so it
   * can't be influenced by the client — the animation just plays out to match
   * whatever this returns. One spin per user per campaign; a retry (double
   * click, two tabs) just returns the ticket already issued.
   */
  async spin(userId: string, discountId: string) {
    const discount = await this.db.businessDiscount.findFirst({
      where: { id: discountId, deletedAt: null },
    });
    if (!discount) throw new NotFoundException('Discount campaign not found');
    if (!discount.isActive) throw new BadRequestException('This discount wheel is no longer active.');
    const now = new Date();
    if (discount.startDate && discount.startDate > now) {
      throw new BadRequestException('This discount wheel has not started yet.');
    }
    if (discount.endDate && discount.endDate < now) {
      throw new BadRequestException('This discount wheel has ended.');
    }

    const existing = await this.db.discountSpin.findFirst({ where: { discountId, userId, deletedAt: null } });
    if (existing) return { ...existing, alreadySpun: true };

    const percentages = Array.isArray(discount.wheelPercentages) ? (discount.wheelPercentages as number[]) : [];
    if (percentages.length === 0) {
      throw new BadRequestException('This discount wheel has no segments configured.');
    }
    // One random byte over 7 segments has a ~0.4% bias on two segments — fine for a
    // marketing wheel, not worth a rejection-sampling loop.
    const winningIndex = randomBytes(1)[0] % percentages.length;
    const discountPercent = percentages[winningIndex];
    const code = await this.generateCode(discount.tenantId);
    const expiresAt = new Date(now.getTime() + SPIN_TICKET_VALID_DAYS * 24 * 60 * 60 * 1000);

    try {
      const spinRow = await this.db.discountSpin.create({
        data: {
          tenantId: discount.tenantId,
          discountId: discount.id,
          businessId: discount.businessId,
          userId,
          discountPercent,
          itemName: discount.itemName,
          code,
          expiresAt,
        },
      });
      return { ...spinRow, winningIndex, alreadySpun: false };
    } catch (err: any) {
      // Unique (discountId, userId) race — two tabs spinning at the same instant.
      if (err.code === 'P2002') {
        const raced = await this.db.discountSpin.findFirst({ where: { discountId, userId, deletedAt: null } });
        if (raced) return { ...raced, alreadySpun: true };
      }
      throw err;
    }
  }

  /** All of a customer's tickets, across every business, for a "My Tickets" view. */
  async myTickets(userId: string) {
    return this.db.discountSpin.findMany({
      where: { userId, deletedAt: null },
      orderBy: { spunAt: 'desc' },
      include: { business: { select: { id: true, name: true, logo: true } } },
    });
  }

  // ── BUSINESS: redeem a ticket in-store ──────────────────────────────────

  async redeem(userId: string, businessIdOrEntity: string, code: string) {
    const business = await this.resolveBusiness(businessIdOrEntity);
    if (business.ownerId !== userId) throw new ForbiddenException('Not authorized');
    const normalized = (code || '').trim().toUpperCase();
    const spin = await this.db.discountSpin.findFirst({
      where: { businessId: business.id, code: normalized, deletedAt: null },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!spin) throw new NotFoundException('Ticket code not found for this business');
    if (spin.status === 'REDEEMED') throw new BadRequestException('This ticket has already been redeemed');
    if (spin.expiresAt && spin.expiresAt < new Date()) throw new BadRequestException('This ticket has expired');

    return this.db.discountSpin.update({
      where: { id: spin.id },
      data: { status: 'REDEEMED', redeemedAt: new Date(), redeemedBy: userId },
    });
  }

  // ── PLATFORM: oversight ("Discounts" admin section) ─────────────────────

  async adminFindAll(page = 1, limit = 25) {
    const skip = (Math.max(1, page) - 1) * limit;
    const [data, total] = await Promise.all([
      // tenant-scope-ok: platform-wide discounts oversight (admin)
      this.db.businessDiscount.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          business: { select: { id: true, name: true, city: true } },
          _count: { select: { spins: true } },
        },
      }),
      // tenant-scope-ok: platform-wide discounts oversight (admin)
      this.db.businessDiscount.count({ where: { deletedAt: null } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
