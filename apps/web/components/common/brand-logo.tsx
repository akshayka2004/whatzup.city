'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * The Whtzup.city mark. The source PNG is 1024px (46 KB) but is shown at 20–36px,
 * so route it through the image optimiser at the size actually used (~5 KB).
 * If the optimiser is ever unavailable it falls back to the original file, so
 * the logo can never disappear. The mark is black on transparent, so dark mode inverts it.
 */
export function BrandLogo({
  alt = 'Whtzup.city',
  className,
}: {
  alt?: string;
  className?: string;
}) {
  const [raw, setRaw] = useState(false);
  if (raw) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logo.png" alt={alt} className={cn('dark:invert', className)} />;
  }
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={96}
      height={96}
      priority
      className={cn('dark:invert', className)}
      onError={() => setRaw(true)}
    />
  );
}
