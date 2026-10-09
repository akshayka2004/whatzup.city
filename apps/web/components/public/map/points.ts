export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  rating?: number | null;
};

/** Results with usable coordinates, as map pins. Kept apart so callers skip the MapLibre bundle. */
export function pointsFrom(items: any[]): MapPoint[] {
  const out: MapPoint[] = [];
  for (const b of items) {
    const lat = Number(b?.latitude ?? b?.lat);
    const lng = Number(b?.longitude ?? b?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
    const r = Number(b.avgRating ?? b.averageRating);
    out.push({ id: b.id, lat, lng, label: b.name || 'Business', rating: r > 0 ? r : null });
  }
  return out;
}
