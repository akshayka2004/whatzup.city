'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import type { Map as MlMap, Marker as MlMarker } from 'maplibre-gl';
import { cn } from '@/lib/utils';
import type { MapPoint } from './points';

/** OpenFreeMap vector tiles (OpenStreetMap data, no key). Attribution comes from the style. */
const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};
const KERALA: [number, number] = [76.27, 10.0];

function pinEl(p: MapPoint) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'map-pin';
  el.setAttribute('aria-label', p.label);
  const name = p.label.length > 18 ? `${p.label.slice(0, 17)}…` : p.label;
  el.textContent = p.rating ? `★ ${Number(p.rating).toFixed(1)} · ${name}` : name;
  return el;
}

/**
 * Interactive map of result pins. `activeId` highlights a pin (hovered/selected card);
 * clicking a pin reports it through `onSelect`. Bounds refit only when the result set
 * changes, never on hover, so the map doesn't jump around under the user.
 */
export function BusinessMap({
  points,
  activeId,
  onSelect,
  center,
  className,
}: {
  points: MapPoint[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  /** Viewer location, drawn as a dot when known. */
  center?: { lat: number; lng: number } | null;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef(new Map<string, MlMarker>());
  const me = useRef<MlMarker | null>(null);
  const lib = useRef<typeof import('maplibre-gl') | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { resolvedTheme } = useTheme();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ml = await import('maplibre-gl');
        if (!alive || !box.current) return;
        // Bundlers can't follow MapLibre's worker import; scripts/sync-maplibre.mjs serves it.
        ml.setWorkerUrl(`/vendor/maplibre/maplibre-gl-worker.mjs?v=${ml.getVersion()}`);
        lib.current = ml;
        const m = new ml.Map({
          container: box.current,
          style: resolvedTheme === 'dark' ? STYLE.dark : STYLE.light,
          center: KERALA,
          zoom: 7,
          attributionControl: false,
          cooperativeGestures: false,
        });
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        // Top-left keeps the OSM credit clear of the pinned preview card on phones.
        m.addControl(new ml.AttributionControl({ compact: true }), 'top-left');
        let loaded = false;
        m.on('load', () => {
          loaded = true;
          if (alive) setReady(true);
        });
        // Single tile errors are normal; only give up if the map never finishes loading.
        m.on('error', () => {
          setTimeout(() => {
            if (!loaded && alive) setFailed(true);
          }, 8000);
        });
        map.current = m;
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      alive = false;
      markers.current.forEach((mk) => mk.remove());
      markers.current.clear();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme switch swaps the basemap only.
  useEffect(() => {
    map.current?.setStyle(resolvedTheme === 'dark' ? STYLE.dark : STYLE.light);
  }, [resolvedTheme]);

  // Sync markers with points; refit when the set of ids changes.
  const idsKey = points.map((p) => p.id).join(',');
  useEffect(() => {
    const ml = lib.current;
    const m = map.current;
    if (!ml || !m || !ready) return;
    const keep = new Set(points.map((p) => p.id));
    markers.current.forEach((mk, id) => {
      if (!keep.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    });
    for (const p of points) {
      if (markers.current.has(p.id)) continue;
      const el = pinEl(p);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current?.(p.id);
      });
      markers.current.set(
        p.id,
        new ml.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(m),
      );
    }
    if (points.length === 1) m.easeTo({ center: [points[0].lng, points[0].lat], zoom: 14 });
    else if (points.length > 1) {
      const b = new ml.LngLatBounds();
      points.forEach((p) => b.extend([p.lng, p.lat]));
      if (center) b.extend([center.lng, center.lat]);
      m.fitBounds(b, { padding: 56, maxZoom: 15, duration: 500 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, ready]);

  // Viewer dot.
  useEffect(() => {
    const ml = lib.current;
    const m = map.current;
    if (!ml || !m || !ready) return;
    me.current?.remove();
    me.current = null;
    if (center) {
      const el = document.createElement('span');
      el.className = 'map-me';
      el.setAttribute('aria-label', 'You are here');
      me.current = new ml.Marker({ element: el }).setLngLat([center.lng, center.lat]).addTo(m);
    }
  }, [center, ready]);

  // Highlight.
  useEffect(() => {
    markers.current.forEach((mk, id) => {
      const el = mk.getElement();
      const on = id === activeId;
      el.classList.toggle('is-active', on);
      el.style.zIndex = on ? '2' : '';
    });
    if (activeId && map.current) {
      const mk = markers.current.get(activeId);
      if (mk && !map.current.getBounds().contains(mk.getLngLat()))
        map.current.panTo(mk.getLngLat());
    }
  }, [activeId, idsKey]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card border border-border bg-surface-sunken',
        className,
      )}
    >
      <div ref={box} className="h-full w-full" />
      {!ready && !failed && (
        <div className="ui-skeleton absolute inset-0 rounded-none" aria-hidden />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
          The map couldn’t load. The list still has every result.
        </div>
      )}
      {ready && points.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-card px-3 py-1.5 text-caption shadow-e2">
          None of these results have a map location yet
        </div>
      )}
    </div>
  );
}
