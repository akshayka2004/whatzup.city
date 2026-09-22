'use client';

import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { X, Camera, AlertCircle } from 'lucide-react';

interface QrScanModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function QrScanModal({ open, onClose, onScan }: QrScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !videoRef.current) return;
    setError('');
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        scanner.stop();
        onScanRef.current(result.data);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: 'environment' },
    );
    scanner.start().catch(() => setError('Camera access denied. Enable it in your browser settings and retry.'));
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">Scan business QR</h3>
        </div>
        {error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <video ref={videoRef} className="w-full rounded-xl border border-border aspect-square object-cover" muted playsInline />
        )}
        <p className="mt-3 text-xs text-muted-foreground text-center">Point your camera at a business&apos;s QR code.</p>
      </div>
    </div>
  );
}
