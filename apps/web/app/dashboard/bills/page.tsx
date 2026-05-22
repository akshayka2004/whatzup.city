'use client';

import { useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

const initialBills = [
  {
    id: 1,
    invoice: 'INV-2026-9042',
    billNumber: 'BN-41029',
    amount: 154.5,
    date: 'May 18, 2026',
    status: 'APPROVED',
  },
  {
    id: 2,
    invoice: 'INV-2026-9118',
    billNumber: 'BN-41135',
    amount: 89.0,
    date: 'May 19, 2026',
    status: 'PROCESSING',
  },
  {
    id: 3,
    invoice: 'INV-2026-8840',
    billNumber: 'BN-40812',
    amount: 450.0,
    date: 'May 15, 2026',
    status: 'REJECTED',
  },
];

export default function BillsPage() {
  const [bills, setBills] = useState(initialBills);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [invoice, setInvoice] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [amount, setAmount] = useState('');

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !amount) return;
    const newBill = {
      id: Date.now(),
      invoice,
      billNumber: billNumber || `BN-${Math.floor(10000 + Math.random() * 90000)}`,
      amount: parseFloat(amount),
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: 'PROCESSING',
    };
    setBills([newBill, ...bills]);
    setIsUploadOpen(false);
    setInvoice('');
    setBillNumber('');
    setAmount('');
  };

  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Customer Purchases & Bills</h1>
            <p className="text-muted-foreground">
              Upload and audit receipts to verify customer purchases and reviews
            </p>
          </div>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload Bill Receipt
          </Button>
        </div>

        <div className="space-y-4">
          {bills.map((bill) => (
            <Card
              key={bill.id}
              className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl h-11 w-11 flex items-center justify-center ${
                      bill.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : bill.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">{bill.invoice}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bill #: <span className="text-slate-300 font-mono">{bill.billNumber}</span> •
                      Uploaded: {bill.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm border-t sm:border-t-0 pt-4 sm:pt-0 border-white/5">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-bold text-foreground text-base mt-0.5">
                      ${bill.amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bill.status === 'APPROVED' ? (
                      <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                      </span>
                    ) : bill.status === 'REJECTED' ? (
                      <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                        <AlertCircle className="h-3.5 w-3.5" /> Rejected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                        <AlertCircle className="h-3.5 w-3.5" /> Processing
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── UPLOAD BILL MODAL ──────────────────────────── */}
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setIsUploadOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Upload Bill Receipt</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Invoice Reference
                  </label>
                  <Input
                    placeholder="e.g. INV-2026-XXXX"
                    value={invoice}
                    onChange={(e) => setInvoice(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Bill Number
                  </label>
                  <Input
                    placeholder="e.g. BN-41029 (auto-extracted via OCR if blank)"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Leave blank to auto-extract from uploaded image via OCR
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Amount ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 154.50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Receipt Image
                  </label>
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Click to upload receipt image</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadOpen(false)}
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
                  >
                    Submit Bill
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
