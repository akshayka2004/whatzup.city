'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Download, Printer, Loader2 } from 'lucide-react';
import { businessQrTarget } from '@/lib/qr';

interface BusinessQrCardProps {
  businessId: string;
  businessName: string;
  category?: string;
  city?: string;
}

export function BusinessQrCard({ businessId, businessName, category, city }: BusinessQrCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const targetUrl = businessQrTarget(businessId);

  useEffect(() => {
    if (!canvasRef.current) return;
    setQrReady(false);
    QRCode.toCanvas(canvasRef.current, targetUrl, {
      width: 260,
      margin: 1,
      color: { dark: '#1F1B16', light: '#FFFFFF' },
    })
      .then(() => setQrReady(true))
      .catch(() => setQrReady(false));
  }, [targetUrl]);

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      // Snapshots the whole styled card (branding, name, QR, footer) — not just the raw QR pattern.
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: '#FBF8F2' });
      const link = document.createElement('a');
      const safeName = businessName.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'business';
      link.download = `${safeName}-qr.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('QR card export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 print:hidden">
        <Button onClick={() => window.print()} size="sm" variant="outline" className="rounded-xl gap-1.5 cursor-pointer">
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button onClick={handleDownload} disabled={!qrReady || downloading} size="sm" className="rounded-xl gap-1.5 cursor-pointer">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PNG
        </Button>
      </div>

      <div
        ref={cardRef}
        className="mx-auto"
        style={{
          width: 380,
          maxWidth: '100%',
          background: '#FBF8F2',
          color: '#1F1B16',
          borderRadius: 18,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          border: '1px solid rgba(31,27,22,0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#C1633B' }}>whtzup.city</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#8A8073', textTransform: 'uppercase' }}>
            Official business QR
          </span>
        </div>
        <div style={{ height: 1, background: 'rgba(31,27,22,0.12)' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.25, wordBreak: 'break-word' }}>{businessName}</div>
          {(category || city) && (
            <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#8A8073', marginTop: 4 }}>
              {[category, city].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 12,
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid rgba(31,27,22,0.1)',
          }}
        >
          <canvas ref={canvasRef} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 12 }}>
            Scan <span style={{ color: '#C1633B' }}>&rarr;</span> sign in <span style={{ color: '#C1633B' }}>&rarr;</span> see today&apos;s offers
          </div>
          <div style={{ fontSize: 9, color: '#8A8073', marginTop: 4, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {targetUrl.replace(/^https?:\/\//, '')}
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(31,27,22,0.12)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 1.5, color: '#C1633B' }}>WHTZUP.CITY</div>
          <div style={{ fontSize: 9, color: '#8A8073', marginTop: 2 }}>Discover local businesses, offers &amp; events near you</div>
        </div>
      </div>
    </div>
  );
}
