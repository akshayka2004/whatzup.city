'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Plus, Sun, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { StatusPill } from '@/components/common/status-pill';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Toolbar, SearchInput } from '@/components/system/toolbar';
import { DataTable, type Column } from '@/components/system/data-table';
import { Modal } from '@/components/system/modal';
import { Stepper } from '@/components/system/stepper';
import { useConfirm } from '@/components/common/confirm-dialog';
import { ICONS } from '@/lib/icons';

const SWATCHES = [
  ['background', 'bg-background'],
  ['card', 'bg-card'],
  ['surface-sunken', 'bg-surface-sunken'],
  ['secondary', 'bg-secondary'],
  ['primary', 'bg-primary'],
  ['brand-soft', 'bg-brand-soft'],
  ['success-soft', 'bg-success-soft'],
  ['warning-soft', 'bg-warning-soft'],
  ['danger-soft', 'bg-danger-soft'],
  ['info-soft', 'bg-info-soft'],
  ['border', 'bg-border'],
  ['border-strong', 'bg-border-strong'],
] as const;

const CHART = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5', 'bg-chart-6', 'bg-chart-7', 'bg-chart-8'];

const RADII = [
  ['xs 6', 'rounded-xs'],
  ['sm 10', 'rounded-sm'],
  ['md 12', 'rounded-md'],
  ['lg 14 · control', 'rounded-control'],
  ['xl 16', 'rounded-xl'],
  ['2xl 20 · card', 'rounded-card'],
  ['3xl 28 · sheet', 'rounded-sheet'],
  ['full', 'rounded-full'],
] as const;

