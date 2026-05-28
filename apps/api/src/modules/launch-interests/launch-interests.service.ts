import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../common/database/database.service';

/**
 * Deduplication rules (case-insensitive):
 *   Business interests  → group by (lower(business_name), lower(contact_name)) keep latest
 *   Individual interests → group by (lower(name), lower(coalesce(phone,'')))  keep latest
 */
@Injectable()
export class LaunchInterestsService {
  constructor(private readonly db: DatabaseService) {}

  // ── BUSINESSES ──────────────────────────────────────────────

  async findBusinesses(params: { page?: number; limit?: number; search?: string }) {
    const page  = Math.max(1, Number(params.page)  || 1);
    const limit = Math.min(Number(params.limit) || 30, 100);
    const skip  = (page - 1) * limit;
    const q     = params.search?.trim() || null;

    // Shared FROM + WHERE clause (reused for data + count)
    const searchClause = q
      ? Prisma.sql`AND (
          deduped.business_name ILIKE ${`%${q}%`} OR
          deduped.contact_name  ILIKE ${`%${q}%`} OR
          deduped.email         ILIKE ${`%${q}%`} OR
          deduped.phone         ILIKE ${`%${q}%`} OR
          deduped.category      ILIKE ${`%${q}%`}
        )`
      : Prisma.empty;

    const from = Prisma.sql`
      FROM (
        SELECT DISTINCT ON (LOWER(business_name), LOWER(contact_name)) *
        FROM launch_business_interests
        ORDER BY LOWER(business_name), LOWER(contact_name), created_at DESC
      ) deduped
      WHERE 1=1 ${searchClause}
    `;

    const [rows, countRows] = await Promise.all([
      this.db.$queryRaw<any[]>(Prisma.sql`
        SELECT
          deduped.id,
          deduped.business_name AS "businessName",
          deduped.category,
          deduped.contact_name  AS "contactName",
          deduped.email,
          deduped.phone,
          deduped.website,
          deduped.notes,
          deduped.created_at    AS "createdAt"
        ${from}
        ORDER BY deduped.created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `),
      this.db.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count ${from}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows,
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

  // ── INDIVIDUALS ─────────────────────────────────────────────

  async findIndividuals(params: { page?: number; limit?: number; search?: string }) {
    const page  = Math.max(1, Number(params.page)  || 1);
    const limit = Math.min(Number(params.limit) || 30, 100);
    const skip  = (page - 1) * limit;
    const q     = params.search?.trim() || null;

    const searchClause = q
      ? Prisma.sql`AND (
          deduped.name  ILIKE ${`%${q}%`} OR
          deduped.email ILIKE ${`%${q}%`} OR
          deduped.phone ILIKE ${`%${q}%`}
        )`
      : Prisma.empty;

    const from = Prisma.sql`
      FROM (
        SELECT DISTINCT ON (LOWER(name), LOWER(COALESCE(phone, ''))) *
        FROM launch_individual_interests
        ORDER BY LOWER(name), LOWER(COALESCE(phone, '')), created_at DESC
      ) deduped
      WHERE 1=1 ${searchClause}
    `;

    const [rows, countRows] = await Promise.all([
      this.db.$queryRaw<any[]>(Prisma.sql`
        SELECT
          deduped.id,
          deduped.name,
          deduped.email,
          deduped.phone,
          deduped.interests,
          deduped.created_at AS "createdAt"
        ${from}
        ORDER BY deduped.created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `),
      this.db.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count ${from}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows,
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

  // ── STATS ────────────────────────────────────────────────────

  async getStats() {
    const [bizRows, indRows] = await Promise.all([
      this.db.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT ON (LOWER(business_name), LOWER(contact_name)) id
          FROM launch_business_interests
          ORDER BY LOWER(business_name), LOWER(contact_name), created_at DESC
        ) deduped
      `),
      this.db.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT ON (LOWER(name), LOWER(COALESCE(phone, ''))) id
          FROM launch_individual_interests
          ORDER BY LOWER(name), LOWER(COALESCE(phone, '')), created_at DESC
        ) deduped
      `),
    ]);

    const businesses = Number(bizRows[0]?.count ?? 0);
    const individuals = Number(indRows[0]?.count ?? 0);
    return { businesses, individuals, total: businesses + individuals };
  }
}
