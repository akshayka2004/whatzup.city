'use client';

import { useState } from 'react';
import { CalendarDays, Check, Hash, IndianRupee, Loader2, Receipt, Star, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/services/api-service';
import { optimizeImage } from '@/lib/utils/image-optimizer';
import { ModalShell } from './profile-ui';

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const fieldLabel = 'mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground';
const fieldInput = 'h-11 rounded-xl border-input bg-background text-base text-foreground focus-visible:ring-primary md:text-sm';

/**
 * Verified-purchase flow: bill upload + star rating + review in one form.
 * Loaded on demand (next/dynamic) — it pulls in the image optimiser and is
 * only needed by people who actually tap "Upload Receipt".
 */
export default function BillDialog({
  biz,
  businessId,
  onClose,
  onSubmitted,
  onReviewPosted,
}: {
  biz: any;
  businessId: string;
  onClose: () => void;
  /** Bill went through — parent flips its "submitted" card. */
  onSubmitted: () => void;
  /** The rating/review was saved — parent refreshes the rating and the review list. */
  onReviewPosted: () => void | Promise<unknown>;
}) {
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billReview, setBillReview] = useState('');
  const [billRating, setBillRating] = useState(0);
  const [billRatingHover, setBillRatingHover] = useState(0);
  const [billImageName, setBillImageName] = useState('');
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billSubmitting, setBillSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber || !billDate || !billAmount || billRating === 0) return;
    if (!billFile) {
      setError('Please attach a photo or PDF of your receipt.');
      return;
    }
    setError('');
    setBillSubmitting(true);
    try {
      // 1. Optimize image client-side if it's an image
      let fileToUpload = billFile;
      try {
        fileToUpload = await optimizeImage(billFile, { quality: 0.8, outputType: 'jpeg' });
      } catch (err) {
        console.error('Image optimization failed:', err);
      }

      // 2. Request signed upload URL
      const signedRes = await apiService.post<{ uploadUrl: string; fileKey: string }>('/v1/storage/upload-url', {
        entityId: businessId,
        filename: fileToUpload.name,
        mimeType: fileToUpload.type,
        category: 'bill',
      });

      if (!signedRes.data || signedRes.error) {
        throw new Error(signedRes.error || 'Failed to get upload URL');
      }

      const { uploadUrl, fileKey } = signedRes.data;

      // 3. Direct upload to Supabase storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileToUpload.type },
        body: fileToUpload,
      });

      if (!uploadResponse.ok) {
        const detail = await uploadResponse.text().catch(() => '');
        throw new Error(
          `Failed to upload file to storage (${uploadResponse.status}). ${detail.slice(0, 180) || uploadResponse.statusText}`,
        );
      }

      // 4. Send JSON-serialized reference to backend
      const billImageRef = JSON.stringify({ bucket: 'bill-uploads', path: fileKey });

      await apiService.post('/v1/bills/upload', {
        businessId,
        amount: parseFloat(billAmount),
        billDate,
        billNumber: billNumber.trim().slice(0, 60),
        billImage: billImageRef,
        description: billReview || undefined,
      });

      // Post the star rating as a review so it reflects on the business.
      if (billRating > 0) {
        const reviewRes = await apiService.post('/v1/reviews', {
          businessId,
          rating: billRating,
          comment: billReview?.trim() || 'Rated via bill submission.',
        });
        if (!reviewRes.error) {
          // Refresh rating + review list so the new rating reflects immediately
          try {
            await onReviewPosted();
          } catch {
            /* non-fatal — values refresh on next page load */
          }
        }
      }

      onSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Bill submission failed:', err);
      setError(err?.message || 'Bill submission failed. Please try again.');
    } finally {
      setBillSubmitting(false);
    }
  };

  return (
    <ModalShell label="Submit your bill" onClose={onClose} className="sm:max-w-lg">
      <div className="mb-5 flex items-center gap-3 pr-10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Receipt className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Submit Your Bill</h3>
          <p className="truncate text-xs text-muted-foreground">{biz.name}</p>
        </div>
      </div>

      <form onSubmit={handleBillSubmit} className="space-y-4">
        <div>
          <label htmlFor="bill-number" className={fieldLabel}>
            <Hash className="h-3.5 w-3.5" />
            Bill / Invoice Number <span className="text-destructive">*</span>
          </label>
          <Input
            id="bill-number"
            placeholder="e.g. INV-2026-1042"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            required
            className={fieldInput}
          />
        </div>

        <div>
          <label htmlFor="bill-date" className={fieldLabel}>
            <CalendarDays className="h-3.5 w-3.5" />
            Bill Date <span className="text-destructive">*</span>
          </label>
          <Input
            id="bill-date"
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            required
            max={new Date().toISOString().split('T')[0]}
            className={fieldInput}
          />
        </div>

        <div>
          <label htmlFor="bill-amount" className={fieldLabel}>
            <IndianRupee className="h-3.5 w-3.5" />
            Amount Paid <span className="text-destructive">*</span>
          </label>
          <Input
            id="bill-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="1"
            placeholder="e.g. 2450.00"
            value={billAmount}
            onChange={(e) => setBillAmount(e.target.value)}
            required
            className={fieldInput}
          />
        </div>

        <div>
          <span className={fieldLabel}>
            Receipt Image <span className="text-destructive">*</span>
          </span>
          <label
            htmlFor="bill-image-input"
            className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-5 text-center transition-colors hover:border-primary/50"
          >
            {billImageName ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" />
                <span className="max-w-[220px] truncate">{billImageName}</span>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Tap to upload receipt image (JPG, PNG, PDF)</p>
              </>
            )}
            <input
              id="bill-image-input"
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setBillFile(f);
                  setBillImageName(f.name);
                  setError('');
                }
              }}
            />
          </label>
        </div>

        <div>
          <span className={fieldLabel}>
            Your Rating <span className="text-destructive">*</span>
          </span>
          <div className="flex items-center" onMouseLeave={() => setBillRatingHover(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setBillRating(star)}
                onMouseEnter={() => setBillRatingHover(star)}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                aria-pressed={billRating === star}
                className="ui-press flex h-11 w-11 cursor-pointer items-center justify-center transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'h-7 w-7 transition-colors',
                    (billRatingHover || billRating) >= star ? 'fill-warning text-warning' : 'text-muted-foreground/30',
                  )}
                />
              </button>
            ))}
            {billRating > 0 && (
              <span className="ml-2 self-center text-sm text-muted-foreground">{RATING_WORDS[billRating]}</span>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="bill-review" className={fieldLabel}>
            Your Review <span className="text-xs font-normal">(optional)</span>
          </label>
          <Textarea
            id="bill-review"
            placeholder={`Share your experience at ${biz.name}...`}
            value={billReview}
            onChange={(e) => setBillReview(e.target.value)}
            rows={3}
            className="resize-none rounded-xl border-input bg-background text-base text-foreground focus-visible:ring-primary md:text-sm"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="lg" onClick={onClose} className="flex-1 rounded-xl sm:flex-none sm:px-6">
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={!billNumber || !billDate || !billAmount || billRating === 0 || billSubmitting}
            className="flex-1 gap-1.5 rounded-xl font-semibold disabled:opacity-50 sm:flex-none sm:px-6"
          >
            {billSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Submit Bill
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
