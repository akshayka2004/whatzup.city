'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Printer,
  ScanLine,
  ShieldOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useConfirm } from '@/components/common/confirm-dialog';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import { SITE_URL } from '@/lib/site-url';
import type { CrewPass } from '@/lib/event-host';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<CrewPass['status'], string> = {
  ACTIVE: 'bg-success-soft text-success-soft-foreground',
  UPCOMING: 'bg-info-soft text-info-soft-foreground',
  EXPIRED: 'bg-muted text-muted-foreground',
  REVOKED: 'bg-danger-soft text-danger-soft-foreground',
};

export function CrewTab({ eventId }: { eventId: string }) {
  const confirm = useConfirm();
  const [passes, setPasses] = useState<CrewPass[] | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'count' | 'names' | 'one'>('count');
  // One volunteer: the details a host keeps on the pass.
  const [vName, setVName] = useState('');
  const [vPlace, setVPlace] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vEmail, setVEmail] = useState('');
  // Editing a pass that already exists.
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    label: '',
    place: '',
    phone: '',
    email: '',
    level: 'SCAN' as 'SCAN' | 'DESK',
    maxDevices: '2',
  });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState('3');
  const [prefix, setPrefix] = useState('Gate');
  const [names, setNames] = useState('');
  const [level, setLevel] = useState<'SCAN' | 'DESK'>('SCAN');
  const [devices, setDevices] = useState('2');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    const res = await apiService.get<CrewPass[]>(`/v1/events/${eventId}/host/crew`, {
      fresh: true,
    });
    if (res.error) setError(res.error);
    else {
      setError('');
      setPasses(res.data);
    }
  }, [eventId]);

  useEffect(() => {
    load();
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(), 15_000);
    return () => window.clearInterval(t);
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const labels = names
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (mode === 'one' && !vName.trim()) {
      setBusy(false);
      return toast.error("Enter the helper's name.");
    }
    const res = await apiService.post<CrewPass[]>(`/v1/events/${eventId}/host/crew`, {
      ...(mode === 'names'
        ? { labels }
        : mode === 'one'
          ? {
              labels: [vName.trim()],
              place: vPlace.trim(),
              phone: vPhone.trim(),
              email: vEmail.trim(),
            }
          : { count: Number(count) || 1, prefix }),
      level,
      maxDevices: Number(devices) || 2,
    });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`${res.data.length} pass${res.data.length === 1 ? '' : 'es'} created.`);
    setNames('');
    setVName('');
    setVPlace('');
    setVPhone('');
    setVEmail('');
    load();
  };

  const startEdit = (p: CrewPass) => {
    setEditId(p.id);
    setEditError('');
    setDraft({
      label: p.label,
      place: p.place ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      level: p.level,
      maxDevices: String(p.maxDevices),
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    if (!draft.label.trim()) return setEditError("Enter the helper's name.");
    setSaving(true);
    setEditError('');
    const res = await apiService.patch<CrewPass>(`/v1/events/${eventId}/host/crew/${editId}`, {
      label: draft.label.trim(),
      place: draft.place.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      level: draft.level,
      maxDevices: Number(draft.maxDevices) || 2,
    });
    setSaving(false);
    if (res.error) return setEditError(res.error);
    toast.success('Helper updated.');
    setEditId(null);
    load();
  };

  const revoke = async (p: CrewPass) => {
    const ok = await confirm({
      title: `Stop ${p.label}'s pass?`,
      description:
        'Their phone is signed out within seconds and the code stops working. You can make a new pass any time.',
      confirmLabel: 'Stop pass',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await apiService.post(`/v1/events/${eventId}/host/crew/${p.id}/revoke`, {});
    if (res.error) toast.error(res.error);
    else {
      toast.success(`${p.label}'s pass stopped.`);
      load();
    }
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      toast.error('Could not copy. Select the text and copy it by hand.');
    }
  };

  const link = (p: CrewPass) => `${SITE_URL}/scan?c=${p.code}`;
  const live = (passes ?? []).filter((p) => p.status === 'ACTIVE' || p.status === 'UPCOMING');

  return (
    <div className="space-y-6">
      <Card className="rounded-card p-5">
        <h3 className="mb-1 flex items-center gap-2 font-semibold">
          <ScanLine className="size-4 text-primary" aria-hidden /> Gate helpers
        </h3>
        <p className="text-sm text-muted-foreground">
          A gate helper is someone who checks tickets at the door. Make one pass for each helper.
          They scan on their own phone and do not need an account.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Make a pass for each helper below.</li>
          <li>Send each helper their code or link, or print the sheet.</li>
          <li>The helper opens the scanner on their phone, types the code and scans tickets.</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          A pass only works for this event. It stops when check-in ends, or when you stop it.
        </p>
        <form onSubmit={create} className="mt-4 space-y-4">
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="How to make the passes"
          >
            {(['count', 'names', 'one'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'min-h-9 cursor-pointer rounded-full border px-3.5 text-sm',
                  mode === m
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'border-input text-muted-foreground',
                )}
              >
                {m === 'count'
                  ? 'Make several at once'
                  : m === 'names'
                    ? 'I have their names'
                    : 'One person, with details'}
              </button>
            ))}
          </div>
          {mode === 'one' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="vol-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="vol-name"
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  maxLength={80}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="vol-place" className="text-sm font-medium">
                  Where they will stand
                </label>
                <Input
                  id="vol-place"
                  value={vPlace}
                  onChange={(e) => setVPlace(e.target.value)}
                  maxLength={120}
                  placeholder="For example: Front gate"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="vol-phone" className="text-sm font-medium">
                  Phone number (optional)
                </label>
                <Input
                  id="vol-phone"
                  type="tel"
                  inputMode="numeric"
                  value={vPhone}
                  onChange={(e) => setVPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="vol-email" className="text-sm font-medium">
                  Email (optional)
                </label>
                <Input
                  id="vol-email"
                  type="email"
                  value={vEmail}
                  onChange={(e) => setVEmail(e.target.value)}
                  maxLength={255}
                  className="h-11"
                />
              </div>
            </div>
          ) : mode === 'count' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="crew-count" className="text-sm font-medium">
                  How many helpers do you need?
                </label>
                <Input
                  id="crew-count"
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Any number from 1 to 50.</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="crew-prefix" className="text-sm font-medium">
                  What should they be called?
                </label>
                <Input
                  id="crew-prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  maxLength={60}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  They will be called {prefix || 'Gate'} 1, {prefix || 'Gate'} 2, and so on.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="crew-names" className="text-sm font-medium">
                Type one name on each line
              </label>
              <textarea
                id="crew-names"
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={4}
                placeholder={'Ravi, front gate\nAsha, help desk'}
                className="w-full rounded-control border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="crew-level" className="text-sm font-medium">
                What can this helper do?
              </label>
              <select
                id="crew-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as 'SCAN' | 'DESK')}
                className="h-11 w-full rounded-control border border-input bg-background px-3 text-sm"
              >
                <option value="SCAN">Scan tickets only</option>
                <option value="DESK">
                  Scan tickets, search by name and check people in by hand
                </option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="crew-devices" className="text-sm font-medium">
                Phones that can use one pass
              </label>
              <Input
                id="crew-devices"
                type="number"
                min={1}
                max={5}
                value={devices}
                onChange={(e) => setDevices(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                How many phones can be signed in with the same code. Most helpers need 1. Use 1 to
                5.
              </p>
            </div>
          </div>
          <Button type="submit" loading={busy} disabled={mode === 'names' && !names.trim()}>
            Make passes
          </Button>
        </form>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {passes === null ? (
        <Loader2
          className="mx-auto size-6 animate-spin text-muted-foreground"
          aria-label="Loading"
        />
      ) : passes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No helpers yet. Make the first pass above.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">
              {passes.length} helper pass{passes.length === 1 ? '' : 'es'}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/scan" target="_blank">
                  <ScanLine /> Open scanner to try it
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" disabled={live.length === 0}>
                <Link href={`/crew-sheet/${eventId}`} target="_blank">
                  <Printer /> Print codes for helpers
                </Link>
              </Button>
            </div>
          </div>
          <ul className="space-y-2">
            {passes.map((p) => (
              <li key={p.id} className="rounded-card border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.label}
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          STATUS_STYLE[p.status],
                        )}
                      >
                        {p.status === 'ACTIVE'
                          ? 'Active'
                          : p.status === 'UPCOMING'
                            ? 'Not open yet'
                            : p.status === 'EXPIRED'
                              ? 'Ended'
                              : 'Stopped'}
                      </span>
                      {p.level === 'DESK' && (
                        <span className="text-xs font-normal text-muted-foreground">
                          can check in by hand
                        </span>
                      )}
                    </p>
                    {(p.place || p.phone || p.email) && (
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                        {p.place && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden /> {p.place}
                          </span>
                        )}
                        {p.phone && (
                          <a
                            href={`tel:+91${p.phone}`}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Phone className="size-3.5" aria-hidden /> {p.phone}
                          </a>
                        )}
                        {p.email && (
                          <a
                            href={`mailto:${p.email}`}
                            className="inline-flex items-center gap-1 break-all hover:text-foreground"
                          >
                            <Mail className="size-3.5" aria-hidden /> {p.email}
                          </a>
                        )}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Checked in: {p.checkedIn} · Phones signed in: {p.devicesInUse} of{' '}
                      {p.maxDevices} · Works until {fmtWhen(p.validUntil)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => (editId === p.id ? setEditId(null) : startEdit(p))}
                    >
                      <Pencil /> {editId === p.id ? 'Close' : 'Edit'}
                    </Button>
                  </div>
                  {p.status !== 'REVOKED' && p.status !== 'EXPIRED' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copy(`code-${p.id}`, p.code)}
                        className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 font-mono text-base font-semibold tracking-widest"
                        aria-label={`Copy code ${p.codeDisplay}`}
                      >
                        {p.codeDisplay}
                        {copied === `code-${p.id}` ? (
                          <Check className="size-4 text-success-soft-foreground" />
                        ) : (
                          <Copy className="size-4 text-muted-foreground" />
                        )}
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copy(`link-${p.id}`, link(p))}
                      >
                        {copied === `link-${p.id}` ? <Check /> : <Copy />} Copy link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => revoke(p)}>
                        <ShieldOff /> Stop pass
                      </Button>
                    </div>
                  )}
                </div>
                {editId === p.id && (
                  <form
                    onSubmit={saveEdit}
                    className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2"
                  >
                    <div className="space-y-1.5">
                      <label htmlFor={`e-name-${p.id}`} className="text-sm font-medium">
                        Name
                      </label>
                      <Input
                        id={`e-name-${p.id}`}
                        value={draft.label}
                        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                        maxLength={80}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`e-place-${p.id}`} className="text-sm font-medium">
                        Where they will stand
                      </label>
                      <Input
                        id={`e-place-${p.id}`}
                        value={draft.place}
                        onChange={(e) => setDraft({ ...draft, place: e.target.value })}
                        maxLength={120}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`e-phone-${p.id}`} className="text-sm font-medium">
                        Phone number (optional)
                      </label>
                      <Input
                        id={`e-phone-${p.id}`}
                        type="tel"
                        inputMode="numeric"
                        value={draft.phone}
                        onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                        placeholder="10-digit mobile"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`e-email-${p.id}`} className="text-sm font-medium">
                        Email (optional)
                      </label>
                      <Input
                        id={`e-email-${p.id}`}
                        type="email"
                        value={draft.email}
                        onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                        maxLength={255}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`e-level-${p.id}`} className="text-sm font-medium">
                        What can this helper do?
                      </label>
                      <select
                        id={`e-level-${p.id}`}
                        value={draft.level}
                        onChange={(e) =>
                          setDraft({ ...draft, level: e.target.value as 'SCAN' | 'DESK' })
                        }
                        className="h-11 w-full rounded-control border border-input bg-background px-3 text-sm"
                      >
                        <option value="SCAN">Scan tickets only</option>
                        <option value="DESK">
                          Scan tickets, search by name and check people in by hand
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`e-dev-${p.id}`} className="text-sm font-medium">
                        Phones that can use one pass
                      </label>
                      <Input
                        id={`e-dev-${p.id}`}
                        type="number"
                        min={1}
                        max={5}
                        value={draft.maxDevices}
                        onChange={(e) => setDraft({ ...draft, maxDevices: e.target.value })}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">Use 1 to 5.</p>
                    </div>
                    {editError && (
                      <p role="alert" className="text-sm text-destructive sm:col-span-2">
                        {editError}
                      </p>
                    )}
                    <div className="flex gap-2 sm:col-span-2">
                      <Button type="submit" loading={saving}>
                        Save changes
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Send each helper their code or link. On their phone they open{' '}
            <span className="font-mono">{SITE_URL}/scan</span> and type the code. The link fills the
            code in for them.
          </p>
        </div>
      )}
    </div>
  );
}
