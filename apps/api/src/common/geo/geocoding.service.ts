import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

// Kerala, generously padded: results outside it are almost always a wrong match.
const KERALA = { minLat: 8.0, maxLat: 12.9, minLng: 74.7, maxLng: 77.6 };
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export function inKerala(lat: number, lng: number): boolean {
  return (
    lat >= KERALA.minLat && lat <= KERALA.maxLat && lng >= KERALA.minLng && lng <= KERALA.maxLng
  );
}

/** Address line Nominatim understands best: most specific first, country last. */
export function geocodeQuery(b: {
  address?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}): string | null {
  const parts = [b.address, b.city, b.district, b.zipCode, b.state || 'Kerala', 'India']
    .map((p) => (p || '').trim())
    .filter(Boolean);
  // Without an address or a city there is nothing reliable to look up.
  return b.address || b.city ? [...new Set(parts)].join(', ') : null;
}

/**
 * Fills in map coordinates for listings that have none, using OpenStreetMap's
 * Nominatim (usage policy: max 1 request/second, identifying User-Agent).
 * Best-effort: failures are logged, never thrown, and never block approval.
 * Set GEOCODING=off to disable.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  private get enabled() {
    return this.config.get<string>('GEOCODING') !== 'off';
  }

  /** Queue a lookup and return immediately. */
  geocodeBusinessInBackground(businessId: string): void {
    if (!this.enabled) return;
    this.chain = this.chain
      .then(() => this.geocodeBusiness(businessId))
      .then(() => new Promise((r) => setTimeout(r, 1100)))
      .catch(() => undefined);
  }

  /** Returns true when coordinates were written. */
  async geocodeBusiness(businessId: string): Promise<boolean> {
    const b = await this.db.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        address: true,
        district: true,
        city: true,
        state: true,
        zipCode: true,
        latitude: true,
        longitude: true,
      },
    });
    if (!b || (b.latitude != null && b.longitude != null)) return false;
    const q = geocodeQuery(b);
    if (!q) return false;
    try {
      const url = `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': this.config.get<string>('GEOCODING_USER_AGENT') || 'whtzup.city/1.0',
          'Accept-Language': 'en',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return false;
      const hits = (await res.json()) as Array<{ lat: string; lon: string }>;
      const lat = Number(hits?.[0]?.lat);
      const lng = Number(hits?.[0]?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inKerala(lat, lng)) return false;
      await this.db.business.update({
        where: { id: b.id },
        data: { latitude: lat, longitude: lng },
      });
      return true;
    } catch (err: any) {
      this.logger.warn(`Geocoding failed for ${b.id}: ${err?.message ?? err}`);
      return false;
    }
  }
}
