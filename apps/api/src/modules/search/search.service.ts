import { getOpenStatus } from '@saas/types';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TypesenseService } from '../typesense/typesense.service';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { toPublicBusiness } from '../../common/utils/public-business';

// ── Iteration 2: search synonym groups ──────────────────────
// Additive query expansion so colloquial/variant spellings resolve to the
// canonical category & subcategory taxonomy. Each group is a set of equivalent
// terms; if a query matches any member, the remaining members are appended to
// the search query (Typesense) and OR-clauses (Postgres fallback). Never
// restricts results — only broadens them.
const SEARCH_SYNONYM_GROUPS: string[][] = [
  ['salon', 'salons', 'saloon', 'saloons', 'beauty parlour', 'beauty parlor', 'parlour'],
  ['gift shop', 'gift shops', 'gift store', 'gift stores', 'gifts', 'gift'],
  ['tyre', 'tyres', 'tire', 'tires', 'tyre shop', 'tire shop'],
  ['puncture', 'puncture repair', 'flat tyre', 'mobile puncture', 'puncture service'],
  [
    'diagnostic center',
    'diagnostic centre',
    'diagnostic centers',
    'diagnostics center',
    'diagnostics centers',
    'diagnostic',
    'diagnostics',
    'diagnostic lab',
    'diagnostic labs',
  ],
  [
    'home care',
    'home care services',
    'home healthcare',
    'home health',
    'home health care',
    'home nursing',
  ],
  ['resort', 'resorts'],
  ['hotel', 'hotels'],
  ['venue', 'venues', 'venue spots', 'auditorium', 'mandapam', 'mandapams'],
  ['sadya', 'sadhya', 'sadhya feast', 'onam sadya', 'onam sadhya'],
  ['payasam', 'payasam sweet', 'payasam dessert'],
  ['staycation', 'stay cation', 'day-out', 'day out', 'dayout'],
];