type Row = { id: string; name: string; city: string; status: string; revenue: number };
const ROWS: Row[] = [
  { id: '1', name: 'Malabar Spice House', city: 'Kozhikode', status: 'APPROVED', revenue: 182000 },
  { id: '2', name: 'Cochin Craft Brews', city: 'Kochi', status: 'PENDING', revenue: 64500 },
  { id: '3', name: 'Trivandrum Textiles', city: 'Thiruvananthapuram', status: 'REJECTED', revenue: 0 },
  { id: '4', name: 'Thrissur Sweets', city: 'Thrissur', status: 'ACTIVE', revenue: 98200 },
];
const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Business', sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'city', header: 'City', sortable: true, hideOnMobile: true },
  { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
  {
    key: 'revenue',
    header: 'Revenue',
    align: 'right',
    sortable: true,
    cell: (r) => `₹${r.revenue.toLocaleString('en-IN')}`,
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-overline text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function StyleGuide() {
  const { resolvedTheme, setTheme } = useTheme();
  const confirm = useConfirm();
  const [chip, setChip] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  return (
    <main id="main-content" className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Whtzup.city"
        title="Design system v3"
        description="Tokens and primitives. Every screen should be built from what is on this page."
        breadcrumbs={[{ label: 'Internal', href: '/' }, { label: 'Design system' }]}
        actions={
          <Button variant="outline" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
            {resolvedTheme === 'dark' ? <Sun /> : <Moon />} Toggle theme
          </Button>
        }
      />

      <Section title="Type scale">
        <div className="space-y-2">
          <p className="text-display">Display — Discover Kerala</p>
          <p className="text-title">Title — Business analytics</p>
          <p className="text-heading">Heading — Offer performance</p>
          <p className="text-body text-muted-foreground">Body — Verified businesses, offers and civic updates across your city.</p>
          <p className="text-label">Label — Opening hours</p>
          <p className="text-caption text-muted-foreground">Caption — Updated 2 minutes ago</p>
          <p className="text-overline text-muted-foreground">Overline — Section</p>
          <p className="text-metric">₹12,48,500</p>
        </div>
      </Section>

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="space-y-1.5">
              <div className={`h-14 rounded-xl border border-border/70 ${cls}`} />
              <p className="text-caption text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {CHART.map((c, i) => (
            <div key={c} className="flex-1 space-y-1">
              <div className={`h-8 rounded-md ${c}`} />
              <p className="text-caption text-center text-muted-foreground">chart-{i + 1}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shape scale">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RADII.map(([label, cls]) => (
            <div key={label} className={`flex h-20 items-end border border-border-strong/70 bg-card p-3 shadow-e1 ${cls}`}>
              <span className="text-caption text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(['shadow-e1', 'shadow-e2', 'shadow-e3'] as const).map((s) => (
            <div key={s} className={`flex h-20 items-center justify-center rounded-card bg-card ${s}`}>
              <span className="text-caption text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="tonal">Tonal</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">
            <Trash2 /> Danger
          </Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="xl" shape="pill">
            <Plus /> Pill XL
          </Button>
          <Button loading>Saving</Button>
          <Button size="icon" variant="outline" aria-label="Add">
            <Plus />
          </Button>
        </div>
      </Section>

      <Section title="Badges & status">
        <div className="flex flex-wrap gap-2">
          {(['brand', 'neutral', 'success', 'warning', 'danger', 'info', 'outline', 'default'] as const).map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {['APPROVED', 'PENDING', 'REJECTED', 'ARCHIVED', 'TRIAL'].map((s) => (
            <StatusPill key={s} status={s} />
          ))}
          <StatusPill tone="success" label="Open now" live />
        </div>
      </Section>

      <Section title="Chips & toolbar">
        <Toolbar actions={<Button>New offer</Button>}>
          <SearchInput value={q} onChange={setQ} placeholder="Search businesses" />
        </Toolbar>
        <ChipRow label="Filter">
          {[
            ['all', 'All', undefined],
            ['dine', 'Dine-in', ICONS.menu],
            ['offers', 'With offers', ICONS.offers],
            ['open', 'Open now', undefined],
          ].map(([id, label, Icon]) => (
            <FilterChip
              key={id as string}
              icon={Icon as typeof ICONS.menu | undefined}
              selected={chip === id}
              onClick={() => setChip(id as string)}
              count={id === 'all' ? 128 : undefined}
            >
              {label as string}
            </FilterChip>
          ))}
          <FilterChip removable onClick={() => toast('Filter removed')}>
            Kochi
          </FilterChip>
        </ChipRow>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-3">
          {(['raised', 'outlined', 'interactive', 'tinted', 'sunken'] as const).map((v) => (
            <Card key={v} variant={v}>
              <CardHeader>
                <CardTitle className="capitalize">{v}</CardTitle>
                <CardDescription>Card variant</CardDescription>
              </CardHeader>
              <CardContent className="text-body text-muted-foreground">Content sits on a 20px radius surface.</CardContent>
            </Card>
          ))}
        </div>
        <SectionCard
          icon={ICONS.settings}
          title="Section card"
          description="Settings groups, dashboard panels and detail sections."
          action={<Button size="sm" variant="outline">Edit</Button>}
          footer={<Button size="sm">Save</Button>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Business name" aria-label="Business name" />
            <Input placeholder="Phone" aria-label="Phone" />
          </div>
        </SectionCard>
      </Section>

      <Section title="Tabs & stepper">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
        </Tabs>
        <Stepper steps={['Account', 'Company', 'Contacts', 'Hours', 'Plan', 'Payment']} current={step} onStepClick={setStep} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          <Button size="sm" onClick={() => setStep((s) => Math.min(5, s + 1))}>
            Next
          </Button>
        </div>
      </Section>

      <Section title="Data table">
        <DataTable
          caption="Businesses"
          columns={COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
          defaultSort={{ key: 'revenue', dir: 'desc' }}
          onRowClick={(r) => toast(r.name)}
          mobileCard={(r) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-caption text-muted-foreground">{r.city}</p>
              </div>
              <StatusPill status={r.status} />
            </div>
          )}
        />
        <DataTable caption="Loading" columns={COLUMNS} rows={[]} rowKey={(r) => r.id} loading />
      </Section>

      <Section title="Feedback">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success('Offer published')}>
            Success toast
          </Button>
          <Button variant="outline" onClick={() => toast.error('Could not save. Try again.')}>
            Error toast
          </Button>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Open modal
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const ok = await confirm({ title: 'Delete offer?', description: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' });
              if (ok) toast.success('Deleted');
            }}
          >
            Confirm dialog
          </Button>
        </div>
        <EmptyState icon={ICONS.offers} title="No offers yet" description="Create your first offer to show it on your public page." action={{ label: 'New offer', onClick: () => setOpen(true) }} />
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="New offer"
          description="Dialog on desktop, bottom sheet on phones."
          footer={
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => { setOpen(false); toast.success('Saved'); }}>Save</Button>
            </>
          }
        >
          <div className="grid gap-3 py-1">
            <Input placeholder="Offer title" aria-label="Offer title" />
            <Input placeholder="Discount %" aria-label="Discount" inputMode="numeric" />
          </div>
        </Modal>
      </Section>
    </main>
  );
}
