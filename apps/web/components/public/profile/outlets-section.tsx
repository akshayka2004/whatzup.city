'use client';

import { Building2, Clock, MapPin, Navigation, Phone } from 'lucide-react';
import { OtherOutlets } from '@/components/business/brand-public-section';
import { Button } from '@/components/ui/button';
import { SectionCard, SectionHeading } from './profile-ui';
import { directionsUrl, telHref } from './profile-utils';

/** A listing's extra branch rows are only worth a section when there is more than one. */
export function hasBranchList(biz: any): boolean {
  return Array.isArray(biz?.branches) && biz.branches.length > 1;
}

export function OutletsSection({ biz, businessId }: { biz: any; businessId: string }) {
  const branches: any[] = hasBranchList(biz) ? biz.branches : [];

  return (
    <section id="outlets" aria-label="Outlets" className="mb-6 scroll-mt-16 space-y-6 lg:col-start-1">
      {branches.length > 0 && (
        <SectionCard>
          <SectionHeading icon={Building2} title="Branches" hint={`${branches.length} locations`} />
          <ul className="space-y-3">
            {branches.map((b, i) => {
              const addr = [b.address, b.city, b.state].filter(Boolean).join(', ');
              const dir = directionsUrl(biz, b);
              return (
                <li
                  key={b.id || i}
                  className="ui-fade-up ui-cv-auto rounded-xl border border-border bg-secondary/40 p-3"
                  style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                >
                  <p className="font-semibold text-foreground">{b.name}</p>
                  {addr && (
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{addr}</span>
                    </p>
                  )}
                  {typeof b.operatingHours === 'string' && b.operatingHours && (
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{b.operatingHours}</span>
                    </p>
                  )}
                  {(b.phone || dir) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {b.phone && (
                        <Button asChild variant="outline" size="lg" className="ui-press rounded-xl">
                          <a href={telHref(b.phone)}>
                            <Phone /> Call
                          </a>
                        </Button>
                      )}
                      {dir && (
                        <Button asChild variant="outline" size="lg" className="ui-press rounded-xl">
                          <a href={dir} target="_blank" rel="noreferrer">
                            <Navigation /> Directions
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {biz.brandId && <OtherOutlets brandId={biz.brandId} currentBusinessId={biz.id || businessId} />}
    </section>
  );
}
