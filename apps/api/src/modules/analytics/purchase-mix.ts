import { Prisma } from '@prisma/client';
import {
  BILL_ORDER_CHANNEL_LABEL,
  BILL_PAYMENT_MODE_LABEL,
  OFFER_CHANNELS,
  OFFER_CHANNEL_LABEL,
  deliveryPartnerLabel,
  type BillOrderChannel,
  type BillPaymentMode,
} from '@saas/types';
import type { DatabaseService } from '../../common/database/database.service';

/**
 * How verified bills were bought and paid (order channel, payment mode, delivery app), plus the
 * same split per city. Bills uploaded before these fields existed are counted as "Not recorded"
 * so totals always reconcile with the verified-bill count.
 */

export interface MixRow {
  channel: string | null;
  payment: string | null;
  partner: string | null;
  partnerName: string | null;
  city: string | null;
  bills: number;
  spend: number;
}

export interface MixBucket {
  key: string;
  label: string;
  bills: number;
  spend: number;
}

export interface PurchaseMix {
  totalBills: number;
  totalSpend: number;
  /** Bills that carry channel info at all (the rest predate the question). */
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
}

const UNKNOWN = 'NOT_RECORDED';

function add(
  map: Map<string, MixBucket>,
  key: string,
  label: string,
  bills: number,
  spend: number,
) {
  const cur = map.get(key) ?? { key, label, bills: 0, spend: 0 };
  cur.bills += bills;
  cur.spend += spend;
  map.set(key, cur);
}

const byBills = (a: MixBucket, b: MixBucket) => b.bills - a.bills || b.spend - a.spend;

/** Pure: fold grouped bill rows into the buckets the dashboards show. */
export function foldPurchaseMix(rows: MixRow[], cityLimit = 12): PurchaseMix {
  const channels = new Map<string, MixBucket>();
  const payments = new Map<string, MixBucket>();
  const partners = new Map<string, MixBucket>();
  const cities = new Map<string, PurchaseMix['cities'][number]>();
  let totalBills = 0;
  let totalSpend = 0;
  let recorded = 0;

  for (const r of rows) {
    totalBills += r.bills;
    totalSpend += r.spend;
    const ch = r.channel as BillOrderChannel | null;
    if (ch) recorded += r.bills;
    add(
      channels,
      ch ?? UNKNOWN,
      ch ? (BILL_ORDER_CHANNEL_LABEL[ch] ?? ch) : 'Not recorded',
      r.bills,
      r.spend,
    );

    if (ch === 'DELIVERY') {
      const code = r.partner || 'OTHER';
      // Typed "other" apps are tracked by name so "Dunzo" and "Magicpin" don't collapse together.
      const name = code === 'OTHER' ? (r.partnerName || '').trim() : '';
      const key = code === 'OTHER' && name ? `OTHER:${name.toLowerCase()}` : code;
      add(partners, key, deliveryPartnerLabel(code, name), r.bills, r.spend);
    } else if (ch) {
      const pm = r.payment as BillPaymentMode | null;
      add(
        payments,
        pm ?? UNKNOWN,
        pm ? (BILL_PAYMENT_MODE_LABEL[pm] ?? pm) : 'Not recorded',
        r.bills,
        r.spend,
      );
    }

    const city = (r.city || 'Unknown').trim() || 'Unknown';
    const c = cities.get(city.toLowerCase()) ?? {
      city,
      bills: 0,
      spend: 0,
      inStore: 0,
      takeaway: 0,
      delivery: 0,
    };
    c.bills += r.bills;
    c.spend += r.spend;
    if (ch === 'IN_STORE') c.inStore += r.bills;
    if (ch === 'TAKEAWAY') c.takeaway += r.bills;
    if (ch === 'DELIVERY') c.delivery += r.bills;
    cities.set(city.toLowerCase(), c);
  }

  return {
    totalBills,
    totalSpend,
    recordedBills: recorded,
    channels: [...channels.values()].sort(byBills),
    payments: [...payments.values()].sort(byBills),
    deliveryPartners: [...partners.values()].sort(byBills),
    cities: [...cities.values()]
      .sort((a, b) => b.bills - a.bills || b.spend - a.spend)
      .slice(0, cityLimit),
  };
}

const num = (v: unknown) => (typeof v === 'bigint' ? Number(v) : v == null ? 0 : Number(v));

/** Verified bills in [start, end) grouped by channel / payment / delivery app / city. */
export async function purchaseMix(
  db: DatabaseService,
  range: { start: Date; end: Date },
  filter: { businessId?: string; city?: string; categoryId?: string },
): Promise<PurchaseMix> {
  const biz = filter.businessId
    ? Prisma.sql`AND b.business_id = ${filter.businessId}::uuid`
    : Prisma.empty;
  const city = filter.city ? Prisma.sql`AND lower(z.city) = lower(${filter.city})` : Prisma.empty;
  const cat = filter.categoryId
    ? Prisma.sql`AND z.category_id = ${filter.categoryId}::uuid`
    : Prisma.empty;
  const rows = await db.$queryRaw<
    {
      channel: string | null;
      payment: string | null;
      partner: string | null;
      partner_name: string | null;
      city: string | null;
      bills: bigint;
      spend: unknown;
    }[]
  >(Prisma.sql`
    SELECT b.order_channel::text AS channel, b.payment_mode::text AS payment,
           b.delivery_partner AS partner, b.delivery_partner_name AS partner_name,
           z.city AS city, count(*) AS bills, coalesce(sum(b.amount), 0) AS spend
    FROM bills b JOIN businesses z ON z.id = b.business_id
    WHERE b.deleted_at IS NULL AND b.status = 'VERIFIED'
      AND b.verified_at >= ${range.start} AND b.verified_at < ${range.end}
      ${biz} ${city} ${cat}
    GROUP BY 1, 2, 3, 4, 5`);
  return foldPurchaseMix(
    rows.map((r) => ({
      channel: r.channel,
      payment: r.payment,
      partner: r.partner,
      partnerName: r.partner_name,
      city: r.city,
      bills: num(r.bills),
      spend: num(r.spend),
    })),
  );
}

/** Live offers per channel (an offer valid on several channels counts under each). */
export async function offerChannelMix(
  db: DatabaseService,
  filter: { businessId?: string; city?: string; categoryId?: string },
): Promise<{ key: string; label: string; offers: number }[]> {
  const biz = filter.businessId
    ? Prisma.sql`AND o.business_id = ${filter.businessId}::uuid`
    : Prisma.empty;
  const city = filter.city ? Prisma.sql`AND lower(z.city) = lower(${filter.city})` : Prisma.empty;
  const cat = filter.categoryId
    ? Prisma.sql`AND z.category_id = ${filter.categoryId}::uuid`
    : Prisma.empty;
  const rows = await db.$queryRaw<{ channel: string; offers: bigint }[]>(Prisma.sql`
    SELECT c::text AS channel, count(*) AS offers
    FROM offers o JOIN businesses z ON z.id = o.business_id, unnest(o.channels) AS c
    WHERE o.deleted_at IS NULL AND o.status = 'ACTIVE' AND o.start_date <= now() AND o.end_date >= now()
      ${biz} ${city} ${cat}
    GROUP BY 1`);
  const count = new Map(rows.map((r) => [r.channel, num(r.offers)]));
  return OFFER_CHANNELS.map((key) => ({
    key,
    label: OFFER_CHANNEL_LABEL[key],
    offers: count.get(key) ?? 0,
  }));
}
