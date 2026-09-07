'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { onboardingService } from '@/lib/services/onboarding-service';
import { formatINR, planLabel } from '@/lib/subscription-plans';
import { ArrowLeft, Download, Loader2, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';

type Invoice = {
  id: string;
  amount: string | number;
  amountBase: string | number;
  amountTax: string | number;
  taxPercent: string | number;
  method: string;
  status: string;
  transactionRef?: string | null;
  rejectionReason?: string | null;
  packageName?: string | null;
  cycle: string;
  createdAt: string;
  verifiedAt?: string | null;
  business: { name?: string; city?: string | null };
  billingProfile: {
    billingName: string;
    hasGst: boolean;
    gstin?: string | null;
    pan?: string | null;
    addressLine: string;
    city?: string | null;
    state?: string | null;
    pincode: string;
    invoiceEmail: string;
  } | null;
};

function fmtDate(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    onboardingService.getPaymentInvoice(id).then((res) => {
      if (res.error || !res.data) {
        setError(res.error || 'Invoice not found.');
      } else {
        setInvoice(res.data);
      }
      setLoading(false);
    });
  }, [id]);

  const statusMeta =
    invoice?.status === 'SUCCESS'
      ? { label: 'Paid & Verified', tone: 'bg-success/15 text-success', icon: CheckCircle2 }
      : invoice?.status === 'FAILED'
        ? { label: 'Rejected', tone: 'bg-destructive/15 text-destructive', icon: XCircle }
        : { label: 'Pending Verification', tone: 'bg-warning/15 text-warning', icon: Clock };
  const StatusIcon = statusMeta.icon;

  return (
    <BusinessLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {invoice && (
            <Button onClick={() => window.print()} size="sm" className="rounded-xl gap-1.5 cursor-pointer">
              <Download className="h-4 w-4" /> Download / Print
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : error || !invoice ? (
          <Card className="p-10 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground opacity-40 mb-3" />
            <p className="text-sm text-muted-foreground break-words">{error || 'Invoice not found.'}</p>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8 print:shadow-none print:border-0 print:p-0">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-6 ${statusMeta.tone}`}>
              <StatusIcon className="h-3.5 w-3.5" /> {statusMeta.label}
            </div>

            {/* Issuer vs invoice meta */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-border">
              <div>
                <h1 className="text-lg font-extrabold text-foreground break-words">Lifeart Business Services Pvt. Ltd.</h1>
                <p className="text-xs text-muted-foreground mt-1 break-words">29/3372, Vazhuthacaud, AIR Road</p>
                <p className="text-xs text-muted-foreground break-words">Thiruvananthapuram, Kerala 695014, India</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">support@lifeartgroup.in</p>
              </div>
              <div className="text-left sm:text-right">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">INVOICE</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  No: <span className="font-semibold text-foreground">INV-{invoice.id.slice(0, 8).toUpperCase()}</span>
                </p>
                <p className="text-xs text-muted-foreground">Date: {fmtDate(invoice.createdAt)}</p>
              </div>
            </div>

            {/* Bill to */}
            <div className="py-6 border-b border-border">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Billed to</p>
              {invoice.billingProfile ? (
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold text-foreground break-words">{invoice.billingProfile.billingName}</p>
                  <p className="text-muted-foreground break-words">
                    {invoice.billingProfile.addressLine}
                    {invoice.billingProfile.city ? `, ${invoice.billingProfile.city}` : ''}
                    {invoice.billingProfile.state ? `, ${invoice.billingProfile.state}` : ''} — {invoice.billingProfile.pincode}
                  </p>
                  <p className="text-muted-foreground break-words">
                    GSTIN: {invoice.billingProfile.hasGst ? invoice.billingProfile.gstin : 'Not registered'}
                  </p>
                  <p className="text-muted-foreground break-words">PAN: {invoice.billingProfile.pan || '—'}</p>
                  <p className="text-muted-foreground break-words">Email: {invoice.billingProfile.invoiceEmail}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground break-words">{invoice.business?.name}</p>
              )}
            </div>

            {/* Line items */}
            <div className="py-6 border-b border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="py-2.5 text-foreground break-words">
                      {planLabel(invoice.packageName)} — {invoice.cycle === 'RENEWAL' ? 'Renewal' : 'New subscription'}
                    </td>
                    <td className="py-2.5 text-right text-foreground whitespace-nowrap">
                      {formatINR(Number(invoice.amountBase))}
                    </td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="py-2.5 text-muted-foreground">GST ({Number(invoice.taxPercent)}%)</td>
                    <td className="py-2.5 text-right text-muted-foreground whitespace-nowrap">
                      {formatINR(Number(invoice.amountTax))}
                    </td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="py-2.5 font-bold text-foreground">Total</td>
                    <td className="py-2.5 text-right font-extrabold text-foreground text-base whitespace-nowrap">
                      {formatINR(Number(invoice.amount))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment details */}
            <div className="py-6 border-b border-border grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-muted-foreground">Payment method</div>
              <div className="text-foreground text-right">{invoice.method}</div>
              <div className="text-muted-foreground">Transaction ref</div>
              <div className="text-foreground text-right break-all">{invoice.transactionRef || '—'}</div>
            </div>

            {/* Status footnote */}
            <div className="pt-6">
              {invoice.status === 'SUCCESS' && (
                <p className="text-xs text-success">Payment verified on {fmtDate(invoice.verifiedAt)}.</p>
              )}
              {invoice.status === 'FAILED' && (
                <p className="text-xs text-destructive break-words">
                  Payment rejected{invoice.rejectionReason ? `: ${invoice.rejectionReason}` : '.'} Please resubmit payment from
                  Subscriptions.
                </p>
              )}
              {invoice.status !== 'SUCCESS' && invoice.status !== 'FAILED' && (
                <p className="text-xs text-muted-foreground">
                  This is a provisional invoice. It will be confirmed once our team verifies your payment, usually within 24
                  hours.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </BusinessLayout>
  );
}
