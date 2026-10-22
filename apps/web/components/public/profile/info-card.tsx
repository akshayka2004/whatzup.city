'use client';

import { useI18n } from '@/lib/i18n/provider';

import type { ComponentType, ReactNode } from 'react';
import {
  Clock,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from 'lucide-react';
import { hasOperatingHours } from '@saas/types';
import { OpeningHoursCard } from '@/components/business/opening-hours-card';
import { Button } from '@/components/ui/button';
import { SectionCard } from './profile-ui';
import {
  addressOf,
  branchOf,
  ensureHttp,
  mapsSearchUrl,
  phoneOf,
  socialLinksOf,
  telHref,
  trackBizEvent,
  type SocialKind,
} from './profile-utils';

const SOCIAL_ICON: Record<SocialKind, ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  website: Globe,
};

function Row({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 text-sm text-foreground">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        <Icon className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}

/** Address, phone, social links, opening hours and the website button. */
export function InfoCard({ biz }: { biz: any }) {
  const { t } = useI18n();
  const branch = branchOf(biz);
  const address = addressOf(biz);
  const phone = phoneOf(biz);
  const socials = socialLinksOf(biz);
  const hasHours = hasOperatingHours(biz.operatingHours);

  return (
    <div className="space-y-4">
      {(address || phone || socials.length > 0) && (
        <SectionCard className="space-y-1">
          <h2 className="mb-2 text-base font-bold text-foreground">{t('biz.contactLocation')}</h2>
          {address && (
            <Row icon={MapPin}>
              <a
                href={mapsSearchUrl(address)}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {address}
              </a>
            </Row>
          )}
          {phone && (
            <Row icon={Phone}>
              <a
                href={telHref(phone)}
                className="text-foreground hover:text-primary hover:underline"
              >
                {phone}
              </a>
            </Row>
          )}
          {!hasHours && branch?.operatingHours && (
            <Row icon={Clock}>
              <span className="break-all">
                {typeof branch.operatingHours === 'string'
                  ? branch.operatingHours
                  : JSON.stringify(branch.operatingHours)}
              </span>
            </Row>
          )}
          {socials.map((s) => (
            <Row key={s.kind + s.href} icon={SOCIAL_ICON[s.kind]}>
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="break-all text-primary hover:underline"
              >
                {s.text}
              </a>
            </Row>
          ))}
        </SectionCard>
      )}

      {hasHours && <OpeningHoursCard hours={biz.operatingHours} collapsible />}

      {biz.website && (
        <Button asChild variant="outline" size="lg" className="ui-press w-full rounded-xl">
          <a
            href={ensureHttp(biz.website)}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackBizEvent(biz, 'WEBSITE_CLICK')}
          >
            <Globe /> {t('biz.visitWebsite')}
          </a>
        </Button>
      )}
    </div>
  );
}
