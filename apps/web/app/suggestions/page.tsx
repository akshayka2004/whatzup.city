'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Lightbulb, Loader2 } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeader } from '@/components/system/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { SUGGESTION_TOPICS } from '@/lib/suggestions';

const MIN = 10;
const MAX = 2000;

/** Where the person came from on this site (a path), so the team knows what they were looking at. */
function cameFrom(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const u = new URL(document.referrer);
    return u.origin === window.location.origin && u.pathname !== '/suggestions'
      ? u.pathname.slice(0, 200)
      : undefined;
  } catch {
    return undefined;
  }
}

/** The suggestion box: any signed-in person tells the platform team what to improve. */
export default function SuggestionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [topic, setTopic] = useState<string>('GENERAL');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [thanks, setThanks] = useState('');

  const length = message.trim().length;
  const ready = length >= MIN && length <= MAX;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    const res = await apiService.post<{ id: string; thanks: string }>('/v1/suggestions', {
      topic,
      message: message.trim(),
      page: cameFrom(),
    });
    setBusy(false);
    if (res.error || !res.data) {
      setError(res.error || 'We could not send that. Please try again.');
      return;
    }
    setThanks(res.data.thanks);
  };

  const again = () => {
    setThanks('');
    setMessage('');
    setTopic('GENERAL');
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-xl space-y-6 py-2">
        <PageHeader
          title="Suggestion box"
          description="Tell the Whtzup.city team what we could add or do better. We read every one."
        />

        {authLoading ? (
          <Loader2
            className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        ) : !user ? (
          <EmptyState
            icon={Lightbulb}
            title="Sign in to send a suggestion"
            description="It only takes a moment, and it lets us thank you."
            action={{
              label: 'Sign in',
              href: `/login?redirect=${encodeURIComponent('/suggestions')}`,
            }}
          />
        ) : thanks ? (
          <Card
            className="rounded-card p-8 text-center"
            role="status"
            aria-live="polite"
            data-testid="suggestion-thanks"
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
              <CheckCircle2 className="size-7" aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-bold text-foreground">Thank you!</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{thanks}</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Button onClick={again} className="min-h-11">
                Send another
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={send}>
            <Card className="space-y-5 rounded-card p-5 sm:p-6">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">What is it about?</legend>
                <ChipRow wrap>
                  {SUGGESTION_TOPICS.map((t) => (
                    <FilterChip
                      key={t.value}
                      selected={topic === t.value}
                      onClick={() => setTopic(t.value)}
                    >
                      {t.label}
                    </FilterChip>
                  ))}
                </ChipRow>
              </fieldset>

              <div className="space-y-1.5">
                <label htmlFor="suggestion" className="text-sm font-medium text-foreground">
                  Your suggestion
                </label>
                <textarea
                  id="suggestion"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={MAX + 200}
                  placeholder="For example: it would help if I could save events to my calendar from the list page."
                  className="w-full rounded-control border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                />
                <p
                  className={`text-xs ${length > MAX ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {length < MIN
                    ? `A sentence or two is plenty (at least ${MIN} characters).`
                    : `${length} of ${MAX} characters`}
                </p>
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!ready}>
                Send suggestion
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                The team sees your name with it. For a problem with an order, bill or listing, use{' '}
                <Link href="/support" className="text-primary hover:underline">
                  Help &amp; support
                </Link>{' '}
                instead.
              </p>
            </Card>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}
