'use client';

import { useI18n } from '@/lib/i18n/provider';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { SectionHeading, SectionCard } from './profile-ui';
import { SectionSkeleton } from './profile-skeletons';

const HotelSection = dynamic(() => import('./hotel-section'), {
  loading: () => <SectionSkeleton rows={3} />,
});

const LONG_TEXT = 320;

export function hasAboutContent(biz: any): boolean {
  return (
    !!biz?.description ||
    !!biz?.hotelStarRating ||
    Object.values(biz?.hotelAmenities || {}).some((a: any) => a?.selected)
  );
}

export function AboutSection({ biz }: { biz: any }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const tags = useMemo(() => {
    const raw = [
      biz.category?.name,
      biz.subcategory,
      ...(Array.isArray(biz.tags) ? biz.tags : []),
    ].filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
    return Array.from(new Set(raw)).slice(0, 14);
  }, [biz.category?.name, biz.subcategory, biz.tags]);

  const hasHotel =
    !!biz.hotelStarRating || Object.values(biz.hotelAmenities || {}).some((a: any) => a?.selected);
  const description: string = biz.description || '';
  const long = description.length > LONG_TEXT;

  if (!hasAboutContent(biz)) return null;

  return (
    <section
      id="about"
      aria-label={t('biz.tab.about')}
      className="mb-6 scroll-mt-16 space-y-4 lg:col-start-1"
    >
      {description && (
        <SectionCard className="ui-fade-up">
          <SectionHeading title={t('biz.tab.about')} />
          <p
            className={
              'whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base' +
              (long && !expanded ? ' line-clamp-5' : '')
            }
          >
            {description}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-1 min-h-11 cursor-pointer text-sm font-semibold text-primary hover:underline"
            >
              {expanded ? t('biz.showLess') : t('biz.readMore')}
            </button>
          )}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </SectionCard>
      )}
      {hasHotel && <HotelSection biz={biz} />}
    </section>
  );
}
