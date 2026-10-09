'use client';

import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { AlertCircle } from 'lucide-react';
import { Modal } from '@/components/system/modal';

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
    if (!open) return;
    let scanner: QrScanner | null = null;
    let cancelled = false;
    // The dialog portal mounts in the same commit; wait a frame so the <video> is attached.
    const raf = requestAnimationFrame(() => {
      if (cancelled || !videoRef.current) return;
      setError('');
      scanner = new QrScanner(
        videoRef.current,
        (result) => {
          scanner?.stop();
          onScanRef.current(result.data);
        },
        { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: 'environment' },
      );
      scanner
        .start()
        .catch(() =>
          setError('Camera access denied. Enable it in your browser settings and retry.'),
        );
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      scanner?.stop();
      scanner?.destroy();
    };
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Scan business QR"
      description="Point your camera at a business’s QR code."
      size="sm"
    >
      {error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center" role="alert">
          <AlertCircle className="size-8 text-destructive" aria-hidden />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="aspect-square w-full rounded-control border border-border object-cover"
          muted
          playsInline
        />
      )}
    </Modal>
  );
}
