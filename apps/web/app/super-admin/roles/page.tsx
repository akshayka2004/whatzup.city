'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ACCESS_AREAS, ACCESS_PRESETS, type AccessGrants, type AccessLevel } from '@saas/types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { ModalSurface } from '@/components/system/modal-surface';
import { ListFilters, countBy, matchesSearch } from '@/components/system/list-filters';
import { useConfirm } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import { PAYMENTS_ENABLED } from '@/lib/feature-flags';
import { cn } from '@/lib/utils';

type StaffRole = 'PLATFORM_STAFF' | 'MASTER_ADMIN';

interface StaffRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  grants: AccessGrants;
  createdAt: string;
  lastLoginAt?: string | null;
}

const ROLE_OPTIONS: { value: StaffRole; label: string; description: string }[] = [
  {
    value: 'PLATFORM_STAFF',
    label: 'Staff',
    description: 'Works from the staff menu. Sees only the areas ticked below.',
  },
  {
    value: 'MASTER_ADMIN',
    label: 'Portal admin',
    description: 'Works from the admin portal. Sees only the areas ticked below.',
  },
];

const AREAS = ACCESS_AREAS.filter(
  (a) => PAYMENTS_ENABLED || !('paymentsOnly' in a && a.paymentsOnly),
);
const AREA_LABEL = Object.fromEntries(ACCESS_AREAS.map((a) => [a.key, a.label])) as Record<
  string,
  string
>;
const GROUPS = Array.from(new Set(AREAS.map((a) => a.group)));

const roleBadge = (role: string) =>
  role === 'SUPER_ADMIN'
    ? { label: 'Super admin', cls: 'text-brand-soft-foreground bg-brand-soft border-primary/20' }
    : role === 'MASTER_ADMIN'
      ? { label: 'Portal admin', cls: 'text-info-soft-foreground bg-info-soft border-info/20' }
      : { label: 'Staff', cls: 'text-warning-soft-foreground bg-warning-soft border-warning/20' };

function formatDate(d?: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** 12 characters with upper and lower case, a number and a symbol; easy to read out loud. */
function makeTempPassword() {
  const pick = (chars: string, n: number) =>
    Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => chars[v % chars.length]).join('');
  const all = [
    pick('ABCDEFGHJKLMNPQRSTUVWXYZ', 3),
    pick('abcdefghijkmnpqrstuvwxyz', 5),
    pick('23456789', 2),
    pick('@#$%&*!', 2),
  ]
    .join('')
    .split('');
  // Shuffle so the pattern is not predictable.
  const rnd = crypto.getRandomValues(new Uint32Array(all.length));
  return all
    .map((c, i) => [c, rnd[i]] as const)
    .sort((a, b) => a[1] - b[1])
    .map(([c]) => c)
    .join('');
}

function summarize(grants: AccessGrants) {
  const entries = Object.entries(grants) as [string, AccessLevel][];
  const everything =
    entries.length >= ACCESS_AREAS.length && entries.every(([, l]) => l === 'manage');
  return { entries, everything };
}

// ── access matrix ──────────────────────────────────────────────────────────

