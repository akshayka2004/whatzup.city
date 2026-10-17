'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  BILL_ORDER_CHANNELS,
  BILL_ORDER_CHANNEL_LABEL,
  BILL_PAYMENT_MODES,
  BILL_PAYMENT_MODE_LABEL,
  DELIVERY_PARTNERS,
  DELIVERY_PARTNER_LABEL,
} from '@saas/types';

export interface PurchaseMethod {
  orderChannel: string;
  paymentMode: string;
  deliveryPartner: string;
  deliveryPartnerName: string;
}

export const EMPTY_PURCHASE_METHOD: PurchaseMethod = {
  orderChannel: '',
  paymentMode: '',
  deliveryPartner: '',
  deliveryPartnerName: '',
};

/** Everything the API requires for this combination has been answered. */
export function isPurchaseMethodComplete(v: PurchaseMethod): boolean {
  if (!v.orderChannel) return false;
  if (v.orderChannel === 'DELIVERY') {
    if (!v.deliveryPartner) return false;
    return v.deliveryPartner !== 'OTHER' || v.deliveryPartnerName.trim().length > 0;
  }
  return !!v.paymentMode;
}

/** Only the fields that apply, so the API never sees a stale answer from another branch. */
export function purchaseMethodPayload(v: PurchaseMethod) {
  if (v.orderChannel === 'DELIVERY') {
    return {
      orderChannel: v.orderChannel,
      deliveryPartner: v.deliveryPartner,
      ...(v.deliveryPartner === 'OTHER'
        ? { deliveryPartnerName: v.deliveryPartnerName.trim() }
        : {}),
    };
  }
  return { orderChannel: v.orderChannel, paymentMode: v.paymentMode };
}

const label = 'mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground';

function Chips<T extends string>({
  name,
  options,
  labels,
  value,
  onChange,
}: {
  name: string;
  options: readonly T[];
  labels: Record<string, string>;
  value: string;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o)}
            className={cn(
              'ui-press inline-flex h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors',
              on
                ? 'border-primary/40 bg-brand-soft text-brand-soft-foreground'
                : 'border-border bg-card text-foreground hover:bg-secondary',
            )}
          >
            {labels[o]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * "How did you buy?" then either "How did you pay?" or "Which delivery app?". Shared by every
 * bill upload form so the analytics always get the same answers.
 */
export function PurchaseMethodField({
  value,
  onChange,
}: {
  value: PurchaseMethod;
  onChange: (next: PurchaseMethod) => void;
}) {
  const set = (patch: Partial<PurchaseMethod>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      <div>
        <span className={label}>
          How did you buy? <span className="text-destructive">*</span>
        </span>
        <Chips
          name="How did you buy"
          options={BILL_ORDER_CHANNELS}
          labels={BILL_ORDER_CHANNEL_LABEL}
          value={value.orderChannel}
          onChange={(orderChannel) => set({ orderChannel })}
        />
      </div>

      {value.orderChannel === 'DELIVERY' && (
        <div>
          <span className={label}>
            Which delivery app? <span className="text-destructive">*</span>
          </span>
          <Chips
            name="Delivery app"
            options={DELIVERY_PARTNERS}
            labels={DELIVERY_PARTNER_LABEL}
            value={value.deliveryPartner}
            onChange={(deliveryPartner) => set({ deliveryPartner })}
          />
          {value.deliveryPartner === 'OTHER' && (
            <Input
              aria-label="Delivery app name"
              placeholder="Name of the delivery app"
              maxLength={60}
              value={value.deliveryPartnerName}
              onChange={(e) => set({ deliveryPartnerName: e.target.value })}
              className="mt-2 h-11 rounded-xl"
            />
          )}
        </div>
      )}

      {(value.orderChannel === 'IN_STORE' || value.orderChannel === 'TAKEAWAY') && (
        <div>
          <span className={label}>
            How did you pay? <span className="text-destructive">*</span>
          </span>
          <Chips
            name="How did you pay"
            options={BILL_PAYMENT_MODES}
            labels={BILL_PAYMENT_MODE_LABEL}
            value={value.paymentMode}
            onChange={(paymentMode) => set({ paymentMode })}
          />
        </div>
      )}
    </div>
  );
}
