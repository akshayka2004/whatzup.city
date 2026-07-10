'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin, CheckCircle2, Tag, BadgeCheck } from 'lucide-react';
import { ReportButton } from './report-button';

/**
 * Rich public business card used on Browse (/category) and Nearby (/nearby).
 * Surfaces the details each owner provides: logo, category, rating, city,
 * short description, tags, and a food-only Halal badge. Includes a Report
 * control available to every visitor.
 */
export function BusinessCard({ business }: { business: any }) {
  const tags: string[] = Array.isArray(business.tags) ? business.tags : [];
  const isFood = /food|restaurant|cafe|bakery|hotel/i.test(
    business.category?.slug || business.category?.name || '',
  );
  const rating = business.avgRating ?? business.averageRating;
  const reviews = business.reviewCount ?? business.totalReviews ?? 0;

  return (
    <Card className="p-4 rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all border-border bg-card/60 backdrop-blur-xl flex flex-col">
      <div className="w-full h-40 rounded-xl mb-4 border border-border bg-gradient-to-br from-secondary/60 to-secondary/20 flex items-center justify-center overflow-hidden">
        {business.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logo} alt={business.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl font-extrabold text-muted-foreground/25">
            {(business.name || 'B').charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <h3 className="font-semibold text-foreground truncate">{business.name}</h3>
        {business.isVerified && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </span>
        )}
        {isFood && business.halalStatus === 'HALAL' && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[10px] font-semibold">
            <BadgeCheck className="h-3 w-3" />
            Halal
          </span>
        )}
      </div>

      {business.category?.name && (
        <p className="text-xs text-primary/80 font-medium mb-1 truncate">{business.category.name}</p>
      )}

      {business.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{business.description}</p>
      )}

      <div className="flex items-center gap-3 text-sm mb-2">
        <span className="inline-flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium text-foreground">{rating != null ? Number(rating).toFixed(1) : '—'}</span>
          <span className="text-muted-foreground text-xs">({reviews})</span>
        </span>
        {business.city && (
          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
            <MapPin className="h-3.5 w-3.5" />
            {business.city}
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 4).map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-secondary/70 border border-border text-[10px] text-muted-foreground">
              <Tag className="h-2.5 w-2.5" />
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <Link href={`/business/${business.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full rounded-xl border-border text-foreground hover:bg-secondary cursor-pointer">
            View Business
          </Button>
        </Link>
        <ReportButton kind="business" targetId={business.id} targetName={business.name} />
      </div>
    </Card>
  );
}
