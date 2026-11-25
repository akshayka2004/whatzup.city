'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

/** A QR code for a short text such as a reward code, so staff can scan it instead of typing. */
export function CodeQr({
  value,
  size = 160,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    // QR codes must stay dark on light to scan, whatever the theme.
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => undefined);
  }, [value, size]);
  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      role="img"
      aria-label={`QR code for ${value}`}
      className={cn('rounded-control bg-white p-1', className)}
    />
  );
}