@Injectable()
export class SearchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchService.name);

  /**
   * Returns extra search terms implied by synonym groups for the given query.
   * Excludes terms already present in the query. Empty for blank / wildcard.
   */
  private expandSynonyms(query: string): string[] {
    if (!query || query === '*') return [];
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    const extras = new Set<string>();
    for (const group of SEARCH_SYNONYM_GROUPS) {
      const hit = group.some((term) => q === term || q.includes(term) || term.includes(q));
      if (hit) group.forEach((term) => extras.add(term));
    }
    // Drop terms already contained in the original query.
    return Array.from(extras).filter((term) => !q.includes(term));
  }

  constructor(
    private readonly typesenseService: TypesenseService,
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    @InjectQueue('search-queue') private readonly searchQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    try {
      const isEnabled = this.typesenseService.getEnabled();
      if (isEnabled) {
        const hasDocs = await this.typesenseService.hasDocuments('businesses');
        if (!hasDocs) {
          this.logger.log('Typesense businesses collection is empty. Syncing from database...');
          // tenant-scope-ok: public business search across all listings
          const businesses = await this.db.business.findMany({
            where: { deletedAt: null },
            select: { id: true, tenantId: true },
          });
          this.logger.log(`Found ${businesses.length} businesses to index — queuing in bulk.`);

          // Batch into chunks of 50 to avoid flooding the queue with thousands of
          // individual jobs at startup. Each job processes one business but we
          // only add 50 at a time with a small delay so the queue drains gradually.
          const CHUNK = 50;
          for (let i = 0; i < businesses.length; i += CHUNK) {
            const chunk = businesses.slice(i, i + CHUNK);
            await Promise.all(
              chunk.map((biz) =>
                this.searchQueue.add(
                  'sync-business',
                  { action: 'INDEX', type: 'BUSINESS', id: biz.id, tenantId: biz.tenantId },
                  { delay: Math.floor(i / CHUNK) * 2000 }, // stagger chunks by 2 s
                ),
              ),
            );
          }
          this.logger.log('Typesense sync jobs queued successfully.');
        }
      }
    } catch (err) {
      this.logger.error('Failed to auto-sync Typesense search index', err);
    }
  }

  /**
   * Adds the "live offers" summary the public cards show: how many offers are
   * running right now and which fulfilment modes (DINE_IN / TAKEAWAY / BOTH)
   * they cover. Purely additive and never throws — on any failure the rows are
   * returned untouched.
   */
  async attachOfferSummary<T extends Record<string, any>>(rows: T[]): Promise<T[]> {
    const ids = rows.map((r) => r?.id).filter(Boolean);
    if (!ids.length) return rows;
    try {
      const now = new Date();
      // tenant-scope-ok: public business search across all listings
      const offers = await this.db.offer.findMany({
        where: {
          businessId: { in: ids },
          status: 'ACTIVE',
          deletedAt: null,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: { businessId: true, fulfilment: true },
      });
      const byBiz = new Map<string, { count: number; modes: Set<string> }>();
      for (const o of offers as any[]) {
        const s = byBiz.get(o.businessId) ?? { count: 0, modes: new Set<string>() };
        s.count += 1;
        s.modes.add(String(o.fulfilment));
        byBiz.set(o.businessId, s);
      }
      return rows.map((r) => {
        const s = byBiz.get(r.id);
        return {
          ...r,
          activeOfferCount: s?.count ?? 0,
          offerFulfilments: s ? Array.from(s.modes) : [],
        };
      });
    } catch (err) {
      this.logger.warn('attachOfferSummary failed, returning rows without it');
      return rows;
    }
  }

  /**
   * Typesense documents only carry searchable text. Fill in what the public
   * cards need (logo, verified, opening hours, halal, brand/outlet, address,
   * coordinates, live-offer summary) from Postgres. Document fields win on
   * overlap; failures fall back to the bare documents.
   */
  private async hydrateDocs(docs: any[]): Promise<any[]> {
    const ids = docs.map((d) => d?.id).filter(Boolean);
    if (!ids.length) return docs;
    try {
      // tenant-scope-ok: public business search across all listings
      const rows = await this.db.business.findMany({
        where: { id: { in: ids }, deletedAt: null },
        select: {
          id: true,
          logo: true,
          isVerified: true,
          halalStatus: true,
          operatingHours: true,
          outletLabel: true,
          brandId: true,
          address: true,
          state: true,
          latitude: true,
          longitude: true,
          website: true,
          socialLinks: true,
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      });
      const byId = new Map<string, any>((rows as any[]).map((r): [string, any] => [r.id, r]));
      const merged = docs.map((d) => {
        const r = byId.get(d.id);
        if (!r) return d;
        const { id: _id, latitude, longitude, ...rest } = r;
        return {
          ...rest,
          ...d,
          latitude: latitude != null ? Number(latitude) : null,
          longitude: longitude != null ? Number(longitude) : null,
        };
      });
      return await this.attachOfferSummary(merged);
    } catch (err) {
      this.logger.warn('hydrateDocs failed, returning bare Typesense documents');
      return docs;
    }
  }

  /**
   * Main Search Endpoint (Typesense First, Postgres Fallback)
   */
  async searchBusinesses(
    tenantId: string,
    query: string,
    filters?: {
      categoryId?: string;
      city?: string;
      minRating?: number;
      openNow?: boolean;
      halal?: boolean;
      fulfilment?: 'DINE_IN' | 'TAKEAWAY';
    },
    page = 1,
    limit = 20,
    isPublic = false,
  ): Promise<any> {
    // Open-now depends on each listing's hours evaluated *now*, and halal/fulfilment live outside the
    // search index, so these are applied server-side over the whole candidate set (exact totals).
    const needsPostFilter = !!(filters?.openNow || filters?.halal || filters?.fulfilment);
    // Open-now changes minute to minute, so it gets a short cache bucket.
    const minuteBucket = filters?.openNow ? Math.floor(Date.now() / 300_000) : 0;
    const cacheKey = `search:${tenantId}:${query}:${JSON.stringify(filters)}:${page}:${isPublic}:${minuteBucket}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const synonymExtras = this.expandSynonyms(query);
    const expandedQuery =
      synonymExtras.length && query && query !== '*'
        ? `${query} ${synonymExtras.join(' ')}`
        : query;

    try {
      if (needsPostFilter) throw new Error('post-filter path');
      const searchParams: any = {
        q: expandedQuery,
        // Ranking priority: name → categoryName → subcategoryName → tags → offerTitles → branchNames → description
        query_by:
          'name,categoryName,subcategoryName,tags,offerTitles,branchNames,productNames,description',
        query_by_weights: '10,7,6,5,4,3,2,1',
        // Public discovery spans all tenants but only APPROVED businesses;
        // internal search is scoped to the caller's tenant.
        filter_by: isPublic ? 'status:=APPROVED' : `tenantId:=${tenantId}`,
        page,
        per_page: limit,
      };

      if (filters?.categoryId) {
        searchParams.filter_by = searchParams.filter_by
          ? `${searchParams.filter_by} && categoryId:=${filters.categoryId}`
          : `categoryId:=${filters.categoryId}`;
      }
      if (filters?.city) {
        searchParams.filter_by = searchParams.filter_by
          ? `${searchParams.filter_by} && city:=${filters.city}`
          : `city:=${filters.city}`;
      }
      if (filters?.minRating) {
        searchParams.filter_by = searchParams.filter_by
          ? `${searchParams.filter_by} && averageRating:>=${filters.minRating}`
          : `averageRating:>=${filters.minRating}`;
      }

      const typesenseResults = await this.typesenseService.search('businesses', searchParams);
      if (typesenseResults && typesenseResults.hits && typesenseResults.hits.length > 0) {
        const response = {
          data: await this.hydrateDocs(typesenseResults.hits.map((hit: any) => hit.document)),
          meta: {
            total: typesenseResults.found,
            page: typesenseResults.page,
            limit: searchParams.per_page,
          },
          source: 'typesense',
        };
        await this.redis.set(cacheKey, response, 300); // 5 min TTL
        return response;
      }
    } catch (error: any) {
      if (!needsPostFilter) this.logger.warn('Typesense search failed, falling back to PostgreSQL');
    }

    // Postgres Fallback
    const where: any = isPublic
      ? { deletedAt: null, status: 'APPROVED' }
      : { tenantId, deletedAt: null };
    if (query && query !== '*') {
      // Original query + synonym expansions broaden the OR across every field.
      const terms = [query, ...synonymExtras];
      where.OR = terms.flatMap((term) => [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        // Subcategories are stored as a JSON array of slugs (e.g. home_chefs), so match the slug form.
        {
          subcategoryIds: {
            array_contains: [
              term
                .trim()
                .toLowerCase()
                .replace(/[\s-]+/g, '_'),
            ],
          },
        },
        { category: { is: { name: { contains: term, mode: 'insensitive' } } } },
        { branches: { some: { name: { contains: term, mode: 'insensitive' } } } },
        { offers: { some: { title: { contains: term, mode: 'insensitive' }, deletedAt: null } } },
        {
          offers: {
            some: { description: { contains: term, mode: 'insensitive' }, deletedAt: null },
          },
        },
        { businessTags: { some: { tag: { contains: term, mode: 'insensitive' } } } },
      ]);
    }
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters?.minRating) where.averageRating = { gte: filters.minRating };
    if (filters?.halal) where.halalStatus = 'HALAL';

    if (needsPostFilter) {
      const candidates = await this.db.business.findMany({
        where,
        take: 1000,
        orderBy: { averageRating: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      });
      const now = new Date();
      let pool: any[] = filters?.openNow
        ? candidates.filter(
            (b: any) => getOpenStatus(b.operatingHours as any, now)?.isOpen === true,
          )
        : candidates;
      pool = pool.map((b: any) => (isPublic ? toPublicBusiness(b) : b));
      if (filters?.fulfilment) {
        const withOffers = await this.attachOfferSummary(pool);
        pool = withOffers.filter(
          (b: any) =>
            Array.isArray(b.offerFulfilments) &&
            (b.offerFulfilments.includes(filters.fulfilment) ||
              b.offerFulfilments.includes('BOTH')),
        );
        const response = {
          data: pool.slice((page - 1) * limit, page * limit),
          meta: { total: pool.length, page, limit },
          source: 'postgres-filtered',
        };
        await this.redis.set(cacheKey, response, 120);
        return response;
      }
      const response = {
        data: await this.attachOfferSummary(pool.slice((page - 1) * limit, page * limit)),
        meta: { total: pool.length, page, limit },
        source: 'postgres-filtered',
      };
      await this.redis.set(cacheKey, response, 120);
      return response;
    }

    const [data, total] = await Promise.all([
      // tenant-scope-ok: public business search across all listings
      this.db.business.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { averageRating: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
        },
      }),
      // tenant-scope-ok: public business search across all listings
      this.db.business.count({ where }),
    ]);

    const strippedData = data.map((biz: any) => (isPublic ? toPublicBusiness(biz) : biz));

    const response = {
      data: await this.attachOfferSummary(strippedData),
      meta: { total, page, limit },
      source: 'postgres',
    };
    await this.redis.set(cacheKey, response, 300);
    return response;
  }

  /**
   * Geo-Search Implementation
   */
  async nearbyBusinesses(tenantId: string, lat: number, lng: number, radius: number, page = 1) {
    try {
      const searchParams = {
        q: '*',
        query_by: 'name',
        filter_by: `location:(${lat}, ${lng}, ${radius} mi)`,
        sort_by: `location(${lat}, ${lng}):asc`,
        page,
        per_page: 20,
      };

      const results = await this.typesenseService.search('businesses', searchParams);
      if (results && results.hits) {
        return {
          data: results.hits.map((h: any) => toPublicBusiness(h.document)),
          meta: { total: results.found, page },
          source: 'typesense',
        };
      }
    } catch (e) {
      this.logger.warn('Geo-search typesense failed, returning empty');
    }

    // Fallback: Haversine approximation in Postgres (simplified for MVP)
    return { data: [], meta: { total: 0, page }, source: 'fallback' };
  }

  /**
   * Basic Recommendation Engine (Highly Rated & Verified)
   */
  async getRecommendations(tenantId: string, userId: string) {
    const cacheKey = `recommendations:${tenantId}:${userId}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    // tenant-scope-ok: public business search across all listings
    const data = await this.db.business.findMany({
      where: { deletedAt: null },
      orderBy: [{ averageRating: 'desc' }, { totalReviews: 'desc' }],
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        city: true,
        averageRating: true,
        totalReviews: true,
        description: true,
        isVerified: true,
      },
    });

    await this.redis.set(cacheKey, data, 3600); // 1 hour TTL
    return data;
  }

  /**
   * Trending Engine (Cached heavily)
   */
  async getTrending(tenantId: string) {
    const cacheKey = `trending:${tenantId}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    // tenant-scope-ok: public business search across all listings
    const data = await this.db.business.findMany({
      where: { deletedAt: null },
      orderBy: [{ totalReviews: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        city: true,
        averageRating: true,
        totalReviews: true,
        isVerified: true,
      },
    });

    await this.redis.set(cacheKey, data, 1800); // 30 min TTL
    return data;
  }

  /**
   * Dispatch async indexing jobs
   */
  async indexBusiness(businessId: string, tenantId: string) {
    await this.searchQueue.add('sync-business', {
      action: 'INDEX',
      type: 'BUSINESS',
      id: businessId,
      tenantId,
    });
  }

  async removeFromIndex(businessId: string, tenantId: string) {
    await this.searchQueue.add('sync-business', {
      action: 'REMOVE',
      type: 'BUSINESS',
      id: businessId,
      tenantId,
    });
  }

  /**
   * Type-ahead suggestions — returns businesses, categories, and subcategories
   * matching the prefix query (minimum 2 characters).
   */
  async getSuggestions(tenantId: string, query: string): Promise<any> {
    if (!query || query.length < 2) return { businesses: [], categories: [], subcategories: [] };

    const cacheKey = `suggest:${tenantId}:${query.toLowerCase()}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const synonymExtras = this.expandSynonyms(query);
    const expandedQuery = synonymExtras.length ? `${query} ${synonymExtras.join(' ')}` : query;

    // Try Typesense first for fast prefix matching
    if (this.typesenseService.getEnabled()) {
      try {
        const res = await this.typesenseService.search('businesses', {
          q: expandedQuery,
          query_by: 'name,categoryName,subcategoryName,offerTitles,branchNames',
          per_page: 8,
          highlight_full_fields: 'name,categoryName',
        });
        if (res?.hits?.length) {
          const businesses = res.hits.map((h: any) => ({
            id: h.document.id,
            name: h.document.name,
            categoryName: h.document.categoryName,
            city: h.document.city,
          }));
          // Extract unique category/subcategory suggestions from hits
          const categoriesSet = new Set<string>();
          const subcategoriesSet = new Set<string>();
          for (const h of res.hits) {
            const doc = h.document as any;
            if (doc.categoryName) categoriesSet.add(doc.categoryName);
            if (doc.subcategoryName) subcategoriesSet.add(doc.subcategoryName);
          }
          const result = {
            businesses,
            categories: Array.from(categoriesSet).slice(0, 5),
            subcategories: Array.from(subcategoriesSet).slice(0, 5),
          };
          await this.redis.set(cacheKey, result, 60); // 1 min TTL for suggestions
          return result;
        }
      } catch (_) {
        /* fall through to Postgres */
      }
    }

    // Postgres fallback for suggestions
    const terms = [query, ...synonymExtras];
    const [businesses, categories] = await Promise.all([
      // tenant-scope-ok: public business search across all listings
      this.db.business.findMany({
        where: {
          deletedAt: null,
          OR: terms.flatMap((term) => [
            { name: { startsWith: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
            // Subcategories are stored as a JSON array of slugs (e.g. home_chefs), so match the slug form.
            {
              subcategoryIds: {
                array_contains: [
                  term
                    .trim()
                    .toLowerCase()
                    .replace(/[\s-]+/g, '_'),
                ],
              },
            },
            { businessTags: { some: { tag: { contains: term, mode: 'insensitive' } } } },
          ]),
        },
        select: { id: true, name: true, city: true, category: { select: { name: true } } },
        take: 8,
        orderBy: { averageRating: 'desc' },
      }),
      this.db.category.findMany({
        where: { OR: terms.map((term) => ({ name: { contains: term, mode: 'insensitive' } })) },
        select: { id: true, name: true },
        take: 5,
      }),
    ]);

    const result = {
      businesses: businesses.map((b: any) => ({
        id: b.id,
        name: b.name,
        categoryName: b.category?.name,
        city: b.city,
      })),
      categories: categories.map((c: any) => c.name),
      subcategories: [],
    };
    await this.redis.set(cacheKey, result, 60);
    return result;
  }
}
