import {
  BILL_ORDER_CHANNEL_LABEL,
  BILL_PAYMENT_MODE_LABEL,
  deliveryPartnerLabel,
  type BillOrderChannel,
  type BillPaymentMode,
} from '@saas/types';

type BillLike = {
  orderChannel?: string | null;
  paymentMode?: string | null;
  deliveryPartner?: string | null;
  deliveryPartnerName?: string | null;
} | null;

/** "In-store · UPI", "Takeaway · Cash", "Delivery · Swiggy"; null for bills uploaded before this was asked. */
export function purchaseMethodLabel(bill?: BillLike): string | null {
  if (!bill?.orderChannel) return null;
  const channel =
    BILL_ORDER_CHANNEL_LABEL[bill.orderChannel as BillOrderChannel] ?? bill.orderChannel;
  const detail =
    bill.orderChannel === 'DELIVERY'
      ? deliveryPartnerLabel(bill.deliveryPartner, bill.deliveryPartnerName)
      : bill.paymentMode
        ? (BILL_PAYMENT_MODE_LABEL[bill.paymentMode as BillPaymentMode] ?? bill.paymentMode)
        : '';
  return detail ? `${channel} · ${detail}` : channel;
}
