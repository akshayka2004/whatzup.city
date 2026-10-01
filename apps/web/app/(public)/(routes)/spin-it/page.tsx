'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/public-layout';
import { DiscountTicket } from '@/components/business/discount-ticket';
import { apiService } from '@/lib/services/api-service';
import { Sparkles, MapPin, Loader2, Disc3, Ticket, ArrowRight } from 'lucide-react';

interface ActiveWheel {
  id: string;
  businessId: string;
  businessName: string;
  businessCity?: string | null;
  businessLogo?: string | null;
  categoryName?: string | null;
  itemName: string;
  description?: string | null;
  maxDiscountPercent: number;
  wheelPercentages: number[];
}

interface MyTicket {
  id: string;
  discountPercent: number;
  code: string;
  status: string;
  itemName: string;
  expiresAt?: string | null;
  business?: { id: string; name: string; logo?: string | null } | null;
}

function WheelCard({ wheel, index }: { wheel: ActiveWheel; index: number }) {
  return (
    <Link
      href={`/business/${wheel.businessId}`}
      className="disc-fade-up group flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl active:scale-[0.99] motion-reduce:hover:translate-y-0"
      style={{ animationDelay: `${Math.min(index, 10) * 0.05}s` }}
    >
      <div className="flex items-center gap-3 mb-3">
        {wheel.businessLogo ? (
          <img src={wheel.businessLogo} alt={wheel.businessName} className="h-11 w-11 rounded-xl object-cover border border-border shrink-0" />
        ) : (
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary font-black text-lg shrink-0">
            {wheel.businessName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{wheel.businessName}</p>
          {wheel.businessCity && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {wheel.businessCity}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-foreground break-words">
        Win up to <span className="font-bold text-primary">{wheel.maxDiscountPercent}%</span> off{' '}
        <span className="font-semibold">{wheel.itemName}</span>
      </p>
      {wheel.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 break-words">{wheel.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {wheel.wheelPercentages.slice(0, 7).map((p, i) => (
          <span key={i} className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-bold text-muted-foreground">
            {p}%
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
        Spin now
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export default function SpinItPage() {
  const [wheels, setWheels] = useState<ActiveWheel[]>([]);
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [tab, setTab] = useState<'wheels' | 'mine'>('wheels');
  const [loadingWheels, setLoadingWheels] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    apiService.get<ActiveWheel[]>('/v1/discounts/active/all').then((res) => {
      if (!res.error && res.data) setWheels(res.data);
      setLoadingWheels(false);
    });
    apiService.get<MyTicket[]>('/v1/discounts/my').then((res) => {
      if (!res.error && res.data) setTickets(res.data);
      setLoadingTickets(false);
    });
  }, []);

  return (
    <PublicLayout>
      <div>
        <div className="mb-6 flex items-center gap-3">
          <div className="disc-glow relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Spin it</h1>
            <p className="text-muted-foreground text-sm">
              Businesses running a lucky wheel right now, and every discount voucher you've won.
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab('wheels')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              tab === 'wheels' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Disc3 className="h-4 w-4" /> Active wheels
            {wheels.length > 0 && <span className="ml-0.5 opacity-80">({wheels.length})</span>}
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              tab === 'mine' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Ticket className="h-4 w-4" /> My vouchers
            {tickets.length > 0 && <span className="ml-0.5 opacity-80">({tickets.length})</span>}
          </button>
        </div>

        {tab === 'wheels' ? (
          loadingWheels ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : wheels.length === 0 ? (
            <div className="p-12 rounded-2xl text-center border border-dashed border-border bg-secondary">
              <Disc3 className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
              <h3 className="text-base font-semibold text-foreground mb-1">No wheels spinning right now</h3>
              <p className="text-sm text-muted-foreground">Check back soon — businesses add new discount wheels often.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {wheels.map((w, i) => <WheelCard key={w.id} wheel={w} index={i} />)}
            </div>
          )
        ) : loadingTickets ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 rounded-2xl text-center border border-dashed border-border bg-secondary">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-foreground mb-1">No vouchers yet</h3>
            <p className="text-sm text-muted-foreground">Spin a wheel on a business profile to win one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((t, i) => (
              <div key={t.id} className="disc-fade-up" style={{ animationDelay: `${Math.min(i, 10) * 0.05}s` }}>
                <DiscountTicket
                  businessName={t.business?.name || ''}
                  itemName={t.itemName}
                  discountPercent={t.discountPercent}
                  code={t.code}
                  status={t.status}
                  expiresAt={t.expiresAt}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
