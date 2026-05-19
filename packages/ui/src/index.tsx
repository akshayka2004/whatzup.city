import * as React from 'react';

// Reusable cn helper for class merging
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Glass Card Component (Shared Premium UI Token) ──────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glowColor, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05]',
          className,
        )}
        style={{
          boxShadow: glowColor ? `0 0 40px -10px ${glowColor}` : undefined,
        }}
        {...props}
      />
    );
  },
);
Card.displayName = 'Card';

// ── Shimmer Button Component ───────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'glass';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95 cursor-pointer px-5 py-2.5 text-sm',
          variant === 'primary' &&
            'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_20px_-4px_rgba(59,130,246,0.5)] hover:brightness-110',
          variant === 'secondary' && 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700',
          variant === 'outline' &&
            'border border-neutral-700 text-neutral-200 hover:bg-neutral-800',
          variant === 'glass' &&
            'border border-white/10 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10',
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
