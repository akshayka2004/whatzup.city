import { SectionCard } from '@/components/system/section-card';
import { BarList } from './bar-list';
import { formatValue } from './format';
import { OFFER_CHANNEL_LABEL } from '@saas/types';

export type MixBucket = { key: string; label: string; bills: number; spend: number };

export type PurchaseMix = {
  totalBills: number;
  totalSpend: number;
  recordedBills: number;
  channels: MixBucket[];
  payments: MixBucket[];
  deliveryPartners: MixBucket[];
  cities: {
    city: string;
    bills: number;
    spend: number;
    inStore: number;
    takeaway: number;
    delivery: number;
  }[];
};

export type OfferChannelMix = { key: string; label: string; offers: number }[];

const toItems = (rows: MixBucket[]) =>
  rows.map((r) => ({
    key: r.key,
    label: r.label,
    value: r.bills,
    hint: formatValue(r.spend, 'inr'),
  }));

/**
 * How customers bought and paid, from verified bills. Shared by the business and platform
 * analytics. `showCities` adds the per-city table (platform view).
 */
export function PurchaseMixPanel({
  mix,
  offerChannels,
  showCities = false,
}: {
  mix?: PurchaseMix;
  offerChannels?: OfferChannelMix;
  showCities?: boolean;
}) {
  if (!mix) {
    return <div className="ui-skeleton h-48" />;
  }
  const unrecorded = mix.totalBills - mix.recordedBills;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="How customers buy"
          description={`${mix.totalBills} verified bills · ${formatValue(mix.totalSpend, 'inr')}`}
        >
          <BarList items={toItems(mix.channels)} emptyLabel="No verified bills in this period" />
          {unrecorded > 0 && mix.recordedBills > 0 && (
            <p className="mt-2 text-caption text-muted-foreground">
              {unrecorded} older {unrecorded === 1 ? 'bill' : 'bills'} were uploaded before this was
              asked.
            </p>
          )}
        </SectionCard>
        <SectionCard title="How they pay" description="In-store and takeaway bills">
          <BarList items={toItems(mix.payments)} emptyLabel="No payment details yet" />
        </SectionCard>
        <SectionCard title="Delivery apps" description="Swiggy, Zomato, Plenti and others">
          <BarList items={toItems(mix.deliveryPartners)} emptyLabel="No delivery orders yet" />
        </SectionCard>
      </div>

      {offerChannels && (
        <SectionCard
          title="Live offers by channel"
          description="An offer on several channels counts under each"
        >
          <BarList
            items={offerChannels.map((c) => ({
              key: c.key,
              label: OFFER_CHANNEL_LABEL[c.key as keyof typeof OFFER_CHANNEL_LABEL] ?? c.label,
              value: c.offers,
            }))}
            emptyLabel="No live offers"
          />
        </SectionCard>
      )}

      {showCities && (
        <SectionCard
          title="Who buys, by city"
          description="Verified bills and spend by city, split by how they bought"
          padded={false}
        >
          {mix.cities.length === 0 ? (
            <p className="p-6 text-center text-caption text-muted-foreground">
              No verified bills in this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-caption text-muted-foreground">
                    <th className="px-4 py-2 font-medium">City</th>
                    <th className="px-4 py-2 text-right font-medium">Bills</th>
                    <th className="px-4 py-2 text-right font-medium">Spend</th>
                    <th className="px-4 py-2 text-right font-medium">In-store</th>
                    <th className="px-4 py-2 text-right font-medium">Takeaway</th>
                    <th className="px-4 py-2 text-right font-medium">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {mix.cities.map((c) => (
                    <tr key={c.city} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2 text-foreground">{c.city}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.bills}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatValue(c.spend, 'inr')}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.inStore}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.takeaway}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.delivery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
