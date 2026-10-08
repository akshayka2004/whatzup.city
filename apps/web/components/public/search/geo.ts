/** Tiny geo helpers shared by the Nearby page and the business card. No map library. */

const R = 6371; // mean Earth radius, km

const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Coordinates of a business row, tolerating Decimal strings and Typesense `location: [lat, lng]`. */
export function businessCoords(b: any): { lat: number; lng: number } | null {
  let lat = b?.latitude;
  let lng = b?.longitude;
  if ((lat == null || lng == null) && Array.isArray(b?.location) && b.location.length === 2) {
    lat = b.location[0];
    lng = b.location[1];
  }
  if (lat == null || lng == null || lat === '' || lng === '') return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

/** Distance (km) from a point to a business, preferring the API's own `distanceKm`. */
export function distanceTo(b: any, from: { lat: number; lng: number }): number | null {
  const c = businessCoords(b);
  if (c) return haversineKm(from.lat, from.lng, c.lat, c.lng);
  const api = Number(b?.distanceKm);
  return Number.isFinite(api) && b?.distanceKm != null ? api : null;
}

/** "850 m" under 1 km, otherwise "1.2 km" ("12 km" from 10 km up). */
export function formatDistance(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '';
  if (km < 1) return `${Math.max(50, Math.round(km * 20) * 50)} m`;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}
