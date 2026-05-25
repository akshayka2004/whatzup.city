import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * Resolves a tenant identifier to the actual tenant UUID.
 *
 * Public endpoints accept `tenantId` as a query param with default `'default'`.
 * That literal string is the slug of the default tenant, not its UUID — so a
 * direct `where: { tenantId: 'default' }` lookup returns zero rows.
 *
 * This resolver:
 *   - Looks up tenant by slug if input is not a UUID (or is `'default'`)
 *   - Caches the resolved UUID in-memory for the process lifetime
 *   - Returns the input unchanged if it already looks like a UUID
 */
@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);
  private readonly cache = new Map<string, string>();

  // UUID v1-v5 pattern (with or without dashes)
  private static readonly UUID_RX =
    /^[0-9a-f]{8}-?[0-9a-f]{4}-?[1-5][0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}$/i;

  constructor(private readonly db: DatabaseService) {}

  /**
   * Resolve the given tenant identifier to a tenant UUID.
   * If `input` is already a UUID, returns it unchanged.
   * Otherwise treats input as a slug and resolves to tenant.id.
   * Falls back to the default-tenant UUID when slug not found.
   */
  async resolveTenantId(input?: string | null): Promise<string> {
    const key = input || 'default';

    // Already a UUID — return as-is
    if (TenantResolverService.UUID_RX.test(key)) return key;

    // Check cache
    const cached = this.cache.get(key);
    if (cached) return cached;

    // Resolve from DB by slug
    let tenant = await this.db.tenant.findUnique({ where: { slug: key } });

    // Fallback: try default tenant
    if (!tenant && key !== 'default') {
      tenant = await this.db.tenant.findUnique({ where: { slug: 'default' } });
    }

    if (!tenant) {
      this.logger.warn(`No tenant found for slug "${key}" and no default tenant exists`);
      return key; // last-resort fallback — will return empty results, but won't crash
    }

    this.cache.set(key, tenant.id);
    return tenant.id;
  }
}
