'use client';

import { useEffect, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { BusinessQrCard } from '@/components/business/qr-card';
import { apiService } from '@/lib/services/api-service';
import { Loader2, QrCode } from 'lucide-react';

export default function QrCodePage() {
  const [biz, setBiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get<any>('/v1/businesses/owner/mine').then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      if (!res.error && list.length) setBiz(list[0]);
      setLoading(false);
    });
  }, []);

  return (
    <BusinessLayout>
      <div className="max-w-lg mx-auto">
        <div className="mb-6 print:hidden">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" /> Your QR code
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Print this and display it at your counter. Customers scan it, sign in, and land straight on your offers.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : !biz ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-muted-foreground">No business profile found yet.</p>
          </Card>
        ) : (
          <BusinessQrCard
            businessId={biz.id}
            businessName={biz.name}
            category={biz.category?.name}
            city={biz.city}
          />
        )}
      </div>
    </BusinessLayout>
  );
}
