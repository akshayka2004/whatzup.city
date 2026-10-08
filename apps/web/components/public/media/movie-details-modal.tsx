'use client';

import { useEffect, useRef } from 'react';
import { Calendar, Clapperboard, Clock, PlayCircle, Ticket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { cn } from '@/lib/utils';
import { fmtDateIST, fmtDuration, withProtocol } from './format';
import { STATUS_LABEL, type Movie } from './movie-card';

/** Bottom sheet on phones, centred dialog on larger screens. Esc / backdrop / X all close it. */
export function MovieDetailsModal({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const langs = Array.isArray(movie.languages) ? movie.languages : [];
  const genres = Array.isArray(movie.genres) ? movie.genres : [];
  const cast = Array.isArray(movie.cast) ? movie.cast : [];
  const duration = fmtDuration(movie.durationMinutes);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={movie.name}
        className="ui-fade-up relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ui-press absolute right-3 top-3 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-6">
          <div className="flex gap-4 pr-10">
            <ResponsiveImage
              src={movie.posterImage}
              alt={movie.name}
              ratio="2 / 3"
              sizes="112px"
              className="w-24 shrink-0 rounded-xl sm:w-28"
              fallback={<Clapperboard className="h-8 w-8 opacity-40" />}
            />
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-xl font-bold text-foreground">{movie.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-bold',
                    movie.status === 'NOW_SHOWING' ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary',
                  )}
                >
                  {STATUS_LABEL[movie.status] || movie.status}
                </span>
                {movie.certification && (
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-bold">{movie.certification}</span>
                )}
                {duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {duration}
                  </span>
                )}
              </div>
              {langs.length > 0 && <p className="mt-2 break-words text-xs text-muted-foreground">{langs.join(', ')}</p>}
              {movie.releaseDate && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {fmtDateIST(movie.releaseDate)}
                </p>
              )}
            </div>
          </div>

          {genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {genres.map((g, i) => (
                <span key={i} className="break-words rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {g}
                </span>
              ))}
            </div>
          )}

          {movie.synopsis && (
            <p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground">{movie.synopsis}</p>
          )}

          {cast.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-foreground">Cast</p>
              <p className="break-words text-xs text-muted-foreground">{cast.join(', ')}</p>
            </div>
          )}

          {(movie.trailerUrl || movie.bookingUrl) && (
            <div className="mt-5 flex gap-2">
              {movie.trailerUrl && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="ui-press h-11 flex-1 cursor-pointer gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                >
                  <a href={withProtocol(movie.trailerUrl)} target="_blank" rel="noopener noreferrer">
                    <PlayCircle className="h-3.5 w-3.5" /> Trailer
                  </a>
                </Button>
              )}
              {movie.bookingUrl && (
                <Button
                  asChild
                  size="sm"
                  className="ui-press h-11 flex-1 cursor-pointer gap-1.5 rounded-xl bg-primary font-semibold text-primary-foreground"
                >
                  <a href={withProtocol(movie.bookingUrl)} target="_blank" rel="noopener noreferrer">
                    <Ticket className="h-3.5 w-3.5" /> Book
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
