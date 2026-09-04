'use client';

import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Clapperboard, Clock, PlayCircle, Ticket, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES, getViewerCity, setViewerCity } from '@/lib/constants';

interface Movie {
  id: string;
  name: string;
  posterImage?: string | null;
  language?: string | null;
  genres?: string[];
  durationMinutes?: number | null;
  certification?: string | null;
  releaseDate?: string | null;
  status: string;
  trailerUrl?: string | null;
  bookingUrl?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  NOW_SHOWING: 'Now Showing',
  UPCOMING: 'Upcoming',
  ENDED: 'Ended',
};

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setCity(getViewerCity());
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (status) params.set('status', status);
    apiService
      .get<any>(`/v1/movies${params.toString() ? `?${params.toString()}` : ''}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setMovies(res.error ? [] : list);
      })
      .finally(() => setLoading(false));
  }, [city, status]);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  return (
    <PublicLayout>
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Movies</h1>
        <p className="text-muted-foreground mb-6">What's showing and what's coming soon.</p>

        <div className="mb-8 flex flex-wrap gap-3">
          <Select value={city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger className="w-52 rounded-xl">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {KERALA_CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44 rounded-xl">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="NOW_SHOWING">Now Showing</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : movies.length === 0 ? (
          <div className="p-12 rounded-2xl text-center border border-dashed border-border bg-secondary">
            <Clapperboard className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-foreground mb-1">No movies listed</h3>
            <p className="text-sm text-muted-foreground">Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {movies.map((m) => (
              <div
                key={m.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-secondary">
                  {m.posterImage ? (
                    <img
                      src={m.posterImage}
                      alt={m.name}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Clapperboard className="h-10 w-10 text-muted-foreground opacity-40" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.status === 'NOW_SHOWING' ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground'}`}>
                    {STATUS_LABEL[m.status] || m.status}
                  </span>
                  {m.certification && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white">
                      {m.certification}
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">{m.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                    {m.language && <span>{m.language}</span>}
                    {Array.isArray(m.genres) && m.genres.length > 0 && <span>• {m.genres.slice(0, 2).join(', ')}</span>}
                    {m.durationMinutes && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.durationMinutes}m</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {m.trailerUrl && (
                      <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5 cursor-pointer">
                        <a href={m.trailerUrl.startsWith('http') ? m.trailerUrl : `https://${m.trailerUrl}`} target="_blank" rel="noopener noreferrer">
                          <PlayCircle className="h-3.5 w-3.5" /> Trailer
                        </a>
                      </Button>
                    )}
                    {m.bookingUrl && (
                      <Button asChild size="sm" className="flex-1 rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5 cursor-pointer">
                        <a href={m.bookingUrl.startsWith('http') ? m.bookingUrl : `https://${m.bookingUrl}`} target="_blank" rel="noopener noreferrer">
                          <Ticket className="h-3.5 w-3.5" /> Book
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
