'use client';

import { ModalSurface } from '@/components/system/modal-surface';
import { useState, useEffect, useRef } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PurchaseMethodField,
  EMPTY_PURCHASE_METHOD,
  isPurchaseMethodComplete,
  purchaseMethodPayload,
  type PurchaseMethod,
} from '@/components/bills/purchase-method-field';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  AlertTriangle,
  User,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { ListFilters, countBy, matchesSearch } from '@/components/system/list-filters';
import { purchaseMethodLabel } from '@/lib/purchase-method';

function mapVerification(v: any) {
  const bill = v.bill || {};
  return {
    id: v.id,
    billId: v.billId || bill.id || v.id,
    invoiceRef:
      bill.id?.substring(0, 8).toUpperCase() || v.id?.substring(0, 8).toUpperCase() || '—',
    billNumber: bill.billNumber || v.billNumber || '—',
    amount: parseFloat(bill.amount ?? v.amount ?? '0'),
    customerName: bill.user?.name || v.user?.name || 'Customer',
    status: (v.status || bill.status || 'PENDING') as string,
    createdAt: v.createdAt || bill.createdAt || '',
    channel: (bill.orderChannel as string | null) || '',
    method: purchaseMethodLabel(bill),
  };
}

export default function BillsPage() {
  const { user } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // List filters
  const [fq, setFq] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fChannel, setFChannel] = useState('');
  const [fSort, setFSort] = useState('newest');
  const resetFilters = () => {
    setFq('');
    setFStatus('');
    setFChannel('');
    setFSort('newest');
  };

  const businessId = user?.businessId || user?.entity?.id;

  const fetchBills = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await apiService.get<any>(
        `/v1/businesses/${businessId}/bill-verifications?status=ALL`,
      );
      if (res.data && !res.error) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data?.items ?? []);
        setBills(list.map(mapVerification));
      }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // ── Upload state ───────────────────────────────────────────
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [method, setMethod] = useState<PurchaseMethod>(EMPTY_PURCHASE_METHOD);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setAmount('');
    setBillDate(new Date().toISOString().slice(0, 10));
    setDescription('');
    setMethod(EMPTY_PURCHASE_METHOD);
    setSelectedFile(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !amount || !billDate || !businessId) return;
    setUploading(true);
    setUploadError('');

    try {
      // Step 1: Get signed upload URL for bill-uploads bucket
      const urlRes = await apiService.post<{ uploadUrl: string; fileKey: string; bucket: string }>(
        '/v1/storage/upload-url',
        {
          category: 'bill',
          filename: selectedFile.name,
          mimeType: selectedFile.type,
          entityId: businessId,
        },
      );

      if (urlRes.error || !urlRes.data?.uploadUrl) {
        throw new Error(urlRes.error || 'Failed to get upload URL');
      }

      const { uploadUrl, fileKey } = urlRes.data;

      // Step 2: PUT file to Supabase signed URL
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile,
      });

      if (!putRes.ok) {
        throw new Error(`Storage upload failed: ${putRes.status} ${putRes.statusText}`);
      }

      // Step 3: Create bill record (automatically creates a BillVerification too)
      const createRes = await apiService.post<any>('/v1/bills/upload', {
        businessId,
        amount: parseFloat(amount),
        billDate,
        billImage: fileKey,
        ...purchaseMethodPayload(method),
        description: description || undefined,
      });

      if (createRes.error) {
        throw new Error(
          createRes.error || "Couldn't record this bill. Check the details and try again.",
        );
      }

      setIsUploadOpen(false);
      resetForm();
      // Refresh list
      await fetchBills();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const statusCounts = countBy(bills, (b) => b.status);
  const channelCounts = countBy(bills, (b) => b.channel);
  const visibleBills = bills
    .filter(
      (b) =>
        (!fStatus || b.status === fStatus) &&
        (!fChannel || b.channel === fChannel) &&
        matchesSearch([b.billNumber, b.invoiceRef, b.customerName, b.method], fq),
    )
    .sort((a, b) =>
      fSort === 'amount'
        ? (b.amount || 0) - (a.amount || 0)
        : fSort === 'oldest'
          ? String(a.createdAt).localeCompare(String(b.createdAt))
          : String(b.createdAt).localeCompare(String(a.createdAt)),
    );
  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    RE_UPLOAD_REQUESTED: 'Re-upload',
    FLAGGED: 'Flagged',
    ESCALATED: 'Escalated',
  };

  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Customer Purchases & Bills</h1>
            <p className="text-muted-foreground">
              View and audit customer receipts — use Bill Moderation to approve or reject
            </p>
          </div>
          <Button
            onClick={() => {
              setIsUploadOpen(true);
              setUploadError('');
            }}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Submit Bill Receipt
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bills.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No bills yet</p>
            <p className="text-sm text-muted-foreground">
              Customer receipts submitted to this business will appear here.
            </p>
          </Card>
        ) : (
          <>
            <ListFilters
              noun="bills"
              shown={visibleBills.length}
              total={bills.length}
              onReset={resetFilters}
              search={{ value: fq, onChange: setFq, placeholder: 'Search bill number, customer…' }}
              sort={{
                value: fSort,
                onChange: setFSort,
                options: [
                  { value: 'newest', label: 'Newest first' },
                  { value: 'oldest', label: 'Oldest first' },
                  { value: 'amount', label: 'Highest amount' },
                ],
              }}
              groups={[
                {
                  key: 'status',
                  label: 'Status',
                  value: fStatus,
                  onChange: setFStatus,
                  options: Object.keys(statusCounts)
                    .sort()
                    .map((st) => ({
                      value: st,
                      label: STATUS_LABEL[st] ?? st,
                      count: statusCounts[st],
                    })),
                },
                {
                  key: 'channel',
                  label: 'Bought via',
                  value: fChannel,
                  onChange: setFChannel,
                  options: [
                    { value: 'IN_STORE', label: 'In-store', count: channelCounts.IN_STORE ?? 0 },
                    { value: 'TAKEAWAY', label: 'Takeaway', count: channelCounts.TAKEAWAY ?? 0 },
                    {
                      value: 'DELIVERY',
                      label: 'Delivery app',
                      count: channelCounts.DELIVERY ?? 0,
                    },
                  ],
                },
              ]}
            />
            {visibleBills.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                No bills match these filters.
              </Card>
            ) : (
              <div className="space-y-4">
                {visibleBills.map((bill, i) => {
                  const uploadedDate = bill.createdAt
                    ? new Date(bill.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';
                  return (
                    <Card
                      key={bill.id}
                      className="ui-fade-up p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
                      style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-3 rounded-xl h-11 w-11 flex items-center justify-center ${
                              bill.status === 'APPROVED'
                                ? 'bg-success-soft text-success-soft-foreground'
                                : bill.status === 'REJECTED'
                                  ? 'bg-danger-soft text-danger-soft-foreground'
                                  : 'bg-warning-soft text-warning-soft-foreground'
                            }`}
                          >
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-base break-all">
                              Bill #
                              {bill.billNumber && bill.billNumber !== '—'
                                ? bill.billNumber
                                : bill.invoiceRef}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <User className="h-3 w-3" />
                              {bill.customerName}
                              <span className="text-muted-foreground/50">·</span>
                              {uploadedDate}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm border-t sm:border-t-0 pt-4 sm:pt-0 border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="font-bold text-foreground text-base mt-0.5">
                              ₹{isNaN(bill.amount) ? '—' : bill.amount.toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {bill.status === 'APPROVED' ? (
                              <span className="flex items-center gap-1 bg-success-soft text-success-soft-foreground border border-success/20 px-3 py-1 rounded-full text-xs font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                              </span>
                            ) : bill.status === 'REJECTED' ? (
                              <span className="flex items-center gap-1 bg-danger-soft text-danger-soft-foreground border border-destructive/20 px-3 py-1 rounded-full text-xs font-semibold">
                                <AlertCircle className="h-3.5 w-3.5" /> Rejected
                              </span>
                            ) : bill.status === 'RE_UPLOAD_REQUESTED' ? (
                              <span className="flex items-center gap-1 bg-info-soft text-info-soft-foreground border border-info/20 px-3 py-1 rounded-full text-xs font-semibold">
                                <AlertCircle className="h-3.5 w-3.5" /> Re-Upload
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 bg-warning-soft text-warning-soft-foreground border border-warning/20 px-3 py-1 rounded-full text-xs font-semibold">
                                <AlertCircle className="h-3.5 w-3.5" /> Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── UPLOAD BILL MODAL ──────────────────────────── */}
        {isUploadOpen && (
          <ModalSurface
            onClose={() => {
              setIsUploadOpen(false);
              resetForm();
            }}
            label="Submit Bill Receipt"
            className="sm:max-w-md"
            hideClose
          >
            <button
              onClick={() => {
                setIsUploadOpen(false);
                resetForm();
              }}
              className="absolute top-4 right-4 p-2 -m-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-foreground mb-4">Submit Bill Receipt</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Bill Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  required
                  className="rounded-xl border-border bg-secondary focus:border-primary text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Amount (₹) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 1250.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="rounded-xl border-border bg-secondary focus:border-primary text-foreground"
                />
              </div>
              <PurchaseMethodField value={method} onChange={setMethod} />
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Description <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <Input
                  placeholder="e.g. Grocery purchase"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl border-border bg-secondary focus:border-primary text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Receipt Image <span className="text-destructive">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-success-soft-foreground">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium truncate max-w-xs">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Click to upload receipt image</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG, WebP, PDF — max 10MB
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] || null);
                    setUploadError('');
                  }}
                />
              </div>

              {uploadError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-danger-soft border border-destructive/20 text-danger-soft-foreground text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {uploadError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsUploadOpen(false);
                    resetForm();
                  }}
                  className="rounded-xl border-border hover:bg-secondary text-foreground cursor-pointer"
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer gap-2"
                  disabled={
                    !selectedFile ||
                    !amount ||
                    !billDate ||
                    !isPurchaseMethodComplete(method) ||
                    uploading
                  }
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {uploading ? 'Submitting…' : 'Submit Bill'}
                </Button>
              </div>
            </form>
          </ModalSurface>
        )}
      </div>
    </BusinessLayout>
  );
}
