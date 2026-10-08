'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  src?: string | null;
  alt: string;
  /** CSS aspect ratio of the box, e.g. "16 / 9" or "1". Reserves space so nothing shifts. */
  ratio?: string;
  /** Shown when there is no src or the image fails entirely. */
  fallback?: React.ReactNode;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
};

/**
 * A fixed-ratio image box built on next/image (AVIF/WebP, lazy by default, blur-in).
 *
 * Safety net: if the optimiser route ever errors (missing sharp, remote host not
 * allowed, upstream hiccup) it silently retries the original URL with a plain
 * <img>, and only then falls back to the placeholder. So adopting this component
 * can never make an image that used to load stop loading.
 */
export function ResponsiveImage({
  src,
  alt,
  ratio = '16 / 9',
  fallback,
  className,
  imgClassName,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority,
  quality,
}: Props) {
  const [stage, setStage] = useState<'optimised' | 'raw' | 'failed'>('optimised');
  const [loaded, setLoaded] = useState(false);

  const box = cn('relative overflow-hidden bg-muted', className);
  const style = { aspectRatio: ratio };

  if (!src || stage === 'failed') {
    return (
      <div className={cn(box, 'flex items-center justify-center text-muted-foreground')} style={style} role="img" aria-label={alt}>
        {fallback ?? null}
      </div>
    );
  }

  const fade = cn('object-cover transition-[opacity,transform] duration-500', loaded ? 'opacity-100' : 'opacity-0', imgClassName);

  return (
    <div className={box} style={style}>
      {!loaded && <div className="ui-skeleton absolute inset-0 rounded-none" aria-hidden />}
      {stage === 'optimised' ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={fade}
          onLoad={() => setLoaded(true)}
          quality={quality}
          onError={() => setStage('raw')}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn('absolute inset-0 h-full w-full', fade)}
          onLoad={() => setLoaded(true)}
          onError={() => setStage('failed')}
        />
      )}
    </div>
  );
}
