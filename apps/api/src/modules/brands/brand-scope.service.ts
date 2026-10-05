import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export interface BillSeries {
  /** SINGLE: not part of a brand. SHARED / PER_OUTLET: the brand's setting. */
  mode: 'SINGLE' | 'SHARED' | 'PER_OUTLET';
  /** The prefix that applies to THIS business's bills (brand-wide when shared, the outlet's own otherwise). */
  prefix: string | null;
  brandId: string | null;
  /** Every live outlet of the brand (just this business when it isn't branded). */
  outletIds: string[];
}

/**
 * Read-only questions about "which brand / which sibling outlets / which bill series" that bills,
 * moderation and access checks all need. Kept free of write logic so any module can import it
 * without creating a cycle with the brands module itself.
 */
@Injectable()
export class BrandScopeService {
  constructor(private readonly db: DatabaseService) {}

  /** Live outlet ids of a brand (soft-deleted ones excluded). */
  async outletIds(brandId: string): Promise<string[]> {
    // tenant-scope-ok: brand outlets live in one tenant; brandId is the scope
    const rows = await this.db.business.findMany({
      where: { brandId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async resolveBillSeries(businessId: string): Promise<BillSeries> {
    const business = await this.db.business.findUnique({
      where: { id: businessId },
      select: {
        billSeriesPrefix: true,
        brandId: true,
        brand: { select: { billSeriesMode: true, billSeriesPrefix: true } },
      },
    });
    if (!business?.brandId || !business.brand) {
      return { mode: 'SINGLE', prefix: business?.billSeriesPrefix ?? null, brandId: null, outletIds: [businessId] };
    }
    const outletIds = await this.outletIds(business.brandId);
    const shared = business.brand.billSeriesMode === 'SHARED';
    return {
      mode: shared ? 'SHARED' : 'PER_OUTLET',
      prefix: shared ? business.brand.billSeriesPrefix : business.billSeriesPrefix,
      brandId: business.brandId,
      outletIds,
    };
  }

  /** True when `userId` owns the brand that `businessId` belongs to (brand owners act across all outlets). */
  async isBrandOwnerOf(userId: string, businessId: string): Promise<boolean> {
    const business = await this.db.business.findUnique({
      where: { id: businessId },
      select: { brand: { select: { ownerId: true } } },
    });
    return !!business?.brand && business.brand.ownerId === userId;
  }
}
