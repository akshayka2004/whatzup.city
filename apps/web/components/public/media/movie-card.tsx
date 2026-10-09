'use client';

import { Calendar, Clapperboard, Clock, Info, PlayCircle, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { cn } from '@/lib/utils';
import { fmtDateIST, fmtDuration, withProtocol } from './format';

export interface Movie {
  id: string;
  name: string;
  posterImage?: string | null;
  languages?: string[];
  genres?: string[];
  durationMinutes?: number | null;
  certification?: string | null;
  releaseDate?: string | null;
  synopsis?: string | null;
  cast?: string[];
  status: string;
  trailerUrl?: string | null;
  bookingUrl?: string | null;
}

export const STATUS_LABEL: Record<string, string> = {
  NOW_SHOWING: 'Now Showing',
  UPCOMING: 'Upcoming',
  ENDED: 'Ended',
};

export function MovieCard({
  m,
  onView,
  priority,
}: {
  m: Movie;
  onView: (m: Movie) => void;
  priority?: boolean;
}) {
  const langs = Array.isArray(m.languages) ? m.languages : [];
  const genres = Array.isArray(m.genres) ? m.genres.slice(0, 2) : [];
  const duration = fmtDuration(m.durationMinutes);
  const showRelease = m.status === 'UPCOMING' && !!m.releaseDate;

  return (
    <article className="ui-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => onView(m)}
        aria-label={`View details for ${m.name}`}
        className="relative block w-full cursor-pointer text-left"
      >
        <ResponsiveImage
          src={m.posterImage}
          alt={m.name}
          ratio="2 / 3"
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          fallback={<Clapperboard className="h-10 w-10 opacity-40" />}
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
        />
        <span
          className={cn(
            'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold',
            m.status === 'NOW_SHOWING'
              ? 'bg-success text-success-foreground'
              : 'bg-primary text-primary-foreground',
          )}
        >
          {STATUS_LABEL[m.status] || m.status}
        </span>
        {m.certification && (
          <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-white">
            {m.certification}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 break-words text-sm font-semibold leading-tight text-foreground">
          {m.name}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          {langs.slice(0, 3).map((l) => (
            <span
              key={l}
              className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-soft-foreground"
            >
              {l}
            </span>
          ))}
          {langs.length > 3 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              +{langs.length - 3}
            </span>
          )}
          {genres.map((g) => (
            <span
              key={g}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
            >
              {g}
            </span>
          ))}
          {duration && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {duration}
            </span>
          )}
        </div>

        {showRelease && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" /> Releases {fmtDateIST(m.releaseDate)}
          </p>
        )}

        <div className="mt-auto grid gap-2 pt-3">
          {m.bookingUrl && (
            <Button
              asChild
              size="sm"
              className="ui-press h-11 w-full cursor-pointer gap-1.5 rounded-xl bg-primary font-semibold text-primary-foreground"
            >
              <a href={withProtocol(m.bookingUrl)} target="_blank" rel="noopener noreferrer">
                <Ticket className="h-3.5 w-3.5" /> Book
              </a>
            </Button>
          )}
          <div className={cn('grid gap-2', m.trailerUrl ? 'grid-cols-2' : 'grid-cols-1')}>
            <Button
              onClick={() => onView(m)}
              size="sm"
              variant="outline"
              className="ui-press h-11 cursor-pointer gap-1.5 rounded-xl border-border px-2 text-foreground hover:bg-secondary"
            >
              <Info className="h-3.5 w-3.5" /> Details
            </Button>
            {m.trailerUrl && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="ui-press h-11 cursor-pointer gap-1.5 rounded-xl border-primary/30 px-2 text-primary hover:bg-primary/10"
              >
                <a href={withProtocol(m.trailerUrl)} target="_blank" rel="noopener noreferrer">
                  <PlayCircle className="h-3.5 w-3.5" /> Trailer
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