function AccessMatrix({
  value,
  onChange,
}: {
  value: AccessGrants;
  onChange: (next: AccessGrants) => void;
}) {
  const set = (key: string, level: AccessLevel | '') => {
    const next = { ...value } as Record<string, AccessLevel>;
    if (level) next[key] = level;
    else delete next[key];
    onChange(next as AccessGrants);
  };
  return (
    <div className="space-y-4">
      {GROUPS.map((group) => (
        <div key={group} className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group}
          </p>
          <div className="divide-y divide-border rounded-xl border border-border">
            {AREAS.filter((a) => a.group === group).map((area) => {
              const current = (value as Record<string, AccessLevel | undefined>)[area.key] ?? '';
              return (
                <div
                  key={area.key}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{area.label}</p>
                    <p className="text-xs text-muted-foreground">{area.description}</p>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={`${area.label} access`}
                    className="grid shrink-0 grid-cols-3 gap-1 rounded-lg bg-surface-sunken p-1"
                  >
                    {(
                      [
                        ['', 'None'],
                        ['view', 'View'],
                        ['manage', 'Manage'],
                      ] as const
                    ).map(([level, label]) => (
                      <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={current === level}
                        onClick={() => set(area.key, level)}
                        className={cn(
                          'min-h-9 min-w-16 cursor-pointer rounded-md px-3 text-xs font-medium transition-colors',
                          current === level
                            ? level === 'manage'
                              ? 'bg-primary text-primary-foreground shadow-e1'
                              : level === 'view'
                                ? 'bg-card text-foreground shadow-e1'
                                : 'bg-card text-muted-foreground shadow-e1'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── temporary password field ───────────────────────────────────────────────

function PasswordField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="rounded-xl border-border bg-secondary font-mono"
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 cursor-pointer rounded-xl"
          onClick={() => onChange(makeTempPassword())}
          aria-label="Generate a password"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 cursor-pointer rounded-xl"
          disabled={!value}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard unavailable: the text is visible to copy by hand */
            }
          }}
          aria-label="Copy the password"
        >
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Share it privately. They must replace it when they first sign in.
      </p>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default function StaffAccountsPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [pageError, setPageError] = useState('');

  const [fq, setFq] = useState('');
  const [fRole, setFRole] = useState('');
  const [fActive, setFActive] = useState('');

  const [form, setForm] = useState<null | { mode: 'create' } | { mode: 'edit'; row: StaffRow }>(
    null,
  );
  const [reset, setReset] = useState<null | StaffRow>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiService.get<any>('/v1/admin/staff');
    if (res.error) setPageError(res.error);
    else {
      setPageError('');
      setRows(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const roleCounts = countBy(rows, (r) => r.role);
  const activeCounts = countBy(rows, (r) => (r.isActive ? 'ACTIVE' : 'INACTIVE'));
  const visible = rows.filter(
    (r) =>
      (!fRole || r.role === fRole) &&
      (!fActive || (r.isActive ? 'ACTIVE' : 'INACTIVE') === fActive) &&
      matchesSearch([r.name, r.email], fq),
  );

  const toggleActive = async (row: StaffRow) => {
    const turningOff = row.isActive;
    const ok = await confirm({
      title: turningOff ? `Deactivate ${row.name}?` : `Reactivate ${row.name}?`,
      description: turningOff
        ? 'They are signed out everywhere and cannot sign in until you reactivate the account.'
        : 'They can sign in again with their current password.',
      confirmLabel: turningOff ? 'Deactivate' : 'Reactivate',
      tone: turningOff ? 'danger' : 'default',
    });
    if (!ok) return;
    const res = await apiService.patch<any>(`/v1/admin/staff/${row.id}`, {
      isActive: !row.isActive,
    });
    if (res.error) setPageError(res.error);
    else setNotice(`${row.name} ${turningOff ? 'deactivated' : 'reactivated'}.`);
    load();
  };

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Staff accounts</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create accounts and choose exactly which areas each person can view or manage.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setNotice('');
              setForm({ mode: 'create' });
            }}
            className="shrink-0 cursor-pointer gap-2 rounded-xl font-semibold"
          >
            <Plus className="h-4 w-4" /> Add account
          </Button>
        </div>

        {notice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success-soft-foreground"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {notice}
          </div>
        )}
        {pageError && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/20 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground"
          >
            {pageError}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <ListFilters
            noun="accounts"
            shown={visible.length}
            total={rows.length}
            onReset={() => {
              setFq('');
              setFRole('');
              setFActive('');
            }}
            search={{ value: fq, onChange: setFq, placeholder: 'Search name or email…' }}
            groups={[
              {
                key: 'role',
                label: 'Role',
                value: fRole,
                onChange: setFRole,
                options: Object.keys(roleCounts)
                  .sort()
                  .map((k) => ({ value: k, label: roleBadge(k).label, count: roleCounts[k] })),
              },
              {
                key: 'active',
                label: 'Status',
                value: fActive,
                onChange: setFActive,
                options: [
                  { value: 'ACTIVE', label: 'Active', count: activeCounts.ACTIVE ?? 0 },
                  { value: 'INACTIVE', label: 'Inactive', count: activeCounts.INACTIVE ?? 0 },
                ],
              },
            ]}
          />
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="rounded-2xl border-dashed p-10 text-center">
            <p className="font-semibold text-foreground">No staff accounts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add the first account and choose what it can do.
            </p>
          </Card>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts match these filters.</p>
        ) : (
          <div className="space-y-3">
            {visible.map((row) => {
              const badge = roleBadge(row.role);
              const isSuper = row.role === 'SUPER_ADMIN';
              const { entries, everything } = summarize(row.grants);
              return (
                <Card key={row.id} className="rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{row.name}</p>
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-xs font-semibold',
                              badge.cls,
                            )}
                          >
                            {badge.label}
                          </span>
                          {!row.isActive && (
                            <span className="rounded-full border border-destructive/20 bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger-soft-foreground">
                              Inactive
                            </span>
                          )}
                          {row.mustChangePassword && (
                            <span className="rounded-full border border-warning/20 bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground">
                              Has not set a password yet
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-5 text-xs text-muted-foreground">
                      <div>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Created
                        </p>
                        <p className="font-medium text-foreground">{formatDate(row.createdAt)}</p>
                      </div>
                      <div>
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Last sign-in
                        </p>
                        <p className="font-medium text-foreground">{formatDate(row.lastLoginAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {isSuper || everything ? (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
                        Everything
                      </span>
                    ) : entries.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No access</span>
                    ) : (
                      entries.map(([key, level]) => (
                        <span
                          key={key}
                          className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                        >
                          {AREA_LABEL[key] ?? key}
                          <span className="text-muted-foreground">
                            {' '}
                            · {level === 'manage' ? 'manage' : 'view'}
                          </span>
                        </span>
                      ))
                    )}
                  </div>

                  {!isSuper && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer rounded-lg"
                        onClick={() => {
                          setNotice('');
                          setForm({ mode: 'edit', row });
                        }}
                      >
                        Edit access
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer rounded-lg"
                        onClick={() => {
                          setNotice('');
                          setReset(row);
                        }}
                      >
                        Reset password
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer rounded-lg"
                        onClick={() => toggleActive(row)}
                      >
                        {row.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {form && (
        <AccountDialog
          mode={form.mode}
          row={form.mode === 'edit' ? form.row : undefined}
          onClose={() => setForm(null)}
          onSaved={(msg) => {
            setForm(null);
            setNotice(msg);
            load();
          }}
        />
      )}
      {reset && (
        <ResetDialog
          row={reset}
          onClose={() => setReset(null)}
          onSaved={(msg) => {
            setReset(null);
            setNotice(msg);
            load();
          }}
        />
      )}
    </SuperAdminLayout>
  );
}

// ── create / edit ──────────────────────────────────────────────────────────

function AccountDialog({
  mode,
  row,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  row?: StaffRow;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(row?.name ?? '');
  const [email, setEmail] = useState(row?.email ?? '');
  const [phone, setPhone] = useState(row?.phone ?? '');
  const [role, setRole] = useState<StaffRole>((row?.role as StaffRole) ?? 'PLATFORM_STAFF');
  const [grants, setGrants] = useState<AccessGrants>(row?.grants ?? {});
  const [password, setPassword] = useState(() => (mode === 'create' ? makeTempPassword() : ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<null | { email: string; password: string }>(null);

  const count = useMemo(() => Object.keys(grants).length, [grants]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (count === 0) {
      setError('Choose View or Manage for at least one area.');
      return;
    }
    setSaving(true);
    const res =
      mode === 'create'
        ? await apiService.post<any>('/v1/admin/staff', {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || undefined,
            password,
            role,
            grants,
          })
        : await apiService.patch<any>(`/v1/admin/staff/${row!.id}`, {
            name: name.trim(),
            phone: phone.trim(),
            role,
            grants,
          });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (mode === 'create') setCreated({ email: email.trim().toLowerCase(), password });
    else onSaved(`Access updated for ${name.trim()}. It applies the next time they open a page.`);
  };

  // After creating, show the temporary password once so it can be passed on.
  if (created) {
    return (
      <ModalSurface
        onClose={() => onSaved(`Account created for ${created.email}.`)}
        label="Account created"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Account created</h3>
          <p className="text-sm text-muted-foreground">
            Give {created.email} this temporary password. It is shown only now. They must choose
            their own at first sign-in.
          </p>
          <div className="rounded-xl border border-border bg-secondary p-3 font-mono text-sm break-all">
            {created.password}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 cursor-pointer rounded-xl"
              onClick={() => navigator.clipboard?.writeText(created.password)}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button
              type="button"
              className="flex-1 cursor-pointer rounded-xl"
              onClick={() => onSaved(`Account created for ${created.email}.`)}
            >
              Done
            </Button>
          </div>
        </div>
      </ModalSurface>
    );
  }

  return (
    <ModalSurface
      onClose={onClose}
      label={mode === 'create' ? 'Add staff account' : 'Edit staff access'}
      className="sm:max-w-2xl"
      hideClose
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Shield className="h-5 w-5 text-primary" />
          {mode === 'create' ? 'Add staff account' : `Edit ${row?.name}`}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-destructive/20 bg-danger-soft px-3 py-2 text-xs text-danger-soft-foreground"
        >
          {error}
        </p>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Full name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-xl border-border bg-secondary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={mode === 'edit'}
              autoComplete="off"
              className="rounded-xl border-border bg-secondary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Mobile <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              value={phone ?? ''}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              className="rounded-xl border-border bg-secondary"
            />
          </div>
          {mode === 'create' && (
            <PasswordField value={password} onChange={setPassword} label="Temporary password" />
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-foreground">Works from</label>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={role === opt.value}
                onClick={() => setRole(opt.value)}
                className={cn(
                  'cursor-pointer rounded-xl border p-3 text-left transition-colors',
                  role === opt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary hover:bg-muted/60',
                )}
              >
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium text-foreground">
              Access <span className="text-muted-foreground">({count} areas)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ACCESS_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={p.description}
                  onClick={() => setGrants(p.grants)}
                  className="min-h-8 cursor-pointer rounded-full border border-border bg-card px-3 text-xs text-foreground hover:bg-muted"
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGrants({})}
                className="min-h-8 cursor-pointer rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong className="font-medium text-foreground">View</strong> lets them look.{' '}
            <strong className="font-medium text-foreground">Manage</strong> lets them look and
            change things. Presets only pre-tick the boxes; you can still adjust each one.
          </p>
          <AccessMatrix value={grants} onChange={setGrants} />
        </div>

        <div className="sticky bottom-0 -mx-6 flex gap-3 border-t border-border bg-card px-6 pb-1 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 cursor-pointer rounded-xl font-semibold"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'create' ? (
              'Create account'
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </form>
    </ModalSurface>
  );
}

// ── reset password ─────────────────────────────────────────────────────────

function ResetDialog({
  row,
  onClose,
  onSaved,
}: {
  row: StaffRow;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [password, setPassword] = useState(makeTempPassword);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await apiService.post<any>(`/v1/admin/staff/${row.id}/reset-password`, {
      password,
    });
    setSaving(false);
    if (res.error) setError(res.error);
    else setDone(true);
  };

  if (done) {
    return (
      <ModalSurface
        onClose={() => onSaved(`Password reset for ${row.name}.`)}
        label="Password reset"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Password reset</h3>
          <p className="text-sm text-muted-foreground">
            Give {row.name} this temporary password. They must choose their own at next sign-in.
          </p>
          <div className="break-all rounded-xl border border-border bg-secondary p-3 font-mono text-sm">
            {password}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 cursor-pointer rounded-xl"
              onClick={() => navigator.clipboard?.writeText(password)}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button
              type="button"
              className="flex-1 cursor-pointer rounded-xl"
              onClick={() => onSaved(`Password reset for ${row.name}.`)}
            >
              Done
            </Button>
          </div>
        </div>
      </ModalSurface>
    );
  }

  return (
    <ModalSurface onClose={onClose} label="Reset password">
      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Reset password for {row.name}</h3>
        <p className="text-sm text-muted-foreground">
          They are signed out everywhere and must choose a new password at next sign-in.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger-soft-foreground"
          >
            {error}
          </p>
        )}
        <PasswordField value={password} onChange={setPassword} label="New temporary password" />
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 cursor-pointer rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
          </Button>
        </div>
      </form>
    </ModalSurface>
  );
}
