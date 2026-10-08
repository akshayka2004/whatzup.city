'use client';

import { Check, Heart, MessageCircle, Navigation, Phone, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProfileActions } from './use-profile-actions';

/** Header buttons for tablet / desktop. Same save + share logic as the mobile bar. */
export function DesktopActions({ actions, className }: { actions: ProfileActions; className?: string }) {
  const { callHref, directionsHref, whatsappHref, isSaved, copied } = actions;
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {callHref && (
        <Button asChild size="lg" className="ui-press rounded-xl">
          <a href={callHref} onClick={actions.onCall}>
            <Phone /> Call
          </a>
        </Button>
      )}
      {directionsHref && (
        <Button asChild variant="outline" size="lg" className="ui-press rounded-xl">
          <a href={directionsHref} target="_blank" rel="noreferrer" onClick={actions.onDirections}>
            <Navigation /> Directions
          </a>
        </Button>
      )}
      {whatsappHref && (
        <Button asChild variant="outline" size="lg" className="ui-press rounded-xl">
          <a href={whatsappHref} target="_blank" rel="noreferrer" onClick={actions.onWhatsapp}>
            <MessageCircle /> WhatsApp
          </a>
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={actions.toggleSave}
        aria-pressed={isSaved}
        title={isSaved ? 'Remove from favorites' : 'Save to favorites'}
        className={cn('ui-press rounded-xl', isSaved && 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15')}
      >
        <Heart className={cn(isSaved && 'fill-primary text-primary')} /> {isSaved ? 'Saved' : 'Save'}
      </Button>
      <Button type="button" variant="outline" size="lg" onClick={actions.share} className="ui-press rounded-xl">
        {copied ? <Check className="ui-pop" /> : <Share2 />} {copied ? 'Link copied' : 'Share'}
      </Button>
    </div>
  );
}

const barBtn =
  'ui-press flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-xs font-semibold leading-tight text-foreground transition-colors hover:bg-secondary';

/**
 * Phone-only sticky action bar. Sits directly above the fixed bottom nav
 * (h-16), hence bottom-16; hidden from md up where the header buttons take over.
 */
export function MobileActionBar({ actions }: { actions: ProfileActions }) {
  const { callHref, directionsHref, whatsappHref, isSaved, copied } = actions;
  return (
    <div
      role="toolbar"
      aria-label="Business actions"
      className="fixed inset-x-0 bottom-16 z-30 flex gap-1 border-t border-border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-md md:hidden"
    >
      {callHref && (
        <a
          href={callHref}
          onClick={actions.onCall}
          className={cn(barBtn, 'bg-primary text-primary-foreground hover:bg-primary/90')}
        >
          <Phone className="h-5 w-5" />
          Call
        </a>
      )}
      {directionsHref && (
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          onClick={actions.onDirections}
          className={cn(barBtn, !callHref && 'bg-primary text-primary-foreground hover:bg-primary/90')}
        >
          <Navigation className="h-5 w-5" />
          Directions
        </a>
      )}
      {whatsappHref && (
        <a href={whatsappHref} target="_blank" rel="noreferrer" onClick={actions.onWhatsapp} className={barBtn}>
          <MessageCircle className="h-5 w-5" />
          WhatsApp
        </a>
      )}
      <button
        type="button"
        onClick={actions.toggleSave}
        aria-pressed={isSaved}
        className={cn(barBtn, 'cursor-pointer', isSaved && 'text-primary')}
      >
        <Heart className={cn('h-5 w-5', isSaved && 'fill-primary text-primary')} />
        {isSaved ? 'Saved' : 'Save'}
      </button>
      <button type="button" onClick={actions.share} className={cn(barBtn, 'cursor-pointer')}>
        {copied ? <Check className="ui-pop h-5 w-5 text-success" /> : <Share2 className="h-5 w-5" />}
        {copied ? 'Copied' : 'Share'}
      </button>
    </div>
  );
}
