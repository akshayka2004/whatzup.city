'use client';

import Link from 'next/link';
import {
  forwardRef,
  useState,
  type ComponentType,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Building2, Eye, EyeOff, ShieldCheck, Store } from 'lucide-react';
import { BrandLogo } from '@/components/common/brand-logo';
import { cn } from '@/lib/utils';

const POINTS = [
  {
    icon: ShieldCheck,
    title: 'Verified & trusted',
    desc: 'Every business is checked before it goes live.',
  },
  { icon: Store, title: 'Local offers', desc: 'Claim deals from businesses around you.' },
  {
    icon: Building2,
    title: 'Civic updates',
    desc: 'Announcements and public services in one place.',
  },
];

/**
 * Light/dark split layout for sign-in, password reset and other auth screens.
 * Brand panel (photo + promise) on large screens, the form card everywhere.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
  icon: Icon,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <main id="main-content" className="min-h-dvh w-full bg-background p-3 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl overflow-hidden rounded-sheet border border-border/70 bg-card shadow-e2 sm:min-h-[calc(100dvh-3rem)] lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/login-hero.png)' }}
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in oklch, var(--card) 96%, transparent) 0%, color-mix(in oklch, var(--card) 80%, transparent) 45%, color-mix(in oklch, var(--card) 35%, transparent) 100%)',
            }}
            aria-hidden
          />
          <div className="relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 shadow-e1 backdrop-blur"
            >
              <BrandLogo alt="Whtzup.city" className="h-6 w-auto object-contain" />
              <span className="text-sm font-semibold tracking-tight">whtzup.city</span>
            </Link>
            <h1 className="mt-10 max-w-md text-display text-foreground">
              Your city, <span className="text-primary">connected.</span>
            </h1>
            <p className="mt-3 max-w-sm text-body text-muted-foreground">
              Verified businesses, local offers and civic updates across Kerala — from one trusted
              account.
            </p>
          </div>
          <ul className="relative space-y-2">
            {POINTS.map((p) => (
              <li
                key={p.title}
                className="flex items-start gap-3 rounded-2xl bg-card/80 p-3 shadow-e1 backdrop-blur"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
                  <p.icon className="size-[18px]" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{p.title}</span>
                  <span className="block text-caption text-muted-foreground">{p.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
              <BrandLogo alt="Whtzup.city" className="h-7 w-auto object-contain" />
              <span className="font-semibold tracking-tight">whtzup.city</span>
            </Link>
            {Icon && (
              <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
                <Icon className="size-6" />
              </span>
            )}
            <h2 className="text-title">{title}</h2>
            {description && <p className="mt-1.5 text-body text-muted-foreground">{description}</p>}
            <div className="mt-7">{children}</div>
            {footer && (
              <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  error?: string;
  hint?: ReactNode;
};

/** Labelled input with leading icon, error text wired via aria-describedby, and a show/hide toggle for passwords. */
export const AuthField = forwardRef<HTMLInputElement, FieldProps>(function AuthField(
  { label, icon: Icon, error, hint, id, type = 'text', className, ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-label text-foreground">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
        <input
          ref={ref}
          id={fieldId}
          type={isPassword && show ? 'text' : type}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-12 w-full rounded-control border bg-background text-[15px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
            Icon ? 'pl-10' : 'pl-3.5',
            isPassword ? 'pr-11' : 'pr-3.5',
            error ? 'border-destructive' : 'border-input',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="text-caption text-danger-soft-foreground">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-caption text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function FormAlert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-5 rounded-xl px-3.5 py-3 text-sm',
        tone === 'error'
          ? 'bg-danger-soft text-danger-soft-foreground'
          : 'bg-success-soft text-success-soft-foreground',
      )}
    >
      {children}
    </div>
  );
}
