'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { MOVIES_ENABLED } from '@/lib/feature-flags';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Clapperboard } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES, getViewerCity, setViewerCity } from '@/lib/constants';
import { MovieCard, type Movie } from '@/components/public/media/movie-card';
import { ChipRow, type ChipOption } from '@/components/public/media/filter-chips';
import { GridItem } from '@/components/public/media/grid-item';
import { MovieGridSkeleton } from '@/components/public/media/media-skeletons';

// Only needed once a poster is tapped, so keep it out of the first bundle.
const MovieDetailsModal = dynamic(
  () => import('@/components/public/media/movie-details-modal').then((m) => m.MovieDetailsModal),
  { ssr: false },
);

/** Same list-shape handling the page has always used for GET /v1/movies. */
function extractList(body: any): Movie[] {
  const list = Array.isArray(body) ? body : (body?.data ?? []);
  return Array.isArray(list) ? list : [];
}

/** "All" plus every distinct value found in the loaded movies. */
function chipsFrom(allLabel: string, values: string[]): ChipOption<string>[] {
  const uniq = Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  return [{ value: '', label: allLabel }, ...uniq.map((v) => ({ value: v, label: v }))];
}

export function MoviesClient({ initialMovies = null }: { initialMovies?: unknown | null }) {
  if (!MOVIES_ENABLED) notFound();
  // The server renders the default list (all cities, any status); it stays valid until a filter is chosen.
  const seeded = useRef(initialMovies != null);
  const [movies, setMovies] = useState<Movie[]>(() =>
    initialMovies != null ? extractList(initialMovies) : [],
  );
  const [loading, setLoading] = useState(initialMovies == null);
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [language, setLanguage] = useState('');
  const [genre, setGenre] = useState('');
  const [viewing, setViewing] = useState<Movie | null>(null);

  useEffect(() => {
    const stored = getViewerCity();
    if (stored) {
      setLoading(true); // the seeded list is for all cities — don't flash it for a viewer with a saved city
      setCity(stored);
    }
  }, []);

  useEffect(() => {
    if (seeded.current && !city && !status) return;
    seeded.current = false;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (status) params.set('status', status);
    apiService
      .get<any>(`/v1/movies${params.toString() ? `?${params.toString()}` : ''}`)
      .then((res) => {
        if (cancelled) return;
        setMovies(res.error ? [] : extractList(res.data));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, status]);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  const languageChips = useMemo(
    () =>
      chipsFrom(
        'All languages',
        movies.flatMap((m) => (Array.isArray(m.languages) ? m.languages : [])),
      ),
    [movies],
  );
  const genreChips = useMemo(
    () =>
      chipsFrom(
        'All genres',
        movies.flatMap((m) => (Array.isArray(m.genres) ? m.genres : [])),
      ),
    [movies],
  );
  // A selection that vanished after a refetch (other city / status) quietly counts as "All".
  const activeLanguage = languageChips.some((c) => c.value === language) ? language : '';
  const activeGenre = genreChips.some((c) => c.value === genre) ? genre : '';

  const visibleMovies = useMemo(
    () =>
      movies.filter(
        (m) =>
          (!activeLanguage ||
            (Array.isArray(m.languages) && m.languages.includes(activeLanguage))) &&
          (!activeGenre || (Array.isArray(m.genres) && m.genres.includes(activeGenre))),
      ),
    [movies, activeLanguage, activeGenre],
  );

  const filtered = activeLanguage !== '' || activeGenre !== '';

  return (
    <PublicLayout>
      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">Movies</h1>
        <p className="mb-5 text-muted-foreground">What's showing and what's coming soon.</p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:flex">
          <Select value={city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger className="w-full rounded-xl data-[size=default]:h-11 sm:w-52">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {KERALA_CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full rounded-xl data-[size=default]:h-11 sm:w-44">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="NOW_SHOWING">Now Showing</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!loading && (languageChips.length > 2 || genreChips.length > 2) && (
          <div className="mb-4 space-y-2">
            {languageChips.length > 2 && (
              <ChipRow
                options={languageChips}
                value={activeLanguage}
                onChange={setLanguage}
                ariaLabel="Language"
              />
            )}
            {genreChips.length > 2 && (
              <ChipRow
                options={genreChips}
                value={activeGenre}
                onChange={setGenre}
                ariaLabel="Genre"
              />
            )}
          </div>
        )}

        {loading ? (
          <MovieGridSkeleton />
        ) : visibleMovies.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={Clapperboard}
              title="No movies match these filters"
              description="Try another language or genre."
              action={{
                label: 'Clear filters',
                onClick: () => {
                  setLanguage('');
                  setGenre('');
                },
              }}
            />
          ) : (
            <EmptyState
              icon={Clapperboard}
              title="No movies listed"
              description="Check back soon."
            />
          )
        ) : (
          <div className="ui-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {visibleMovies.map((m, i) => (
              <GridItem key={m.id} intrinsicHeight={460}>
                <MovieCard m={m} onView={setViewing} priority={i < 2} />
              </GridItem>
            ))}
          </div>
        )}
      </div>

      {viewing && <MovieDetailsModal movie={viewing} onClose={() => setViewing(null)} />}
    </PublicLayout>
  );
}
